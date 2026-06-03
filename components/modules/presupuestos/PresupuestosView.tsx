'use client';

import { useState, useTransition } from 'react';
import type { Presupuesto, Cliente } from '@/lib/types';
import { upsertPresupuesto, deletePresupuesto } from '@/lib/actions/presupuestos';
import { nuevoPresupuestoObj } from '@/lib/utils/coag';
import PresupuestosList from './PresupuestosList';
import PresupuestoEditor from './PresupuestoEditor';

interface Props {
  initialPresupuestos: Presupuesto[];
  clientes: Cliente[];
}

export default function PresupuestosView({ initialPresupuestos, clientes }: Props) {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>(initialPresupuestos);
  const [editing, setEditing] = useState<Presupuesto | null>(null);
  const [isPending, startTransition] = useTransition();

  const isNew = editing ? !presupuestos.find(p => p.id === editing.id) : false;

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
