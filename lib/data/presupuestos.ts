import { readAllData, writeAllData } from './storage';
import type { Presupuesto } from '@/lib/types';

export async function getPresupuestos(): Promise<Presupuesto[]> {
  return (await readAllData()).presupuestos;
}

export async function savePresupuestos(presupuestos: Presupuesto[]): Promise<void> {
  const data = await readAllData();
  await writeAllData({ ...data, presupuestos });
}
