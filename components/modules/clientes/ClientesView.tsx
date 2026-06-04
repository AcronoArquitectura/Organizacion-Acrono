'use client';

import { useState, useTransition } from 'react';
import type { Cliente, Factura, Presupuesto, Proyecto } from '@/lib/types';
import { upsertCliente, deleteCliente } from '@/lib/actions/clientes';
import ClientesSidebar from './ClientesSidebar';
import ClientesFicha from './ClientesFicha';
import ClientesResumen from './ClientesResumen';
import ClienteModal from './ClienteModal';

interface Props {
  initialClientes: Cliente[];
  orgProyectos: Proyecto[];
  initialFacturas: Factura[];
  initialPresupuestos: Presupuesto[];
}

export default function ClientesView({ initialClientes, orgProyectos, initialFacturas, initialPresupuestos }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>(initialClientes);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>(initialPresupuestos);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [isPending, startTransition] = useTransition();

  const selected = clientes.find((c) => c.id === selectedId) ?? null;

  function openNew() {
    setEditingCliente(null);
    setModalOpen(true);
  }

  function openEdit(c: Cliente) {
    setEditingCliente(c);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCliente(null);
  }

  function handleSave(cliente: Cliente) {
    startTransition(async () => {
      const updated = await upsertCliente(cliente);
      setClientes(updated);
      setSelectedId(cliente.id);
      closeModal();
    });
  }

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return;
    startTransition(async () => {
      const updated = await deleteCliente(id);
      setClientes(updated);
      setSelectedId(null);
    });
  }

  return (
    <div style={{ padding: '18px 20px', maxWidth: 1340 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>
        <ClientesSidebar
          clientes={clientes}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNew={openNew}
          isPending={isPending}
        />
        {selected ? (
          <ClientesFicha
            cliente={selected}
            orgProyectos={orgProyectos}
            facturas={initialFacturas}
            presupuestos={presupuestos}
            onPresupuestosChange={setPresupuestos}
            onEdit={() => openEdit(selected)}
            onDelete={() => handleDelete(selected.id)}
            isPending={isPending}
          />
        ) : (
          <ClientesResumen
            clientes={clientes}
            orgProyectos={orgProyectos}
            onNew={openNew}
          />
        )}
      </div>

      {modalOpen && (
        <ClienteModal
          cliente={editingCliente}
          existingClientes={clientes}
          orgProyectos={orgProyectos}
          onSave={handleSave}
          onClose={closeModal}
          isPending={isPending}
        />
      )}
    </div>
  );
}
