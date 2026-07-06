'use client';

import { useState, useTransition, useEffect } from 'react';
import type { Presupuesto, Cliente } from '@/lib/types';
import { upsertPresupuesto, deletePresupuesto, convertirClienteDesdePresupuesto } from '@/lib/actions/presupuestos';
import { nuevoPresupuestoObj } from '@/lib/utils/coag';
import PresupuestosList from './PresupuestosList';
import PresupuestoEditor from './PresupuestoEditor';

export type ConvertResult = { ok: boolean; msg: string; clienteId?: string };

interface Props {
  initialPresupuestos: Presupuesto[];
  clientes: Cliente[];
  initialClienteNif?: string;
  initialPresupuestoId?: string;
}

export default function PresupuestosView({ initialPresupuestos, clientes: initialClientes, initialClienteNif, initialPresupuestoId }: Props) {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>(initialPresupuestos);
  const [clientesState, setClientesState] = useState<Cliente[]>(initialClientes);
  const [editing, setEditing] = useState<Presupuesto | null>(null);
  const [isPending, startTransition] = useTransition();

  const isNew = editing ? !presupuestos.find(p => p.id === editing.id) : false;

  useEffect(() => {
    if (initialPresupuestoId) {
      const p = initialPresupuestos.find(x => x.id === initialPresupuestoId);
      if (p) { setEditing(JSON.parse(JSON.stringify(p))); return; }
    }
    if (!initialClienteNif) return;
    const c = clientesState.find(cl => cl.nif === initialClienteNif);
    if (!c) return;
    const nuevo = nuevoPresupuestoObj(initialPresupuestos);
    setEditing({
      ...nuevo,
      cliente: {
        nombre: c.nombre,
        dni:    c.nif,
        tel:    c.tel,
        email:  c.email,
        dir1:   c.direccionCalle,
        dir2:   c.direccionCPCiudad,
        dir3:   c.direccionProvincia,
      },
      clienteRefId: c.id,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openNew() {
    setEditing(nuevoPresupuestoObj(presupuestos));
  }

  function openEdit(p: Presupuesto) {
    setEditing(JSON.parse(JSON.stringify(p)));
  }

  function handleSave(p: Presupuesto) {
    startTransition(async () => {
      const updated = await upsertPresupuesto(p);
      setPresupuestos(updated);
      setEditing(null);
    });
  }

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar este presupuesto?')) return;
    startTransition(async () => {
      const updated = await deletePresupuesto(id);
      setPresupuestos(updated);
      setEditing(null);
    });
  }

  function handleConvertirCliente(p: Presupuesto, onResult: (r: ConvertResult) => void) {
    // Fast client-side check for empty NIF only — dedup happens server-side with fresh data
    if (!(p.cliente.dni || '').trim()) {
      onResult({ ok: false, msg: 'Añade el NIF/DNI del cliente antes de convertir.' });
      return;
    }
    startTransition(async () => {
      try {
        const result = await convertirClienteDesdePresupuesto(p);
        if (result.updatedClientes) setClientesState(result.updatedClientes);
        if (result.updatedPresupuestos) setPresupuestos(result.updatedPresupuestos);
        onResult({ ok: result.ok, msg: result.msg, clienteId: result.clienteId });
      } catch {
        onResult({ ok: false, msg: 'Error al guardar. Inténtalo de nuevo.' });
      }
    });
  }

  function handleDuplicate(p: Presupuesto) {
    const copia: Presupuesto = {
      ...p,
      id: 'pr_' + Date.now(),
      numero: p.numero + ' (copia)',
      estado: 'borrador',
      fecha: new Date().toISOString().slice(0, 10),
    };
    startTransition(async () => {
      const updated = await upsertPresupuesto(copia);
      setPresupuestos(updated);
    });
  }

  if (editing) {
    return (
      <PresupuestoEditor
        presupuesto={editing}
        clientes={clientesState}
        isNew={isNew}
        onSave={handleSave}
        onDelete={handleDelete}
        onCancel={() => setEditing(null)}
        onConvertirCliente={handleConvertirCliente}
        isPending={isPending}
      />
    );
  }

  return (
    <PresupuestosList
      presupuestos={presupuestos}
      onNew={openNew}
      onEdit={openEdit}
      onDelete={handleDelete}
      onDuplicate={handleDuplicate}
      isPending={isPending}
    />
  );
}
