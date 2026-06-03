'use server';

import { readAllData, writeAllData } from '@/lib/data/storage';
import type { Presupuesto } from '@/lib/types';

export async function upsertPresupuesto(p: Presupuesto): Promise<Presupuesto[]> {
  const data = await readAllData();
  const idx = data.presupuestos.findIndex(x => x.id === p.id);
  if (idx >= 0) {
    data.presupuestos[idx] = p;
  } else {
    data.presupuestos.push(p);
  }
  await writeAllData(data);
  return data.presupuestos;
}

export async function deletePresupuesto(id: string): Promise<Presupuesto[]> {
  const data = await readAllData();
  data.presupuestos = data.presupuestos.filter(x => x.id !== id);
  await writeAllData(data);
  return data.presupuestos;
}
