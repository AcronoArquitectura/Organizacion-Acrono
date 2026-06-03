// Cálculos de contabilidad — portados de contabilidad.html (sección 6 del INVENTARIO)
import type { Factura, Gasto } from '@/lib/types';

export const recBase  = (r: Factura | Gasto) => r.lines.reduce((s, l) => s + (+l.base  || 0), 0);
export const recIVA   = (r: Factura | Gasto) => r.lines.reduce((s, l) => s + (+l.base  || 0) * (+l.iva  || 0), 0);
export const recIRPF  = (r: Factura | Gasto) => r.lines.reduce((s, l) => s + (+l.base  || 0) * (+l.irpf || 0), 0);
export const recTotal = (r: Factura | Gasto) => recBase(r) + recIVA(r) - recIRPF(r);

export const fmt = (n: number) =>
  (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export function trimOf(fecha: string): 'T1' | 'T2' | 'T3' | 'T4' {
  const m = new Date(fecha + 'T00:00:00').getMonth();
  return m < 3 ? 'T1' : m < 6 ? 'T2' : m < 9 ? 'T3' : 'T4';
}

export function yearOf(fecha: string): number {
  return new Date(fecha + 'T00:00:00').getFullYear();
}

export function fmtISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addOneMonth(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDate();
  d.setMonth(d.getMonth() + 1);
  if (d.getDate() < day) d.setDate(0); // p.ej. 31 ene → 28/29 feb
  return fmtISO(d);
}

export function genFacturaNumero(
  iso: string,
  facturas: Array<{ id?: string; numero?: string }>,
  excludeId?: string,
): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let max = 0;
  facturas.forEach(f => {
    if (excludeId && f.id === excludeId) return;
    const m = (f.numero ?? '').match(/^FA(\d{2})\d{2}-(\d+)$/);
    if (m && 2000 + parseInt(m[1], 10) === year) {
      const n = parseInt(m[2], 10);
      if (n > max) max = n;
    }
  });
  return `FA${yy}${mm}-${String(max + 1).padStart(3, '0')}`;
}

export function guessCategoria(concepto: string, proveedor: string): string {
  const t = ((concepto || '') + ' ' + (proveedor || '')).toLowerCase();
  if (/retribuci/.test(t))                                               return 'Nómina Socios';
  if (/n[óo]mina|seguro social/.test(t))                                 return 'Nómina Empleados';
  if (/estructura/.test(t))                                              return 'Subcontratas Estructura';
  if (/\bdrs\b|dris|\bcee\b|visado|libro|nombramient|ingenier/.test(t))  return 'Subcontratas Otros';
  if (/local|alquiler|arrendad|comunidad|limpieza|emasagra|suministr|luz|agua/.test(t)) return 'Gastos local Baza';
  if (/asemas/.test(t))                                                  return 'Asemas';
  if (/coag|colegio/.test(t))                                            return 'Colegio de arquitectos';
  if (/contabilidad|gestor|asesor|salas/.test(t))                        return 'Asesoría';
  if (/foto|redes|web|instagram/.test(t))                                return 'Fotos/Redes/Web';
  if (/licencia|suscrip|software|adobe|autocad|dominio|hosting/.test(t)) return 'Licencias/suscripciones';
  return '';
}

export function allYears(
  facturas: { fecha: string }[],
  gastos: { fecha: string }[],
): number[] {
  const ys = new Set<number>();
  facturas.forEach(f => ys.add(yearOf(f.fecha)));
  gastos.forEach(g => ys.add(yearOf(g.fecha)));
  ys.add(new Date().getFullYear());
  return [...ys].sort((a, b) => b - a);
}

export function catColor(label: string, cats: { label: string; color: string }[]): string {
  return cats.find(c => c.label === label)?.color ?? '#a09e99';
}

export function fechaCorta(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
}
