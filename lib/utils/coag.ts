/**
 * Motor de cálculo COAG Granada 2026.
 * Portado línea a línea de acrono.html (líneas 3266–3462).
 * No modificar las fórmulas sin verificar contra el original.
 */
import type { Presupuesto, Tarea, Capitulo, PemRow, Partida } from '@/lib/types';

// ── Constantes ────────────────────────────────────────────────────────────────
export const MO_DEF = 680;
export const MU_DEF = 96.5;
const URB_CALLE_EURM2 = 93.5;

// ── Tablas de coeficientes ────────────────────────────────────────────────────
export const FL_OPTS = [
  { k: 'A', label: 'Municipio A — Granada, Albolote, Atarfe, Baza, Las Gabias… (Fl=1,00)', v: 1.00 },
  { k: 'B', label: 'Municipio B — resto de núcleos/pedanías (Fl=0,95)', v: 0.95 },
];

export const FT_VIV = [
  { k: 'aislada',       label: 'Unifamiliar aislada',              v: 1.15 },
  { k: 'adosada',       label: 'Adosada/agrupada o aterrazada',    v: 1.10 },
  { k: 'medianeras',    label: 'Unifamiliar entre medianeras',     v: 1.00 },
  { k: 'plurifamiliar', label: 'Plurifamiliar',                    v: 1.10 },
];

export const FC_VIV = [
  { k: 'a', label: 'S ≤ 70 m² (Fc=1,05)',    v: 1.05 },
  { k: 'b', label: '70–130 m² (Fc=1,00)',    v: 1.00 },
  { k: 'c', label: '130–210 m² (Fc=1,10)',   v: 1.10 },
  { k: 'd', label: 'S > 210 m² (Fc=1,20)',   v: 1.20 },
];

export function fcSugerido(sup: number): 'a' | 'b' | 'c' | 'd' {
  return sup <= 70 ? 'a' : sup <= 130 ? 'b' : sup <= 210 ? 'c' : 'd';
}

type UsosGroup = { g: string; items: [string, string, number][] };

export const USOS_OTROS: UsosGroup[] = [
  { g: 'Comercial', items: [
    ['com_dist','Comercial con distribución',0.95],
    ['com_sindist','Comercial sin distribución',0.80],
    ['com_merc','Mercados/hiper/super exentos',1.15],
  ]},
  { g: 'Oficinas y administrativo', items: [
    ['ofi_otros','Oficinas en edificio de otros usos',1.05],
    ['ofi_excl','Oficinas en edificio exclusivo',1.25],
    ['ofi_admin','Edificios oficiales/admin. importantes',1.70],
  ]},
  { g: 'Hotelero', items: [
    ['hot5','Hotel 5★',1.90],['hot4','Hotel 4★',1.70],['hot3','Hotel 3★',1.45],
    ['hot2','Hotel 2★',1.25],['hot1','Hotel 1★',1.05],
    ['pen2','Pensión/hostal 2★',1.00],['pen1','Pensión/hostal 1★',0.95],
  ]},
  { g: 'Espectáculos y hostelería', items: [
    ['tea_c','Teatros/cines cubiertos',1.55],['tea_d','Teatros/cines descubiertos',0.75],
    ['balneario','Balnearios',1.35],['rest','Cafeterías/bares/restaurantes',1.25],
    ['disco','Salas de fiestas/discotecas',1.40],['club','Clubs/casinos/saunas',1.30],
  ]},
  { g: 'Docentes', items: [
    ['guarderia','Guarderías/preescolar',1.25],['colegio','Colegios/institutos/formación',1.30],
    ['facultad','Escuelas superiores/facultades',1.50],['col_mayor','Colegios mayores/menores',1.40],
  ]},
  { g: 'Públicos', items: [
    ['est_bus','Estación de autobuses',1.70],['terminal','Terminales aéreas/marítimas',1.90],
    ['central','Centrales telefónicas/eléctricas',1.05],['biblioteca','Bibliotecas',1.50],
    ['museo','Museos/salas de exposiciones',1.70],['polivalente','Salas polivalentes',1.10],
    ['tanatorio','Tanatorios',1.05],
  ]},
  { g: 'Religiosos', items: [
    ['religioso','Edificios religiosos',1.25],
  ]},
  { g: 'Sanitarios', items: [
    ['dispensario','Dispensarios/botiquines',1.00],['cs','Centros de salud/ambulatorios',1.15],
    ['lab','Laboratorios',1.30],['clinica','Clínicas',2.00],
    ['hospital','Hospitales',2.15],['asilo','Asilos/residencias',1.45],
  ]},
  { g: 'Deportivas y recreativas', items: [
    ['grad_c','Graderíos cubiertos',0.75],['grad_d','Graderíos descubiertos',0.50],
    ['gimnasio','Gimnasios',1.10],['polidep','Polideportivos cubiertos',1.35],
    ['pisc_c','Piscinas cubiertas',1.05],['pisc_d','Piscinas descubiertas',0.50],
    ['dep_serv','Dependencias cubiertas servicio',0.65],['estadio','Estadios/plazas toros/hipódromos',0.95],
  ]},
  { g: 'Garajes / almacenes / otros', items: [
    ['garaje','Edificio de garajes uso exclusivo',0.75],
    ['nave_h','Nave/almacén estructura hormigón',0.70],
    ['nave_m1','Nave metálica ≤1000 m²',0.60],['nave_m2','Nave metálica 1000–2000 m²',0.55],
    ['nave_m3','Nave metálica >2000 m²',0.50],['cobertizo','Cobertizos sin cerrar',0.20],
    ['carpa','Carpas/palenques',0.30],['anexo','Dependencias anexas (garaje/trastero)',0.65],
    ['local_bruto','Local en bruto en edificio viviendas',0.65],['adaptacion','Adaptación de locales',0.50],
  ]},
];

export const USOS_URB: UsosGroup[] = [
  { g: 'Cerramientos', items: [
    ['muro_cont','Muros de contención (×3,00)',3.00],
    ['muro_mamp','Muros de mampostería (×1,00)',1.00],
    ['vallas','Vallas y cercas (×0,35)',0.35],
  ]},
  { g: 'Urbanización completa (por Ha)', items: [
    ['urb_1','S ≤ 1 Ha (×0,55)',0.55],['urb_3','1–3 Ha (×0,50)',0.50],
    ['urb_15','3–15 Ha (×0,45)',0.45],['urb_30','15–30 Ha (×0,40)',0.40],
    ['urb_45','30–45 Ha (×0,35)',0.35],['urb_100','45–100 Ha (×0,30)',0.30],
    ['urb_300','100–300 Ha (×0,25)',0.25],['urb_mas','> 300 Ha (×0,20)',0.20],
  ]},
  { g: 'Otros', items: [
    ['intersticial','Espacios intersticiales/residuales (×0,65)',0.65],
  ]},
];

export const CAPS_EDIF: [string, string, number][] = [
  ['demoliciones','Demoliciones',6.5],['estructura','Estructura',20],
  ['albanileria','Albañilería',15],['cubierta','Cubierta',10],
  ['saneamiento','Saneamiento horizontal',2],['revestimientos','Revestimientos',20],
  ['carpinteria','Carpintería y cerrajería',8],['electricidad','Electricidad',4],
  ['fontaneria','Fontanería',3],['sanitarios','Sanitarios',3.5],
  ['inst_esp','Instalaciones especiales',4],['vidrios','Vidrios',1],['pinturas','Pinturas',3],
];

export const CAPS_URB: [string, string, number][] = [
  ['pavimentacion','Pavimentación',18],['acerado','Acerado',22],
  ['alumbrado','Alumbrado',30],['saneamiento','Saneamiento',15],
  ['abastecimiento','Abastecimiento',15],
];

// ── Plantillas de honorarios ──────────────────────────────────────────────────
type EntregableDef = { key: string; label: string; escala: boolean; sub: [string, number][] };
export type PlantillaDef = { base: number; topoEurM2: number; extrasFijo: number; entregables: EntregableDef[] };

export const T_NUEVA: PlantillaDef = {
  base: 250, topoEurM2: 1, extrasFijo: 800,
  entregables: [
    { key:'anteproyecto', label:'Anteproyecto + Infografía 3D', escala:true,
      sub:[['Topográfico',1],['Idea',40],['Cambios',40],['Premedición',10],['Reuniones',15],['Presupuestos',4],['Renders 3D',40],['Cambios renders',10]] },
    { key:'basico', label:'Proyecto Básico', escala:true,
      sub:[['Información inicial',10],['Referencias externas',16],['Secciones y alzados',16],['Memoria',14],['Ficha urbanística',2],['Acotados',2]] },
    { key:'ejecucion', label:'Proyecto de Ejecución', escala:true,
      sub:[['Estructura',20],['Instalaciones',45],['Albañilería',4],['Falsos techos',4],['Acabados',2],['Carpinterías',16],['Cerrajería',4],['Baja tensión',8],['Iluminación',2],['Memoria',8],['Mediciones',24],['Detalle constructivo',14],['Replanteo y mov. tierras',8],['Índice',1]] },
    { key:'licencia', label:'Licencia de obra y gestiones', escala:false,
      sub:[['DRS',2],['Firmar y visar',2],['Sede electrónica/ficha',4],['Pedir presupuestos',6],['Comparativas de presupuestos',14],['Visitas comerciales',4],['Aparejador/etc',8]] },
    { key:'final', label:'Final de obra', escala:false,
      sub:[['CFO',20],['CEE',6],['Catastro',4],['Libro del edificio',4],['Certificado escrituras',2],['Gestiones varias',4]] },
  ],
};

export const T_REFORMA: PlantillaDef = {
  base: 100, topoEurM2: 0, extrasFijo: 0,
  entregables: [
    { key:'anteproyecto', label:'Anteproyecto', escala:true,
      sub:[['Topográfico',0],['Idea',25],['Cambios',15],['Premedición',8],['Reuniones',15],['Presupuestos',4]] },
    { key:'infografia', label:'Infografía 3D', escala:true,
      sub:[['Renders',30],['Cambios renders',5]] },
    { key:'memoria', label:'Memoria Técnica', escala:true,
      sub:[['Información inicial',10],['Referencias externas',10],['Secciones y alzados',12],['Memoria',24],['Acotados',2],['Estructura',8],['Instalaciones',24],['Albañilería',2],['Falsos techos',2],['Acabados',1],['Carpinterías',8],['Cerrajería',4],['Baja tensión',4],['Iluminación',2],['Mediciones',12],['Índice',1]] },
    { key:'licencia', label:'Licencia de obra y gestiones', escala:false,
      sub:[['DRS',2],['Firmar y visar',1],['Sede electrónica/ficha',1],['Pedir presupuestos',6],['Comparativas de presupuestos',8],['Visitas comerciales',4]] },
    { key:'final', label:'Final de obra', escala:false,
      sub:[['CEE',6],['Gestiones varias',4]] },
  ],
};

export const EXTRAS_LIST = [
  'Levantamiento','Proyecto de Demolición','Proyecto de actuación','Proyecto de actividad',
  'Certificado de antigüedad','Legalización/AFO/Asimilado','Cultura','Turismo',
  'Medio ambiente','Agregaciones/Segregaciones','Puesta en Marcha','Otros',
];

export const OBSERVACIONES_SEED = [
  {id:'o1',grupo:'Incluye',txt:'**Desplazamientos** de la visita a campo.'},
  {id:'o2',grupo:'Incluye',txt:'**Diseño de los espacios exteriores** de la parcela.'},
  {id:'o3',grupo:'Incluye',txt:'**Infografía 3D y Proyecto de interiorismo** de la vivienda, con 15 imágenes virtuales realistas para visualizar el proyecto antes de que se construya.'},
  {id:'o4',grupo:'Incluye',txt:'**Estudio topográfico** por topógrafo, para la georreferenciación X, Y, Z de las edificaciones y optimización del proyecto.'},
  {id:'o5',grupo:'No incluye',txt:'**Coste de Visados de Proyecto+DO.** Según los baremos del Colegio Oficial de Arquitectos.'},
  {id:'o6',grupo:'No incluye',txt:'**Dirección de Ejecución de obra y Coordinación Seguridad y Salud** por arquitecto técnico y sus costes de visado.'},
  {id:'o7',grupo:'No incluye',txt:'**Tasas en organismos de Licencia de Obra** necesarias para la tramitación del expediente ni para su puesta en marcha.'},
  {id:'o8',grupo:'No incluye',txt:'**Estudio geotécnico** por geólogo.'},
  {id:'o9',grupo:'No incluye',txt:'En caso de solicitar más de 15 imágenes virtuales se cobrarán a **100 € + IVA cada una**.'},
  {id:'o10',grupo:'No incluye',txt:'No se incluye **Proyecto de agregación/agrupación/segregación** de las parcelas.'},
  {id:'o11',grupo:'No incluye',txt:'No se incluye **Gestión Catastral, Gestión Notarial ni Registro de la Propiedad**.'},
  {id:'o12',grupo:'Otros',txt:'Se han calculado estos honorarios sobre una estimación de PEM según los baremos del COA de Granada. Si el **PEM final supera en un 25%** al calculado, se revisarán los honorarios proporcionalmente al incremento/disminución del PEM en un **6,5%**.'},
  {id:'o13',grupo:'Otros',txt:'Tras aprobación definitiva del Proyecto Básico, cualquier modificación no justificada se cobrará aparte, a **25 €/h**.'},
  {id:'o14',grupo:'Otros',txt:'Ácrono Arquitectura S.C.P. se reserva el derecho de **mostrar los trabajos realizados** a potenciales clientes, redes sociales y página web, así como realizar **fotografías/vídeos de la obra terminada**.'},
  {id:'o15',grupo:'Otros',txt:'Los **archivos editables** utilizados son propiedad exclusiva de Ácrono Arquitectura S.C.P. y no se entregarán a terceros.'},
];

export const DESCRIPCION_TRABAJO_DEF = `Anteproyecto, proyecto básico y de ejecución y direcciones de obra.
Para la ejecución de este proyecto, el trabajo se desglosa en las siguientes partes:
• Anteproyecto
• Redacción de Proyecto Básico y de Ejecución
• Dirección de Obra por Arquitecto Superior
• Dirección de ejecución de obra por Arquitecto Técnico
• Estudio Básico de Seguridad y Salud
• Coordinación de seguridad y salud en obra
• Plan de Control de Calidad
• Plan de Gestión de residuos
• Gestión de la licencia de Obras
• Certificado Final de Obra`;

// ── Helpers internos ──────────────────────────────────────────────────────────
export function capsFor(familia: string): [string, string, number][] {
  return familia === 'urbanizacion' ? CAPS_URB : CAPS_EDIF;
}

function otrosFactor(key: string): number {
  for (const g of USOS_OTROS) for (const it of g.items) if (it[0] === key) return it[2];
  return 1;
}

function urbFactor(key: string): number {
  for (const g of USOS_URB) for (const it of g.items) if (it[0] === key) return it[2];
  return 1;
}

export function plantillaDef(tpl: 'nueva' | 'reforma'): Record<string, Tarea> {
  const t = tpl === 'reforma' ? T_REFORMA : T_NUEVA;
  const tareas: Record<string, Tarea> = {};
  t.entregables.forEach(e => {
    tareas[e.key] = { escala: e.escala, sub: e.sub.map(s => ({ label: s[0], h: s[1] })) };
  });
  return tareas;
}

// ── Motor de cálculo (portado literal de acrono.html) ─────────────────────────

export function capCoef(p: Presupuesto): number {
  return p.capitulos.reduce((s, c) => s + (+c.real || 0), 0) / 100;
}

export function mcBase(p: Presupuesto): number {
  const fl = (FL_OPTS.find(x => x.k === p.flKey) ?? { v: 1 }).v;
  if (p.familia === 'viviendas') {
    const ft = (FT_VIV.find(x => x.k === p.ftKey) ?? { v: 1 }).v;
    const fc = (FC_VIV.find(x => x.k === p.fcKey) ?? { v: 1 }).v;
    return p.mo * fl * ft * fc;
  }
  if (p.familia === 'urbanizacion') {
    if (p.urbCalle) return URB_CALLE_EURM2 * fl;
    return p.mu * urbFactor(p.usoKey) * fl;
  }
  return p.mo * otrosFactor(p.usoKey) * fl;
}

export function rowEurM2(p: Presupuesto, r: PemRow): number {
  if (r.modo === 'manual') return +r.eurM2 || 0;
  return mcBase(p) * (+r.coef || 0) * capCoef(p);
}

export function pemTotal(p: Presupuesto): number {
  return p.pemRows.reduce((s, r) => s + (+r.m2 || 0) * rowEurM2(p, r), 0);
}

export function m2Totales(p: Presupuesto): number {
  return p.pemRows.filter(r => r.computaM2).reduce((s, r) => s + (+r.m2 || 0), 0);
}

export function kReformaAuto(p: Presupuesto): number {
  const pr = p.capitulos.reduce((s, c) => s + (+c.real || 0), 0) / 100;
  return 1 + (pr - 0.65);
}

export function escala(p: Presupuesto): number {
  const base = p.plantilla === 'reforma' ? T_REFORMA.base : T_NUEVA.base;
  const k = +p.complejidadK || 1;
  const sup = m2Totales(p) || 0;
  return k * (sup / base);
}

function horasEntregable(t: Tarea): number {
  return t.sub.reduce((s, sub) => s + (+sub.h || 0), 0);
}

export function doHoras(p: Presupuesto): number {
  return (+p.duracionMeses || 0) * (+p.visitasMes || 0) * 3 + (+p.duracionMeses || 0) * 16;
}

export function doVarMensual(p: Presupuesto): number {
  return (+p.km || 0) * 0.17 * (+p.visitasMes || 0) +
         (+p.horasVisita || 0) * (+p.eurHora || 0) * (+p.visitasMes || 0);
}

export function doEurMes(p: Presupuesto): number {
  const m = +p.duracionMeses || 0;
  return m ? (doHoras(p) * (+p.eurHora || 0)) / m + doVarMensual(p) : 0;
}

export interface HonorariosLine {
  key: string;
  label: string;
  horas?: number;
  importe: number;
  tipo: 'fijo' | 'mensual';
  meses?: number;
}

export function honorariosLineas(p: Presupuesto): HonorariosLine[] {
  const I3 = escala(p);
  const eh = +p.eurHora || 0;
  const tpl = p.plantilla === 'reforma' ? T_REFORMA : T_NUEVA;
  const L: HonorariosLine[] = [];

  if (tpl.topoEurM2 > 0) {
    L.push({ key: 'topografico', label: 'Topográfico', importe: (+p.superficieParcela || 0) * tpl.topoEurM2, tipo: 'fijo' });
  }
  Object.keys(p.tareas).forEach(k => {
    const t = p.tareas[k];
    const meta = tpl.entregables.find(e => e.key === k) ?? { label: k, escala: t.escala };
    const h = horasEntregable(t);
    L.push({ key: k, label: meta.label, horas: h, importe: h * (t.escala ? I3 : 1) * eh, tipo: 'fijo' });
  });
  if (tpl.extrasFijo > 0) {
    L.push({ key: 'extras', label: 'Extras', importe: tpl.extrasFijo * I3, tipo: 'fijo' });
  }
  L.push({ key: 'drs', label: 'DRS', importe: m2Totales(p) * (+p.drsEurM2 || 0), tipo: 'fijo' });
  L.push({ key: 'do', label: 'Dirección de obra', importe: doEurMes(p), tipo: 'mensual', meses: +p.duracionMeses || 0 });
  return L;
}

export function honorariosExtrasTotal(p: Presupuesto): number {
  return p.extras.reduce((s, e) => s + (e.aplica ? (+e.horas || 0) * (+p.eurHora || 0) : 0), 0);
}

export function honorariosDesdePartidas(p: Presupuesto): number {
  const fijo = p.partidas.filter(r => r.tipo === 'fijo' && Math.abs(+(r.importe ?? 0)) > 0.005);
  const mens = p.partidas.filter(r => r.tipo === 'mensual');
  return fijo.reduce((s, r) => s + +(r.importe ?? 0), 0)
       + mens.reduce((s, r) => s + +(r.importe ?? 0) * +(r.meses ?? 0), 0)
       + honorariosExtrasTotal(p);
}

export function honorariosBase(p: Presupuesto): number {
  const L = honorariosLineas(p);
  const fijos = L.filter(l => l.tipo === 'fijo').reduce((s, l) => s + l.importe, 0);
  const doLine = L.find(l => l.tipo === 'mensual');
  const doTot = doLine ? doLine.importe * (doLine.meses || 0) : 0;
  return fijos + doTot + honorariosExtrasTotal(p);
}

export function honorariosConAjuste(p: Presupuesto): number {
  return honorariosBase(p) * (1 + (+p.ajustePct || 0) / 100);
}

// ── Estimación de costes totales (portado de presupuestos.html línea 348) ─────

export interface CostesResult {
  filas: [string, number, boolean][];
  total: number;
  costeObra: number;
  m2: number;
  costeM2: number;
  pem: number;
}

export function costesTotales(p: Presupuesto): CostesResult {
  const c = p.costes, pem = pemTotal(p);
  const ajuste    = pem * c.ajusteMercadoPct / 100;
  const ggbi      = (pem + ajuste) * c.ggbiPct / 100;
  const ivaC      = (pem + ajuste + ggbi) * c.ivaConstrPct / 100;
  const costeObra = pem + ajuste + ggbi + ivaC;
  const honArq    = honorariosDesdePartidas(p) * 1.21;
  const honTec    = (+c.honorariosTecnico || 0) * 1.21;
  const visados   = (+c.visados || 0) * 1.21;
  const licObra   = pem * c.licenciaObraPct / 100;
  const geo       = (+c.geotecnico || 0) * 1.21;
  const primOcup  = pem * c.primeraOcupPct / 100;
  const filas: [string, number, boolean][] = [
    ['Proyecto PEM', pem, false],
    ['Ajuste a precios de mercado (' + c.ajusteMercadoPct + '%)', ajuste, true],
    ['Gastos Generales + Beneficio Industrial (' + c.ggbiPct + '%)', ggbi, true],
    ['IVA de la construcción (' + c.ivaConstrPct + '%)', ivaC, false],
    ['Honorarios arquitectos con IVA del 21% (estimación con ' + (+p.duracionMeses || 0) + ' meses de obra)', honArq, true],
    ['Honorarios arquitectos técnicos con IVA del 21%', honTec, true],
    ['Visados por COA con IVA del 21%', visados, true],
    ['Licencia de obra (' + c.licenciaObraPct + '%)', licObra, true],
    ['Fianzas', +c.fianzas || 0, true],
    ['Estudio geotécnico con IVA del 21%', geo, true],
    ['Licencia de primera ocupación (' + c.primeraOcupPct + '%)', primOcup, true],
    ['Impuestos, Notaría y registro', +c.impuestos || 0, true],
  ];
  const total = filas.reduce((s, f) => s + f[1], 0);
  const m2 = m2Totales(p);
  return { filas, total, costeObra, m2, costeM2: m2 ? total / m2 : 0, pem };
}

export function calcPartidasDef(p: Presupuesto): Partida[] {
  const L = honorariosLineas(p);
  const get = (k: string) => (L.find(l => l.key === k) ?? { importe: 0 }).importe;
  const isNueva = p.plantilla === 'nueva';
  const fases = p.fases?.length >= 2 ? p.fases : ['FASE 1 · PROYECTO', 'FASE 2 · OBRA'];
  const [f1, f2] = fases;

  const antep = get('anteproyecto') + (isNueva ? get('topografico') : get('infografia'));
  const proyBas = isNueva ? get('basico') + get('ejecucion') + get('extras') : get('memoria');
  const doLine = L.find(l => l.key === 'do');

  return [
    { fase: f1, concepto: 'Anteproyecto', importe: antep, tipo: 'fijo' },
    { fase: f1, concepto: 'Infografía 3D y proyecto de interiorismo', importe: 0, tipo: 'incluido' },
    { fase: f1, concepto: 'Proyecto básico y de ejecución', importe: proyBas, tipo: 'fijo' },
    { fase: f1, concepto: 'Gestión de licencia', importe: 0, tipo: 'incluido' },
    { fase: f2, concepto: 'Certificado de inicio de obra y gestiones previas', importe: get('drs') + get('licencia'), tipo: 'fijo' },
    { fase: f2, concepto: 'Dirección de obra', importe: doLine?.importe ?? 0, tipo: 'mensual', meses: +p.duracionMeses || 0 },
    { fase: f2, concepto: 'Dirección de ejecución de obra y coordinación de seguridad', importe: 0, tipo: 'noincluido' },
    { fase: f2, concepto: 'Certificado de fin de obra', importe: get('final'), tipo: 'fijo' },
  ];
}

// ── Factory ───────────────────────────────────────────────────────────────────
export function nuevoNumero(presupuestos: Array<{ numero?: string }>): string {
  const y = new Date().getFullYear();
  const n = presupuestos.filter(p => (p.numero ?? '').includes('PR' + y)).length + 1;
  return 'PR' + y + '-' + String(n).padStart(3, '0');
}

export function nuevoPresupuestoObj(presupuestos: Array<{ numero?: string }>): Presupuesto {
  const caps = capsFor('viviendas');
  return {
    id: 'p_' + Date.now(),
    numero: nuevoNumero(presupuestos),
    fecha: new Date().toISOString().slice(0, 10),
    validezDias: 30,
    estado: 'borrador',
    cliente: { nombre: '', dni: '', tel: '', email: '', dir1: '', dir2: '', dir3: '' },
    clienteRefId: null,
    proyecto: { titulo: '', servicio: 'Arquitectura', lugarMunicipio: '', lugarDir: '', refCatastral: '' },
    familia: 'viviendas', plantilla: 'nueva',
    mo: MO_DEF, mu: MU_DEF,
    flKey: 'A', ftKey: 'aislada', fcKey: 'b', usoKey: '', urbCalle: false, superficieRef: 0,
    pemRows: [{ concepto: 'Vivienda', m2: 0, computaM2: true, modo: 'auto', coef: 1, eurM2: 0 }],
    capitulos: caps.map(c => ({ key: c[0], label: c[1], max: c[2], real: c[2] })),
    eurHora: 21, superficie: 0, superficieParcela: 0, complejidadK: 1,
    duracionMeses: 12, visitasMes: 3, km: 0, horasVisita: 0, drsEurM2: 2.5,
    tareas: plantillaDef('nueva'),
    extras: EXTRAS_LIST.map(l => ({ label: l, aplica: false, horas: 0 })),
    costes: { ajusteMercadoPct: 10, ggbiPct: 19, ivaConstrPct: 10, licenciaObraPct: 5, primeraOcupPct: 1.5, honorariosTecnico: 4500, visados: 442, fianzas: 3000, geotecnico: 800, impuestos: 2000 },
    fases: ['FASE 1 · PROYECTO', 'FASE 2 · OBRA'],
    partidas: [],
    descripcionTrabajo: DESCRIPCION_TRABAJO_DEF,
    observacionesSel: OBSERVACIONES_SEED.map(o => o.id),
    observacionesCustom: [],
    ajustePct: 0,
    notaInterna: '',
  };
}
