import { readAllData, writeAllData } from './storage';
import type { Proveedor } from '@/lib/types';

export async function getProveedores(): Promise<Proveedor[]> {
  return (await readAllData()).contabilidad.proveedores;
}

export async function saveProveedores(proveedores: Proveedor[]): Promise<void> {
  const data = await readAllData();
  await writeAllData({ ...data, contabilidad: { ...data.contabilidad, proveedores } });
}
