'use server';

import { readAllData, writeAllData } from '@/lib/data/storage';
import { normalizarNIF } from '@/lib/utils/nif';
import type { Presupuesto, Cliente } from '@/lib/types';

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

export type ConvertirClienteResult = {
  ok: boolean;
  msg: string;
  clienteId?: string;
  updatedClientes?: Cliente[];
  updatedPresupuestos?: Presupuesto[];
};

// Una sola lectura, dedup fresco, una sola escritura — sin race condition ni stale data.
export async function convertirClienteDesdePresupuesto(
  p: Presupuesto
): Promise<ConvertirClienteResult> {
  const nif = normalizarNIF(p.cliente.dni);
  if (!nif) {
    return { ok: false, msg: 'Añade el NIF/DNI del cliente antes de convertir.' };
  }

  const data = await readAllData();

  const existing = data.clientes.find(c => normalizarNIF(c.nif) === nif);
  if (existing) {
    return { ok: false, msg: `El cliente ya existe: ${existing.nombre}` };
  }

  const newCliente: Cliente = {
    id: 'cli_' + Date.now(),
    nombre: p.cliente.nombre,
    tipo: 'Particular',
    estado: 'potencial',
    desde: new Date().toISOString().slice(0, 7),
    nif: p.cliente.dni,
    tel: p.cliente.tel,
    email: p.cliente.email,
    direccionCalle: p.cliente.dir1,
    direccionCPCiudad: p.cliente.dir2,
    direccionProvincia: p.cliente.dir3,
    nota: '',
    proyectos: [],
  };

  data.clientes.push(newCliente);

  const pUpdated = { ...p, clienteRefId: newCliente.id };
  const idx = data.presupuestos.findIndex(x => x.id === p.id);
  if (idx >= 0) {
    data.presupuestos[idx] = pUpdated;
  } else {
    data.presupuestos.push(pUpdated);
  }

  await writeAllData(data);

  return {
    ok: true,
    msg: `Cliente "${newCliente.nombre}" creado correctamente.`,
    clienteId: newCliente.id,
    updatedClientes: data.clientes,
    updatedPresupuestos: data.presupuestos,
  };
}
