import { readAllData, writeAllData } from './storage';
import type { Cliente } from '@/lib/types';

export async function getClientes(): Promise<Cliente[]> {
  return (await readAllData()).clientes;
}

export async function saveClientes(clientes: Cliente[]): Promise<void> {
  const data = await readAllData();
  await writeAllData({ ...data, clientes });
}
