'use server';

import { getFacturas, saveFacturas } from '@/lib/data/facturas';
import { getGastos, saveGastos } from '@/lib/data/gastos';
import { getProveedores, saveProveedores } from '@/lib/data/proveedores';
import { getClientes, saveClientes } from '@/lib/data/clientes';
import type { Factura, Gasto, Proveedor, Cliente } from '@/lib/types';
import { guessCategoria } from './calculos';

// ── Facturas ──────────────────────────────────────────────────────────────────

export async function upsertFactura(f: Factura): Promise<Factura[]> {
  const facturas = await getFacturas();
  const idx = facturas.findIndex(x => x.id === f.id);
  if (idx >= 0) facturas[idx] = f; else facturas.push(f);
  await saveFacturas(facturas);
  return facturas;
}

export async function deleteFactura(id: string): Promise<Factura[]> {
  const facturas = (await getFacturas()).filter(x => x.id !== id);
  await saveFacturas(facturas);
  return facturas;
}

// ── Gastos (auto-crea proveedor si es nuevo) ──────────────────────────────────

export async function upsertGasto(g: Gasto): Promise<{ gastos: Gasto[]; proveedores: Proveedor[] }> {
  const [gastos, proveedores] = await Promise.all([getGastos(), getProveedores()]);

  const idx = gastos.findIndex(x => x.id === g.id);
  if (idx >= 0) gastos[idx] = g; else gastos.push(g);

  // Auto-añadir proveedor si no existe
  const name = (g.proveedor || '').trim();
  if (name && name !== '—') {
    const exists = proveedores.find(p => p.nombre.trim().toLowerCase() === name.toLowerCase());
    if (!exists) {
      proveedores.push({
        id: 'p_' + Date.now(),
        nombre: name,
        nif: '',
        categoria: g.categoria || guessCategoria(g.concepto, name),
        nota: '',
      });
      await saveProveedores(proveedores);
    }
  }

  await saveGastos(gastos);
  return { gastos, proveedores };
}

export async function deleteGasto(id: string): Promise<Gasto[]> {
  const gastos = (await getGastos()).filter(x => x.id !== id);
  await saveGastos(gastos);
  return gastos;
}

// ── Proveedores ───────────────────────────────────────────────────────────────

export async function upsertProveedor(p: Proveedor): Promise<Proveedor[]> {
  const proveedores = await getProveedores();
  const idx = proveedores.findIndex(x => x.id === p.id);
  if (idx >= 0) proveedores[idx] = p; else proveedores.push(p);
  await saveProveedores(proveedores);
  return proveedores;
}

export async function deleteProveedor(id: string): Promise<Proveedor[]> {
  const proveedores = (await getProveedores()).filter(x => x.id !== id);
  await saveProveedores(proveedores);
  return proveedores;
}

// ── Importación de datos históricos ──────────────────────────────────────────

interface ImportPayload {
  facturas: Factura[];
  gastos: Gasto[];
  proveedores: Proveedor[];
  clientes: Cliente[];
}

interface ImportResult {
  facturas: Factura[];
  gastos: Gasto[];
  proveedores: Proveedor[];
  added: { facturas: number; gastos: number; proveedores: number; clientes: number };
}

export async function importarDatos(payload: ImportPayload): Promise<ImportResult> {
  const [existingFacturas, existingGastos, existingProveedores, existingClientes] = await Promise.all([
    getFacturas(),
    getGastos(),
    getProveedores(),
    getClientes(),
  ]);

  const existingFacturaIds   = new Set(existingFacturas.map(x => x.id));
  const existingGastoIds     = new Set(existingGastos.map(x => x.id));
  const existingProveedorIds = new Set(existingProveedores.map(x => x.id));
  // Clientes: deduplicar por NIF (ignorar NIF vacío)
  const existingClienteNifs  = new Set(existingClientes.map(x => x.nif).filter(Boolean));

  const newFacturas    = payload.facturas.filter(f => !existingFacturaIds.has(f.id));
  const newGastos      = payload.gastos.filter(g => !existingGastoIds.has(g.id));
  const newProveedores = payload.proveedores.filter(p => !existingProveedorIds.has(p.id));
  const newClientes    = payload.clientes.filter(c => !c.nif || !existingClienteNifs.has(c.nif));

  const mergedFacturas    = [...existingFacturas,    ...newFacturas];
  const mergedGastos      = [...existingGastos,      ...newGastos];
  const mergedProveedores = [...existingProveedores,  ...newProveedores];
  const mergedClientes    = [...existingClientes,     ...newClientes];

  await Promise.all([
    saveFacturas(mergedFacturas),
    saveGastos(mergedGastos),
    ...(newProveedores.length > 0 ? [saveProveedores(mergedProveedores)] : []),
    ...(newClientes.length > 0    ? [saveClientes(mergedClientes)]       : []),
  ]);

  return {
    facturas:    mergedFacturas,
    gastos:      mergedGastos,
    proveedores: mergedProveedores,
    added: {
      facturas:    newFacturas.length,
      gastos:      newGastos.length,
      proveedores: newProveedores.length,
      clientes:    newClientes.length,
    },
  };
}
