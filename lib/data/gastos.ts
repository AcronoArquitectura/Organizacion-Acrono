import { readAllData, writeAllData } from './storage';
import type { Gasto } from '@/lib/types';

export async function getGastos(): Promise<Gasto[]> {
  return (await readAllData()).contabilidad.gastos;
}

export async function saveGastos(gastos: Gasto[]): Promise<void> {
  const data = await readAllData();
  await writeAllData({ ...data, contabilidad: { ...data.contabilidad, gastos } });
}
