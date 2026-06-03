import { readAllData, writeAllData } from './storage';
import type { Factura } from '@/lib/types';

export async function getFacturas(): Promise<Factura[]> {
  return (await readAllData()).contabilidad.facturas;
}

export async function saveFacturas(facturas: Factura[]): Promise<void> {
  const data = await readAllData();
  await writeAllData({ ...data, contabilidad: { ...data.contabilidad, facturas } });
}
