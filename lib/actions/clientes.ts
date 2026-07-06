'use server';

import { readAllData, writeAllData } from '@/lib/data/storage';
import { normalizarNIF } from '@/lib/utils/nif';
import type { Cliente } from '@/lib/types';

export async function upsertCliente(cliente: Cliente): Promise<Cliente[]> {
  const data = await readAllData();

  const nif = normalizarNIF(cliente.nif);
  if (nif) {
    const dup = data.clientes.find(
      (c) => c.id !== cliente.id && normalizarNIF(c.nif) === nif
    );
    if (dup) throw new Error(`Ya existe un cliente con este NIF: ${dup.nombre}`);
  }

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
