'use client';

import { useState, useTransition, useEffect } from 'react';
import type { Presupuesto, Cliente } from '@/lib/types';
import { upsertPresupuesto, deletePresupuesto } from '@/lib/actions/presupuestos';
import { nuevoPresupuestoObj } from '@/lib/utils/coag';
import PresupuestosList from './PresupuestosList';
import PresupuestoEditor from './PresupuestoEditor';

interface Props {
  initialPresupuestos: Presupuesto[];
  clientes: Cliente[];
  initialClienteNif?: string;
  initialPresupuestoId?: string;
}

export default function PresupuestosView({ initialPresupuestos, clientes, initialClienteNif, initialPresupuestoId }: Props) {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>(initialPresupuestos);
  const [editing, setEditing] = useState<Presupuesto | null>(null);
  const [isPending, startTransition] = useTransition();

  const isNew = editing ? !presupuestos.find(p => p.id === editing.id) : false;

  useEffect(() => {
    if (initialPresupuestoId) {
      const p = initialPresupuestos.find(x => x.id === initialPresupuestoId);
      if (p) { setEditing(JSON.parse(JSON.stringify(p))); return; }
    }
    if (!initialClienteNif) return;
    const c = clientes.find(cl => cl.nif === initialClienteNif);
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

  if (editing) {
    return (
      <PresupuestoEditor
        presupuesto={editing}
        clientes={clientes}
        isNew={isNew}
        onSave={handleSave}
        onDelete={handleDelete}
        onCancel={() => setEditing(null)}
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
      isPending={isPending}
    />
  );
}
