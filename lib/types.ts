// ── Organización ──────────────────────────────────────────────────────────────

export interface Author {
  id: string;
  name: string;
  color: string;
}

export interface Phase {
  key: string;
  label: string;
  abbr: string;
  color: string;
  weeks: number;
  authorIds: string[];
}

export interface Meeting {
  num: number;
  relWeek: number;
  label: string;
  date: string; // 'YYYY-MM-DD'
}

export interface Proyecto {
  id: string;
  code: string;
  name: string;
  startDate: string; // ISO 8601
  authorId: string;
  clienteNif?: string;
  phases: Phase[];
  meetings: Meeting[];
}

export interface ObraPhase {
  key: 'aio' | 'do' | 'cfo';
  weeks: number;
  authorIds: string[];
}

export interface Obra {
  id: string;
  code: string;
  name: string;
  startDate: string; // ISO 8601
  authorId: string;
  phases: ObraPhase[];
}

// ── Clientes ──────────────────────────────────────────────────────────────────

export interface ProyectoCliente {
  ref: string;
  presup: number;
  fact: number;
  cobr: number;
}

export interface Cliente {
  id: string;
  nombre: string;
  tipo: 'Particular' | 'Empresa';
  estado: 'activo' | 'finalizado' | 'potencial';
  desde: string; // 'YYYY-MM'
  nif: string;
  tel: string;
  email: string;
  direccionCalle: string;
  direccionCPCiudad: string;
  direccionProvincia: string;
  nota: string;
  proyectos: ProyectoCliente[];
}

// ── Contabilidad ──────────────────────────────────────────────────────────────

export interface FacturaLine {
  base: number;
  iva: number;   // decimal: 0.21 = 21%
  irpf: number;  // decimal: 0.15 = 15%
  desc?: string;
}

export interface Factura {
  id: string;
  numero: string;       // 'FA2604-028'
  fecha: string;        // 'YYYY-MM-DD'
  vencimiento: string;  // 'YYYY-MM-DD'
  cliente: string;
  clienteNif: string;
  clienteDireccionCalle: string;
  clienteDireccionCPCiudad: string;
  clienteDireccionProvincia: string;
  refPresupuesto: string;
  pieTexto: string;
  concepto: string;
  estado: 'pendiente' | 'cobrada';
  tipo?: 'factura' | 'proforma';
  nota: string;
  tags: string[];
  lines: FacturaLine[];
}

export interface GastoLine {
  base: number;
  iva: number;
  irpf: number;
}

export interface Gasto {
  id: string;
  numero: string;
  fecha: string;    // 'YYYY-MM-DD'
  concepto: string;
  proveedor: string;
  estado: 'pagada' | 'pendiente';
  categoria: string;
  nota: string;
  tags: string[];
  lines: GastoLine[];
}

export interface Proveedor {
  id: string;
  nombre: string;
  nif: string;
  categoria: string;
  nota: string;
}

// ── Presupuestos ──────────────────────────────────────────────────────────────

export interface PemRow {
  concepto: string;
  m2: number;
  computaM2: boolean;
  modo: 'auto' | 'manual';
  coef: number;
  eurM2: number;
}

export interface Capitulo {
  key: string;
  label: string;
  max: number;
  real: number;
}

export interface Tarea {
  escala: boolean;
  sub: { label: string; h: number }[];
}

export interface Extra {
  label: string;
  aplica: boolean;
  horas: number;
}

export interface Partida {
  fase: string;
  concepto: string;
  tipo: 'fijo' | 'mensual' | 'incluido' | 'noincluido' | 'porhoras' | 'opcional';
  importe: number;
  meses?: number;
}

export interface Observacion {
  id: string;
  grupo?: string;
  txt?: string;
  text?: string; // alias legacy
}

export interface Presupuesto {
  id: string;
  numero: string;    // 'PR2026-001'
  fecha: string;     // 'YYYY-MM-DD'
  validezDias: number;
  estado: 'borrador' | 'enviado' | 'aceptado' | 'rechazado' | 'anulado';

  cliente: {
    nombre: string; dni: string; tel: string; email: string;
    dir1: string; dir2: string; dir3: string;
  };
  clienteRefId: string | null;

  proyecto: {
    titulo: string;
    servicio: string;
    lugarMunicipio: string;
    lugarDir: string;
    refCatastral: string;
  };

  familia: 'viviendas' | 'otros' | 'urbanizacion';
  plantilla: 'nueva' | 'reforma';
  mo: number;
  mu: number;
  flKey: 'A' | 'B';
  ftKey: 'aislada' | 'adosada' | 'medianeras' | 'plurifamiliar';
  fcKey: 'a' | 'b' | 'c' | 'd';
  usoKey: string;
  urbCalle: boolean;
  superficieRef: number;
  pemRows: PemRow[];
  capitulos: Capitulo[];

  eurHora: number;
  superficie: number;
  superficieParcela: number;
  complejidadK: number;
  duracionMeses: number;
  visitasMes: number;
  km: number;
  horasVisita: number;
  drsEurM2: number;
  tareas: Record<string, Tarea>;
  extras: Extra[];

  costes: {
    ajusteMercadoPct: number;
    ggbiPct: number;
    ivaConstrPct: number;
    licenciaObraPct: number;
    primeraOcupPct: number;
    honorariosTecnico: number;
    visados: number;
    fianzas: number;
    geotecnico: number;
    impuestos: number;
  };

  fases: string[];
  partidas: Partida[];
  descripcionTrabajo: string;
  observacionesSel: string[];
  observacionesCustom: Observacion[];
  ajustePct: number;
  notaInterna: string;
}

// ── Root data shape ───────────────────────────────────────────────────────────

export interface AcronoData {
  org: {
    projects: Proyecto[];
    obras: Obra[];
    authors: Author[];
  };
  clientes: Cliente[];
  presupuestos: Presupuesto[];
  contabilidad: {
    facturas: Factura[];
    gastos: Gasto[];
    proveedores: Proveedor[];
    saldoBase?: { importe: number; fecha: string };
  };
}
