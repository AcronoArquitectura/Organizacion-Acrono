// Constantes portadas de contabilidad.html

export const CATEGORIAS_GASTO = [
  { label: 'Nómina Socios',           color: '#3f6fb0' },
  { label: 'Nómina Empleados',        color: '#5b8def' },
  { label: 'Subcontratas Estructura', color: '#b07a1e' },
  { label: 'Subcontratas Otros',      color: '#c98a2e' },
  { label: 'Gastos local Granada',    color: '#2e7d46' },
  { label: 'Gastos local Baza',       color: '#3a9159' },
  { label: 'Fotos/Redes/Web',         color: '#8e44ad' },
  { label: 'Licencias/suscripciones', color: '#16a085' },
  { label: 'Asemas',                  color: '#c0392b' },
  { label: 'Colegio de arquitectos',  color: '#d6a300' },
  { label: 'Asesoría',                color: '#6b6a66' },
];

export const TAGS = [
  { id: 'revisar', label: 'Revisar', color: '#c0392b' },
];

export const IVA_OPTS = [
  { v: 0.21, l: '21%' },
  { v: 0.10, l: '10%' },
  { v: 0.04, l: '4%' },
  { v: 0,    l: 'Sin IVA' },
];

export const IRPF_OPTS = [
  { v: 0,    l: 'Sin IRPF' },
  { v: 0.07, l: '7%' },
  { v: 0.15, l: '15%' },
  { v: 0.19, l: '19%' },
];

export const PIE_LEGAL_DEFAULT = '"Servicio relacionado con inmueble situado en territorio de aplicación del IVA (Península y Baleares), conforme al art. 70.Uno.1º de la Ley 37/1992 del IVA."';

export const EMISOR = {
  nombre:  'Ácrono arquitectura S.C.P',
  dir:     ['C/Antonio Machado,', 'Residencial Al-Andalus B.1.8 Local 8.1', '18800 Baza', 'Granada'],
  nif:     'J19670298',
  tel:     '958 96 53 20',
  correo:  'estudio@acronoarquitectura.com',
  web:     'www.acronoarquitectura.com',
};

export const BANCO = {
  banco:   'Banco Santander',
  cb: '0049', cs: '4398', dc: '05', cuenta: '2610068066',
  iban:    'ES17-0049-4398-0526-1006-8066',
  bic:     'BSCHESMM',
  titular: 'Ácrono arquitectura S.C.P',
};

// Datos históricos para la gráfica anual (años anteriores al app)
export const HIST_ANUAL: Record<number, { ing: number; gas: number }> = {
  2022: { ing: 62000, gas: 38000 },
  2023: { ing: 71000, gas: 41000 },
  2024: { ing: 79000, gas: 45000 },
  2025: { ing: 87400, gas: 34100 },
};
