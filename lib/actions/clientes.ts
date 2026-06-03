'use server';

import { readAllData, writeAllData } from '@/lib/data/storage';
import type { Cliente } from '@/lib/types';

export async function upsertCliente(cliente: Cliente): Promise<Cliente[]> {
  const data = await readAllData();
  const idx = data.clientes.findIndex((c) => c.id === cliente.id);
  if (idx >= 0) {
    data.clientes[idx] = cliente;
  } else {
    data.clientes.push(cliente);
  }
  await writeAllData(data);
  return data.clientes;
}

export async function deleteCliente(id: string): Promise<Cliente[]> {
  const data = await readAllData();
  data.clientes = data.clientes.filter((c) => c.id !== id);
  await writeAllData(data);
  return data.clientes;
}
