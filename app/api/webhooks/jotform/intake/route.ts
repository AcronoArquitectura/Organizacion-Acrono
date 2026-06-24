/**
 * POST /api/webhooks/jotform/intake?token=SECRET
 *
 * Recibe el webhook de Jotform (formulario 261741493759065),
 * mapea los campos según la rama (tipo_proyecto), genera la propuesta
 * de estancias, y persiste en /solicitudes_acrono.json sin tocar acrono_app.json.
 *
 * NOTA: rawRequest SIEMPRE trae todas las claves; las de bloques ocultos llegan
 * como "". La ramificación se hace por tipo_proyecto, no por presencia de claves.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Solicitud, EstanciaSolicitud } from '@/lib/types';
import { readSolicitudesSystem, writeSolicitudesSystem } from '@/lib/data/solicitudes-storage';
import { MO_DEF, MU_DEF } from '@/lib/utils/coag';

const FORM_ID        = '261741493759065';
const EUR_M2_PISCINA = 1000; // CALIBRAR si es necesario

// ── Detección de rama por tipo_proyecto ───────────────────────────────────────

const T = {
  isObraNueva:    (t: string) => t.toLowerCase().includes('obra nueva'),
  isReforma:      (t: string) => t.toLowerCase().includes('reforma'),
  isHotel:        (t: string) => t.toLowerCase().includes('hotel') || t.toLowerCase().includes('alojamiento'),
  isEquipamiento: (t: string) => t.toLowerCase().includes('equipamiento'),
  isLocal:        (t: string) => t.toLowerCase().includes('local') || t.toLowerCase().includes('oficina'),
  isClinica:      (t: string) => t.toLowerCase().includes('cl') && (t.toLowerCase().includes('nica') || t.toLowerCase().includes('sanitario')),
  isRestauracion: (t: string) => t.toLowerCase().includes('restaur'),
};

function isSolarBranch(t: string) { return T.isObraNueva(t) || T.isReforma(t) || T.isHotel(t) || T.isEquipamiento(t); }
function isLocalBranch(t: string) { return T.isLocal(t) || T.isClinica(t) || T.isRestauracion(t); }
function isNoEstancias(t: string) { return T.isHotel(t) || T.isEquipamiento(t); }

// ── Helpers de parseo ─────────────────────────────────────────────────────────

function toNum(v: unknown): number {
  if (!v && v !== 0) return 0;
  return parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0;
}

function toBool(v: unknown): boolean {
  const s = String(v ?? '').toLowerCase().trim();
  return s === 'sí' || s === 'si' || s === 'yes' || s === '1' || s === 'true';
}

function toStr(v: unknown): string {
  return String(v ?? '').trim();
}

function parsePhone(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'object' && v !== null) {
    return String((v as Record<string, unknown>).full ?? '') || '';
  }
  return String(v);
}

function parseName(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>;
    const first = toStr(o.first);
    const last  = toStr(o.last);
    if (last && first) return `${last}, ${first}`;
    return first || last;
  }
  return toStr(v);
}

// ── Constructores de EstanciaSolicitud por calidad ────────────────────────────

function viv(concepto: string, m2Util: number): EstanciaSolicitud {
  return { concepto, m2Util, coef: 1.0, calidad: 'vivienda', esPiscina: false, eurM2Piscina: 0 };
}

function men(concepto: string, m2Util: number, coef = 0.8): EstanciaSolicitud {
  return { concepto, m2Util, coef, calidad: 'menor', esPiscina: false, eurM2Piscina: 0 };
}

function ext(concepto: string, m2Util: number): EstanciaSolicitud {
  return { concepto, m2Util, coef: 0.5, calidad: 'exterior', esPiscina: false, eurM2Piscina: 0 };
}

function pisc(m2Util: number): EstanciaSolicitud {
  return { concepto: 'Piscina', m2Util, coef: 0, calidad: 'exterior', esPiscina: true, eurM2Piscina: EUR_M2_PISCINA };
}

// ── Generadores de estancias por rama ─────────────────────────────────────────

interface ObraNuevaInput {
  n_plantas: number; quiere_sotano: boolean;
  n_dormitorios: number; n_banos: number; n_aseos: number;
  cocina: string; despacho: boolean; lavadero: boolean; despensa: boolean;
  garaje: boolean; n_coches: number; trastero: boolean;
  piscina: boolean; piscina_largo: number; piscina_ancho: number; porche: boolean;
}

function genObraNueva(d: ObraNuevaInput): EstanciaSolicitud[] {
  const est: EstanciaSolicitud[] = [];

  est.push(viv('Recibidor / distribuidor', 8));
  est.push(viv('Sala de instalaciones', 6));

  const cocinaAbierta = d.cocina.toLowerCase().includes('abierta') || d.cocina.toLowerCase().includes('sal');
  if (cocinaAbierta) {
    est.push(viv('Salón-comedor-cocina', 45));
  } else {
    est.push(viv('Salón-comedor', 30));
    est.push(viv('Cocina', 14));
  }

  if (d.n_dormitorios >= 1) {
    est.push(viv('Dormitorio principal', 20));
    for (let i = 1; i < d.n_dormitorios; i++) est.push(viv('Dormitorio', 14));
  }
  for (let i = 0; i < d.n_banos;  i++) est.push(viv('Baño', 6));
  for (let i = 0; i < d.n_aseos; i++) est.push(viv('Aseo', 4));

  if (d.despacho) est.push(viv('Despacho', 12));
  if (d.lavadero) est.push(viv('Lavadero', 6));
  if (d.despensa) est.push(viv('Despensa', 5));

  for (let i = 1; i < d.n_plantas; i++) est.push(viv('Distribuidor / escalera', 12));

  if (d.quiere_sotano) est.push(men('Sótano / semisótano', 40));

  if (d.garaje) est.push(men('Garaje', 30 * Math.max(d.n_coches, 1), 0.6));
  if (d.trastero) est.push(men('Trastero', 10));
  if (d.porche) est.push(ext('Porche', 20));
  if (d.piscina) {
    const m2 = d.piscina_largo > 0 && d.piscina_ancho > 0 ? d.piscina_largo * d.piscina_ancho : 15;
    est.push(pisc(m2));
  }

  return est;
}

interface ReformaInput {
  ref_sup_vivienda_actual: number; ref_sup_garaje_trastero: number;
  ref_sup_piscina: number; ref_sup_porche: number; ref_sup_ampliacion_estimada: number;
}

function genReforma(d: ReformaInput): EstanciaSolicitud[] {
  const est: EstanciaSolicitud[] = [];
  if (d.ref_sup_vivienda_actual     > 0) est.push(viv('Vivienda a reformar', d.ref_sup_vivienda_actual));
  if (d.ref_sup_garaje_trastero     > 0) est.push(men('Garaje / trastero a reformar', d.ref_sup_garaje_trastero, 0.6));
  if (d.ref_sup_piscina             > 0) est.push(pisc(d.ref_sup_piscina));
  if (d.ref_sup_porche              > 0) est.push(ext('Porche cubierto', d.ref_sup_porche));
  if (d.ref_sup_ampliacion_estimada > 0) est.push(viv('Ampliación (obra nueva)', d.ref_sup_ampliacion_estimada));
  return est;
}

function genLocal(tipo: string, superficie: number): EstanciaSolicitud[] {
  const concepto = T.isClinica(tipo) ? 'Clínica / consulta' : T.isRestauracion(tipo) ? 'Local restauración' : 'Local / oficina';
  return [viv(concepto, superficie)];
}

// ── Parámetros COAG por defecto según rama ────────────────────────────────────

function coagDefaults(tipo: string): {
  familia: Solicitud['familia'];
  plantilla: Solicitud['plantilla'];
  usoKey: string;
} {
  if (T.isReforma(tipo))      return { familia: 'viviendas', plantilla: 'reforma',  usoKey: '' };
  if (T.isClinica(tipo))      return { familia: 'otros',     plantilla: 'nueva',    usoKey: 'clinica' };
  if (T.isLocal(tipo))        return { familia: 'otros',     plantilla: 'nueva',    usoKey: 'ofi_otros' };
  if (T.isRestauracion(tipo)) return { familia: 'otros',     plantilla: 'nueva',    usoKey: 'resto_bar' }; // CALIBRAR usoKey
  if (T.isHotel(tipo))        return { familia: 'otros',     plantilla: 'nueva',    usoKey: 'hotelero' };  // CALIBRAR usoKey
  if (T.isEquipamiento(tipo)) return { familia: 'otros',     plantilla: 'nueva',    usoKey: 'dotac' };     // CALIBRAR usoKey
  return { familia: 'viviendas', plantilla: 'nueva', usoKey: '' }; // obra nueva residencial
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Validar token
  const expectedToken = process.env.JOTFORM_WEBHOOK_TOKEN;
  if (expectedToken) {
    const token = new URL(req.url).searchParams.get('token');
    if (token !== expectedToken) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  // 2. Parsear form data
  let raw: Record<string, unknown> = {};
  let formID = '';
  try {
    const fd = await req.formData();
    formID = toStr(fd.get('formID'));
    raw = JSON.parse(toStr(fd.get('rawRequest') ?? '{}'));
  } catch {
    return NextResponse.json({ error: 'parse_error' }, { status: 400 });
  }

  if (formID !== FORM_ID) {
    return NextResponse.json({ error: 'wrong_form', formID }, { status: 400 });
  }

  // 3. Campos comunes (todas las ramas)
  const nombre            = parseName(raw['q3_q3_fullname1']);
  const email             = toStr(raw['q4_q4_email2']);
  const telefono          = parsePhone(raw['q5_q5_phone3']).replace(/[^+\d]/g, '');
  const tipo_cliente      = toStr(raw['q6_q6_radio4']);
  const tipo_proyecto     = toStr(raw['q7_q7_radio5']);
  const como_nos_conocio  = toStr(raw['q43_comoNoscomo_nos_conocio']);
  const presupuesto_cliente = toNum(raw['q29_q29_number27']);
  const plazo_inicio_proyecto = toStr(raw['q30_textbox28']);
  const plazo_inicio_obra     = toStr(raw['q47_plazoDeseado']);
  const notas_libres      = toStr(raw['q38_cuentanos']);

  const documentacion: string[] = [];
  Object.values(raw).forEach(v => {
    if (typeof v === 'string' && v.startsWith('https://') && v.includes('jotform')) documentacion.push(v);
    else if (Array.isArray(v)) v.forEach(u => { if (typeof u === 'string' && u.startsWith('https://')) documentacion.push(u); });
  });

  // 4. Campos de localización según rama
  let solar_direccion  = '', solar_municipio   = '', solar_refCatastral = '', solar_superficie  = 0;
  let local_direccion  = '', local_municipio   = '', local_refCatastral = '', local_superficie  = 0;

  if (isSolarBranch(tipo_proyecto)) {
    solar_direccion   = toStr(raw['q8_q8_textbox6']);
    solar_municipio   = toStr(raw['q40_municipio'] ?? raw['q40_municipiosolar_municipio']);
    solar_refCatastral = toStr(raw['q42_referenciaCatastral42'] ?? raw['q42_referenciaCatastral42solar_refCatastral']);
    solar_superficie  = toNum(raw['q9_q9_number7']);
  }
  if (isLocalBranch(tipo_proyecto)) {
    local_direccion   = toStr(raw['q49_calleY'] ?? raw['q49_calleYlocal_direccion']);
    local_municipio   = toStr(raw['q50_municipio50'] ?? raw['q50_municipio50local_municipio']);
    local_refCatastral = toStr(raw['q51_referenciaCatastral'] ?? raw['q51_referenciaCatastrallocal_refCatastral']);
    local_superficie  = toNum(raw['q52_superficiem'] ?? raw['q52_superficiemlocal_superficie']);
  }

  // Campos derivados para compatibilidad con editor y generarPresupuesto
  const municipio_provincia = solar_municipio || local_municipio;
  const referencia_catastral = solar_refCatastral || local_refCatastral;
  const m2_solar = solar_superficie;

  // 5. Campos específicos de Obra nueva residencial
  const quiere_sotano  = toBool(raw['q63_quieresSotano63']);
  const n_plantas      = Math.max(toNum(raw['q11_q11_number9']) || 1, 1);
  const n_dormitorios  = toNum(raw['q12_q12_number10']);
  const n_banos        = toNum(raw['q13_q13_number11']);
  const n_aseos        = toNum(raw['q14_q14_number12']);
  const cocina         = toStr(raw['q15_q15_radio13']);
  const despacho       = toBool(raw['q16_q16_radio14']);
  const lavadero       = toBool(raw['q36_lavadero']);
  const despensa       = toBool(raw['q37_despensa']);
  const garaje         = toBool(raw['q17_q17_radio15']);
  const n_coches       = toNum(raw['q18_q18_number16']);
  const trastero       = toBool(raw['q19_q19_radio17']);
  const piscina        = toBool(raw['q20_q20_radio18']);
  const piscina_largo  = toNum(raw['q21_q21_number19']);
  const piscina_ancho  = toNum(raw['q22_q22_number20']);
  const porche         = toBool(raw['q23_q23_radio21']);

  // 6. Campos específicos de Reforma
  const ref_sup_vivienda_actual     = toNum(raw['q55_superficieActual']);
  const ref_sup_garaje_trastero     = toNum(raw['q56_superficieActual56']);
  const ref_sup_piscina             = toNum(raw['q57_superficieDe']);
  const ref_sup_porche              = toNum(raw['q58_superficieDe58']);
  const ref_sup_ampliacion_estimada = toNum(raw['q59_siQuiere']);

  // 7. Campos Hotel / Equipamiento
  const descripcion_necesidades = toStr(raw['q62_describaEl'] ?? raw['q62_describaEldescripcion_necesidades']);

  // 8. Generar propuesta de estancias según rama
  let estancias: EstanciaSolicitud[] = [];
  if (!isNoEstancias(tipo_proyecto)) {
    if (T.isObraNueva(tipo_proyecto)) {
      estancias = genObraNueva({ n_plantas, quiere_sotano, n_dormitorios, n_banos, n_aseos, cocina, despacho, lavadero, despensa, garaje, n_coches, trastero, piscina, piscina_largo, piscina_ancho, porche });
    } else if (T.isReforma(tipo_proyecto)) {
      estancias = genReforma({ ref_sup_vivienda_actual, ref_sup_garaje_trastero, ref_sup_piscina, ref_sup_porche, ref_sup_ampliacion_estimada });
    } else if (isLocalBranch(tipo_proyecto)) {
      estancias = genLocal(tipo_proyecto, local_superficie);
    }
  }

  // 9. Parámetros COAG por defecto
  const coag = coagDefaults(tipo_proyecto);

  // 10. Construir solicitud
  const solicitud: Solicitud = {
    id: 'sol_' + Date.now(),
    fechaRecepcion: new Date().toISOString(),
    estado: 'nueva',
    presupuestoId: null,

    // Contacto
    nombre, email, telefono, tipo_cliente,

    // Proyecto (campos derivados para compatibilidad)
    tipo_proyecto, municipio_provincia, referencia_catastral, m2_solar,

    // Programa vivienda (solo obra nueva; demás ramas llegan como 0/false/'')
    n_plantas, n_dormitorios, n_banos, n_aseos, cocina,
    despacho, lavadero, despensa, garaje, n_coches,
    trastero, piscina, piscina_largo, piscina_ancho, porche,

    // Contexto económico
    presupuesto_cliente,
    plazo: plazo_inicio_proyecto, // backward compat
    notas_libres, documentacion,

    estancias,

    // COAG
    familia:      coag.familia,
    plantilla:    coag.plantilla,
    usoKey:       coag.usoKey,
    flKey:        'A',
    ftKey:        'aislada',
    fcKey:        'b',
    urbCalle:     false,
    mo:           MO_DEF,
    mu:           MU_DEF,
    complejidadK: 1,

    // Campos ampliados
    como_nos_conocio,
    plazo_inicio_proyecto,
    plazo_inicio_obra,
    quiere_sotano,
    solar_direccion, solar_municipio, solar_refCatastral, solar_superficie,
    local_direccion, local_municipio, local_refCatastral, local_superficie,
    ref_sup_vivienda_actual, ref_sup_garaje_trastero, ref_sup_piscina, ref_sup_porche, ref_sup_ampliacion_estimada,
    descripcion_necesidades,
  };

  // 11. Persistir
  try {
    const existing = await readSolicitudesSystem();
    await writeSolicitudesSystem([...existing, solicitud]);
  } catch (err) {
    console.error('[intake] Error persisting solicitud:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 200 });
  }

  return NextResponse.json({ ok: true, id: solicitud.id }, { status: 200 });
}
