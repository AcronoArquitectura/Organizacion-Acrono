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

// ── Solicitudes (intake Jotform) ──────────────────────────────────────────────

export interface EstanciaSolicitud {
  concepto: string;
  m2Util: number;       // metros cuadrados útiles (editables por el usuario)
  coef: number;         // coeficiente sobre Mc para pemRows (1.0=vivienda, 0.8=compl, 0.6=garaje, 0.5=ext)
  calidad: 'vivienda' | 'menor' | 'exterior'; // clasificación simplificada del formulario
  esPiscina: boolean;   // si true → modo manual en el presupuesto; usa eurM2Piscina
  eurM2Piscina: number; // €/m² fijo cuando esPiscina=true
}

export interface Solicitud {
  id: string;                  // 'sol_' + timestamp
  fechaRecepcion: string;      // ISO 8601
  estado: 'nueva' | 'revisada' | 'convertida' | 'descartada';
  presupuestoId: string | null;

  // Contacto
  nombre: string;
  email: string;
  telefono: string;
  tipo_cliente: string;

  // Proyecto
  tipo_proyecto: string;
  municipio_provincia: string;  // derivado de solar_municipio o local_municipio
  referencia_catastral: string; // derivado de solar_refCatastral o local_refCatastral

  // Datos constructivos del formulario
  m2_solar: number;             // derivado de solar_superficie
  n_plantas: number;
  n_dormitorios: number;
  n_banos: number;
  n_aseos: number;
  cocina: string;
  despacho: boolean;
  lavadero: boolean;
  despensa: boolean;
  garaje: boolean;
  n_coches: number;
  trastero: boolean;
  piscina: boolean;
  piscina_largo: number;
  piscina_ancho: number;
  porche: boolean;

  // Contexto económico
  presupuesto_cliente: number;
  plazo: string;                // = plazo_inicio_proyecto (backward compat)

  // Notas libres
  notas_libres: string;

  // URLs de archivos adjuntos subidos en el formulario
  documentacion: string[];

  // Estancias propuestas (generadas automáticamente, editables en el editor)
  estancias: EstanciaSolicitud[];

  // Parámetros COAG globales (precargados desde tipo_proyecto, editables en el editor)
  familia: 'viviendas' | 'otros' | 'urbanizacion';
  plantilla: 'nueva' | 'reforma';
  flKey: 'A' | 'B';
  ftKey: 'aislada' | 'adosada' | 'medianeras' | 'plurifamiliar';
  fcKey: 'a' | 'b' | 'c' | 'd';
  usoKey: string;
  urbCalle: boolean;
  mo: number;
  mu: number;
  complejidadK: number;

  // ── Campos ampliados (formulario actualizado) ──────────────────────────────
  como_nos_conocio?: string;
  plazo_inicio_proyecto?: string;  // q30 — cuándo quiere iniciar el proyecto
  plazo_inicio_obra?: string;      // q47 — cuándo quiere iniciar la obra
  quiere_sotano?: boolean;

  // Localización solar/parcela (Obra nueva · Reforma · Hotel · Equipamiento)
  solar_direccion?: string;
  solar_municipio?: string;
  solar_refCatastral?: string;
  solar_superficie?: number;

  // Localización local (Local · Clínica · Restauración)
  local_direccion?: string;
  local_municipio?: string;
  local_refCatastral?: string;
  local_superficie?: number;

  // Bloque reforma
  ref_sup_vivienda_actual?: number;
  ref_sup_garaje_trastero?: number;
  ref_sup_piscina?: number;
  ref_sup_porche?: number;
  ref_sup_ampliacion_estimada?: number;

  // Hotel / Equipamiento público
  descripcion_necesidades?: string;
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
