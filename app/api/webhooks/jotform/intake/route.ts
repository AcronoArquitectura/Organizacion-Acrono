/**
 * POST /api/webhooks/jotform/intake?token=SECRET
 *
 * Recibe el webhook de Jotform (formulario 261741493759065),
 * mapea los campos a una Solicitud, genera la propuesta de estancias,
 * y persiste en /solicitudes_acrono.json (Dropbox) SIN tocar acrono_app.json.
 *
 * Debe responder 200 en < 30 s (límite de Jotform).
 * Env vars necesarias: JOTFORM_WEBHOOK_TOKEN, DROPBOX_REFRESH_TOKEN
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Solicitud, EstanciaSolicitud } from '@/lib/types';
import { readSolicitudesSystem, writeSolicitudesSystem } from '@/lib/data/solicitudes-storage';
import { MO_DEF, MU_DEF } from '@/lib/utils/coag';

const FORM_ID = '261741493759065';

// ── Coeficientes por tipo de estancia (CALIBRAR aquí si es necesario) ─────────
const COEF_VIVIENDA = 1.0;   // dormitorios, salón, cocina, baños, despacho, etc.
const COEF_COMPL    = 0.8;   // trastero, porche
const COEF_GARAJE   = 0.6;   // garaje
const EUR_M2_PISCINA = 1000; // €/m² fijo para piscina (modo manual en pemRows)

// ── Utilidades de parseo ──────────────────────────────────────────────────────

function toNum(v: unknown): number {
  if (!v && v !== 0) return 0;
  // Formato español: puntos de miles, coma decimal → limpiar y parsear
  return parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0;
}

function toBool(v: unknown): boolean {
  const s = String(v ?? '').toLowerCase().trim();
  return s === 'sí' || s === 'si' || s === 'yes' || s === '1' || s === 'true';
}

function parsePhone(v: unknown): string {
  if (!v) return '';
  // Jotform phone field puede ser objeto {full, area, phone} o string
  if (typeof v === 'object' && v !== null) {
    return String((v as Record<string, unknown>).full ?? '') || '';
  }
  return String(v);
}

function parseName(v: unknown): { first: string; last: string } {
  if (!v) return { first: '', last: '' };
  if (typeof v === 'object' && v !== null) {
    const o = v as Record<string, unknown>;
    return { first: String(o.first ?? '').trim(), last: String(o.last ?? '').trim() };
  }
  const parts = String(v).trim().split(/\s+/);
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
}

// ── Generador de propuesta de estancias ──────────────────────────────────────

function genEstancias(d: {
  n_dormitorios: number; n_banos: number; n_aseos: number; n_plantas: number;
  cocina: string; despacho: boolean; lavadero: boolean; despensa: boolean;
  garaje: boolean; n_coches: number; trastero: boolean;
  piscina: boolean; piscina_largo: number; piscina_ancho: number; porche: boolean;
}): EstanciaSolicitud[] {
  const est: EstanciaSolicitud[] = [];

  const viv = (concepto: string, m2Util: number): EstanciaSolicitud =>
    ({ concepto, m2Util, coef: COEF_VIVIENDA, esPiscina: false, eurM2Piscina: 0 });

  // ── Zonas comunes siempre presentes ──
  est.push(viv('Recibidor / distribuidor', 8));
  est.push(viv('Sala de instalaciones', 6));

  // ── Salón / cocina ──
  const cocinaAberta = d.cocina.toLowerCase().includes('abierta')
    || d.cocina.toLowerCase().includes('sal');
  if (cocinaAberta) {
    est.push(viv('Salón-comedor-cocina', 45));
  } else {
    est.push(viv('Salón-comedor', 30));
    est.push(viv('Cocina', 14));
  }

  // ── Dormitorios ──
  if (d.n_dormitorios >= 1) {
    est.push(viv('Dormitorio principal', 25));
    for (let i = 1; i < d.n_dormitorios; i++) est.push(viv('Dormitorio', 12));
  }

  // ── Baños y aseos ──
  for (let i = 0; i < d.n_banos; i++)  est.push(viv('Baño', 6));
  for (let i = 0; i < d.n_aseos; i++) est.push(viv('Aseo', 4));

  // ── Estancias opcionales de vivienda ──
  if (d.despacho) est.push(viv('Despacho', 12));
  if (d.lavadero) est.push(viv('Lavadero', 6));
  if (d.despensa) est.push(viv('Despensa', 5));

  // ── Distribuidor / escalera por planta adicional ──
  for (let i = 1; i < d.n_plantas; i++) est.push(viv('Distribuidor / escalera', 12));

  // ── Garaje (coef 0.6) ──
  if (d.garaje) {
    const nc = Math.max(d.n_coches, 1);
    est.push({ concepto: 'Garaje', m2Util: 20 * nc, coef: COEF_GARAJE, esPiscina: false, eurM2Piscina: 0 });
  }

  // ── Trastero (coef 0.8 — zona complementaria) ──
  if (d.trastero) {
    est.push({ concepto: 'Trastero', m2Util: 10, coef: COEF_COMPL, esPiscina: false, eurM2Piscina: 0 });
  }

  // ── Porche (coef 0.8 — zona complementaria) ──
  if (d.porche) {
    est.push({ concepto: 'Porche', m2Util: 30, coef: COEF_COMPL, esPiscina: false, eurM2Piscina: 0 });
  }

  // ── Piscina (modo manual, no computa m² para honorarios) ──
  if (d.piscina) {
    const m2 = d.piscina_largo > 0 && d.piscina_ancho > 0
      ? d.piscina_largo * d.piscina_ancho
      : 15; // valor por defecto si no se indicaron medidas
    est.push({ concepto: 'Piscina', m2Util: m2, coef: 0, esPiscina: true, eurM2Piscina: EUR_M2_PISCINA });
  }

  return est;
}

// ── Parámetros COAG por defecto según tipo de proyecto ───────────────────────

function coagDefaults(tipo: string): {
  familia: Solicitud['familia'];
  plantilla: Solicitud['plantilla'];
  usoKey: string;
} {
  const t = tipo.toLowerCase();
  if (t.includes('reforma') || t.includes('rehabilit')) {
    return { familia: 'viviendas', plantilla: 'reforma', usoKey: '' };
  }
  if (t.includes('clínica') || t.includes('clinica') || t.includes('sanitario') || t.includes('dental')) {
    // 'clinica' = Clínicas ×2,00 en la tabla COAG
    return { familia: 'otros', plantilla: 'nueva', usoKey: 'clinica' };
  }
  if (t.includes('local') || t.includes('oficina')) {
    // 'ofi_otros' = Oficinas en edificio de otros usos ×1,05
    return { familia: 'otros', plantilla: 'nueva', usoKey: 'ofi_otros' };
  }
  // Obra nueva residencial (default)
  return { familia: 'viviendas', plantilla: 'nueva', usoKey: '' };
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Validar token de seguridad
  const expectedToken = process.env.JOTFORM_WEBHOOK_TOKEN;
  if (expectedToken) {
    const token = new URL(req.url).searchParams.get('token');
    if (token !== expectedToken) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  // 2. Parsear form data (Jotform envía multipart/form-data o urlencoded)
  let raw: Record<string, unknown> = {};
  let formID = '';
  try {
    const fd = await req.formData();
    formID = String(fd.get('formID') ?? '');
    const rawStr = String(fd.get('rawRequest') ?? '{}');
    raw = JSON.parse(rawStr);
  } catch {
    return NextResponse.json({ error: 'parse_error' }, { status: 400 });
  }

  // 3. Validar que es el formulario correcto
  if (formID !== FORM_ID) {
    return NextResponse.json({ error: 'wrong_form', formID }, { status: 400 });
  }

  // 4. Mapear campos del formulario
  const nameObj = parseName(raw['q3_q3_fullname1']);
  const nombre = nameObj.last && nameObj.first
    ? `${nameObj.last}, ${nameObj.first}`
    : (nameObj.first || nameObj.last || '');

  const email        = String(raw['q4_q4_email2'] ?? '').trim();
  const telRaw       = parsePhone(raw['q5_q5_phone3']);
  const telefono     = telRaw.replace(/[^+\d]/g, '');

  const tipo_cliente         = String(raw['q6_q6_radio4']         ?? '');
  const tipo_proyecto        = String(raw['q7_q7_radio5']         ?? '');
  const municipio_provincia  = String(raw['q8_q8_textbox6']       ?? '');
  const referencia_catastral = String(
    raw['q35_referenciaCatastral'] ?? raw['q35_q35_referenciaCatastral'] ?? ''
  );

  const m2_solar      = toNum(raw['q9_q9_number7']);
  const n_plantas     = Math.max(toNum(raw['q11_q11_number9']) || 1, 1);
  const n_dormitorios = toNum(raw['q12_q12_number10']);
  const n_banos       = toNum(raw['q13_q13_number11']);
  const n_aseos       = toNum(raw['q14_q14_number12']);
  const cocina        = String(raw['q15_q15_radio13']  ?? '');
  const despacho      = toBool(raw['q16_q16_radio14']);
  const lavadero      = toBool(raw['q36_lavadero']);
  const despensa      = toBool(raw['q37_despensa']);
  const garaje        = toBool(raw['q17_q17_radio15']);
  const n_coches      = toNum(raw['q18_q18_number16']);
  const trastero      = toBool(raw['q19_q19_radio17']);
  const piscina       = toBool(raw['q20_q20_radio18']);
  const piscina_largo = toNum(raw['q21_q21_number19']);
  const piscina_ancho = toNum(raw['q22_q22_number20']);
  const porche        = toBool(raw['q23_q23_radio21']);

  // Presupuesto cliente (clave corregida: q29_q30_number27)
  const presupuesto_cliente = toNum(raw['q29_q30_number27']);
  const plazo               = String(raw['q30_q30_textbox28'] ?? '');

  // Notas libres — campo q38_cuentanos (confirmar clave exacta en Jotform si cambia)
  const notas_libres = String(raw['q38_cuentanos'] ?? '');

  // Documentación: cualquier URL de Jotform en los valores del formulario
  const documentacion: string[] = [];
  Object.values(raw).forEach(v => {
    if (typeof v === 'string' && v.startsWith('https://') && v.includes('jotform')) {
      documentacion.push(v);
    } else if (Array.isArray(v)) {
      v.forEach(u => {
        if (typeof u === 'string' && u.startsWith('https://')) documentacion.push(u);
      });
    }
  });

  // 5. Generar propuesta de estancias
  const estancias = genEstancias({
    n_dormitorios, n_banos, n_aseos, n_plantas, cocina,
    despacho, lavadero, despensa, garaje, n_coches,
    trastero, piscina, piscina_largo, piscina_ancho, porche,
  });

  // 6. Parámetros COAG por defecto
  const coag = coagDefaults(tipo_proyecto);

  // 7. Construir solicitud
  const solicitud: Solicitud = {
    id: 'sol_' + Date.now(),
    fechaRecepcion: new Date().toISOString(),
    estado: 'nueva',
    presupuestoId: null,

    nombre, email, telefono, tipo_cliente,
    tipo_proyecto, municipio_provincia, referencia_catastral,
    m2_solar, n_plantas, n_dormitorios, n_banos, n_aseos,
    cocina, despacho, lavadero, despensa, garaje, n_coches,
    trastero, piscina, piscina_largo, piscina_ancho, porche,
    presupuesto_cliente, plazo, notas_libres, documentacion,

    estancias,

    // COAG (editables en el editor de solicitud)
    familia:      coag.familia,
    plantilla:    coag.plantilla,
    usoKey:       coag.usoKey,
    flKey:        'A',        // default Granada; editable
    ftKey:        'aislada',  // editable
    fcKey:        'b',        // sugerida; el editor calcula y muestra la idónea
    urbCalle:     false,
    mo:           MO_DEF,
    mu:           MU_DEF,
    complejidadK: 1,
  };

  // 8. Persistir (el único punto que toca solicitudes_acrono.json en este flujo)
  try {
    const existing = await readSolicitudesSystem();
    await writeSolicitudesSystem([...existing, solicitud]);
  } catch (err) {
    console.error('[intake] Error persisting solicitud:', err);
    // Devolvemos 200 igualmente para que Jotform no reintente indefinidamente
    return NextResponse.json({ ok: false, error: String(err) }, { status: 200 });
  }

  return NextResponse.json({ ok: true, id: solicitud.id }, { status: 200 });
}
