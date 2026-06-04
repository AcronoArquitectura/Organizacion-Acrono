'use server';

import { getFacturas, saveFacturas } from '@/lib/data/facturas';
import { getGastos, saveGastos } from '@/lib/data/gastos';
import { getProveedores, saveProveedores } from '@/lib/data/proveedores';
import { readAllData, writeAllData } from '@/lib/data/storage';
import type { Factura, FacturaLine, Gasto, Proveedor, Cliente, ProyectoCliente } from '@/lib/types';
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

export async function upsertGasto(g: Gasto, proveedorNif?: string): Promise<{ gastos: Gasto[]; proveedores: Proveedor[] }> {
  const [gastos, proveedores] = await Promise.all([getGastos(), getProveedores()]);

  const idx = gastos.findIndex(x => x.id === g.id);
  if (idx >= 0) gastos[idx] = g; else gastos.push(g);

  // Auto-añadir proveedor si no existe; actualizar NIF si está vacío
  const name = (g.proveedor || '').trim();
  if (name && name !== '—') {
    const existIdx = proveedores.findIndex(p => p.nombre.trim().toLowerCase() === name.toLowerCase());
    if (existIdx >= 0) {
      if (proveedorNif && !proveedores[existIdx].nif) {
        proveedores[existIdx] = { ...proveedores[existIdx], nif: proveedorNif };
        await saveProveedores(proveedores);
      }
    } else {
      proveedores.push({
        id: 'p_' + Date.now(),
        nombre: name,
        nif: proveedorNif ?? '',
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

// Garantiza que un cliente tenga todos los campos requeridos por ClientesFicha/ClientesResumen.
// Necesario porque el JSON histórico de acrono.html puede no tener el campo `proyectos`.
function normalizeCliente(c: unknown): Cliente {
  const raw = c as Record<string, unknown>;
  return {
    id:     String(raw.id     ?? ''),
    nombre: String(raw.nombre ?? ''),
    tipo:   raw.tipo === 'Empresa' ? 'Empresa' : 'Particular',
    estado: (['activo', 'finalizado', 'potencial'].includes(raw.estado as string)
              ? raw.estado : 'activo') as Cliente['estado'],
    desde:  String(raw.desde  ?? ''),
    nif:    String(raw.nif    ?? ''),
    tel:    String(raw.tel    ?? ''),
    email:  String(raw.email  ?? ''),
    direccionCalle:      String(raw.direccionCalle      ?? raw.dir1 ?? ''),
    direccionCPCiudad:  String(raw.direccionCPCiudad  ?? raw.dir2 ?? ''),
    direccionProvincia: String(raw.direccionProvincia ?? raw.dir3 ?? ''),
    nota:   String(raw.nota   ?? ''),
    proyectos: Array.isArray(raw.proyectos)
      ? (raw.proyectos as Record<string, unknown>[]).map((p): ProyectoCliente => ({
          ref:   String(p.ref    ?? ''),
          presup: Number(p.presup ?? 0),
          fact:   Number(p.fact   ?? 0),
          cobr:   Number(p.cobr   ?? 0),
        }))
      : [],
  };
}

// Repara clientes ya existentes en Dropbox (proyectos: undefined → []).
// Usar cuando /clientes da un error de "Cannot read properties of undefined (reading 'reduce')".
export async function repararDatos(): Promise<{ clientes: number }> {
  const allData = await readAllData();
  const repaired = allData.clientes.map(normalizeCliente);
  await writeAllData({ ...allData, clientes: repaired });
  return { clientes: repaired.length };
}

// Normaliza una factura del JSON histórico al formato actual del tipo Factura.
// El JSON de acrono.html usa nombres de campo distintos en algunos casos:
//   clienteNIF       → clienteNif
//   clienteDireccion → clienteDir
//   lines[].concepto → lines[].desc
// También soporta el formato plano antiguo (base/iva/retencion en la raíz, sin lines[]).
function normalizeFactura(f: Factura): Factura {
  const raw = f as unknown as Record<string, unknown>;

  let lines: FacturaLine[] = [];
  if (Array.isArray(raw.lines) && (raw.lines as unknown[]).length > 0) {
    lines = (raw.lines as Record<string, unknown>[]).map(l => ({
      base: Number(l.base) || 0,
      iva:  Number(l.iva)  || 0,
      irpf: Number(l.irpf) || 0,
      desc: String(l.desc ?? l.concepto ?? ''),
    }));
  } else if (raw.base !== undefined) {
    // Formato plano antiguo: base/iva/retencion en la raíz
    lines = [{
      base: Number(raw.base) || 0,
      iva:  Number(raw.iva)  || 0,
      irpf: Number(raw.retencion ?? raw.irpf) || 0,
      desc: '',
    }];
  }

  return {
    id:             String(raw.id             ?? ''),
    numero:         String(raw.numero         ?? ''),
    fecha:          String(raw.fecha          ?? ''),
    vencimiento:    String(raw.vencimiento    ?? ''),
    cliente:        String(raw.cliente        ?? ''),
    clienteNif:              String(raw.clienteNif              ?? raw.clienteNIF      ?? ''),
    clienteDireccionCalle:   String(raw.clienteDireccionCalle   ?? raw.clienteDir     ?? raw.clienteDireccion ?? ''),
    clienteDireccionCPCiudad:   String(raw.clienteDireccionCPCiudad   ?? ''),
    clienteDireccionProvincia:  String(raw.clienteDireccionProvincia  ?? ''),
    refPresupuesto: String(raw.refPresupuesto ?? raw.refPresup       ?? ''),
    pieTexto:       String(raw.pieTexto       ?? ''),
    concepto:       String(raw.concepto       ?? ''),
    estado:         raw.estado === 'cobrada' ? 'cobrada' : 'pendiente',
    nota:           String(raw.nota           ?? ''),
    tags:           Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    lines,
  };
}

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
  // Lectura única — evita la condición de carrera donde cada saveX() hace su propio
  // readAllData() + writeAllData() en paralelo y el último sobrescribe a los anteriores.
  const allData = await readAllData();

  const normalizedFacturas = payload.facturas.map(normalizeFactura);

  const existingFacturaIds   = new Set(allData.contabilidad.facturas.map(x => x.id));
  const existingGastoIds     = new Set(allData.contabilidad.gastos.map(x => x.id));
  const existingProveedorNifs = new Set(allData.contabilidad.proveedores.map(x => x.nif).filter(Boolean));
  const existingClienteNifs  = new Set(allData.clientes.map(x => x.nif).filter(Boolean));

  const newFacturas    = normalizedFacturas.filter(f => f.id && !existingFacturaIds.has(f.id));
  const newGastos      = payload.gastos.filter(g => !existingGastoIds.has(g.id));
  const newProveedores = payload.proveedores.filter(p => !p.nif || !existingProveedorNifs.has(p.nif));
  const newClientes    = payload.clientes.filter(c => !c.nif || !existingClienteNifs.has(c.nif));

  const mergedData = {
    ...allData,
    clientes: [...allData.clientes, ...newClientes].map(normalizeCliente),
    contabilidad: {
      facturas:    [...allData.contabilidad.facturas,    ...newFacturas],
      gastos:      [...allData.contabilidad.gastos,      ...newGastos],
      proveedores: [...allData.contabilidad.proveedores, ...newProveedores],
    },
  };

  // Escritura única — un solo round-trip a Dropbox
  await writeAllData(mergedData);

  return {
    facturas:    mergedData.contabilidad.facturas,
    gastos:      mergedData.contabilidad.gastos,
    proveedores: mergedData.contabilidad.proveedores,
    added: {
      facturas:    newFacturas.length,
      gastos:      newGastos.length,
      proveedores: newProveedores.length,
      clientes:    newClientes.length,
    },
  };
}
