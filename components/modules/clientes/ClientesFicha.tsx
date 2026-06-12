'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Cliente, Factura, Presupuesto, Proyecto } from '@/lib/types';
import { getCurrentPhase, getPhaseProgress } from '@/lib/utils/phases';
import { honorariosConAjuste, nuevoPresupuestoObj } from '@/lib/utils/coag';
import { esFacturaReal } from '@/lib/utils/facturas';
import { upsertPresupuesto, deletePresupuesto } from '@/lib/actions/presupuestos';
import { upsertFactura, deleteFactura } from '@/components/modules/contabilidad/actions';
import PresupuestoEditor from '@/components/modules/presupuestos/PresupuestoEditor';
import FacturaModal from '@/components/modules/contabilidad/FacturaModal';

interface Props {
  cliente: Cliente;
  orgProyectos: Proyecto[];
  facturas: Factura[];
  presupuestos: Presupuesto[];
  clientes: Cliente[];
  onPresupuestosChange: (list: Presupuesto[]) => void;
  onFacturasChange: (list: Factura[]) => void;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}

const fmt = (n: number) =>
  (n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const BADGE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  activo:     { color: '#2e7d46', bg: '#e8f3ec', border: '#bfe0cb', label: 'Activo' },
  finalizado: { color: '#6b6a66', bg: '#f5f4f0', border: '#c8c4bc', label: 'Finalizado' },
  potencial:  { color: '#b07a1e', bg: '#fbf3e0', border: '#e5c88a', label: 'Potencial' },
};

const ESTADO_PRESUP: Record<string, { label: string; color: string; bg: string }> = {
  borrador:  { label: 'Borrador',  color: '#6b6a66', bg: '#f5f4f0' },
  enviado:   { label: 'Enviado',   color: '#1565c0', bg: '#e3f0fb' },
  aceptado:  { label: 'Aceptado', color: '#2e7d46', bg: '#e8f3ec' },
  rechazado: { label: 'Rechazado', color: '#c0392b', bg: '#fdecea' },
  anulado:   { label: 'Anulado',  color: '#a09e99', bg: '#f5f4f0' },
};

export default function ClientesFicha({
  cliente, orgProyectos, facturas, presupuestos, clientes,
  onPresupuestosChange, onFacturasChange, onEdit, onDelete, isPending,
}: Props) {
  const router = useRouter();
  const [presupPending, startPresupTransition] = useTransition();
  const [facturaPending, startFacturaTransition] = useTransition();

  // ── Modal state ────────────────────────────────────────────────────────────
  const [presupModal, setPresupModal] = useState<{ presup: Presupuesto; isNew: boolean } | null>(null);
  const [facturaModal, setFacturaModal] = useState<{ factura: Factura | null } | null>(null);

  // ── Presupuesto calculations ────────────────────────────────────────────────
  const todosPresupuestos = cliente.nif
    ? presupuestos.filter(p => p.cliente.dni === cliente.nif)
    : [];
  const clientePresupuestos = todosPresupuestos.filter(p => p.estado === 'aceptado');
  const presup = clientePresupuestos.reduce((s, p) => s + honorariosConAjuste(p), 0);

  // ── Factura calculations ────────────────────────────────────────────────────
  const clienteFacturas = cliente.nif
    ? facturas.filter(f => f.clienteNif && f.clienteNif === cliente.nif)
    : [];
  const clienteFacturasReales = clienteFacturas.filter(esFacturaReal);
  const facturaTotal = (f: Factura) =>
    f.lines.reduce((s, l) => { const b = +l.base || 0; return s + b + b * (+l.iva || 0) - b * (+l.irpf || 0); }, 0);
  const fact = clienteFacturasReales.reduce((s, f) => s + facturaTotal(f), 0);
  const cobr = clienteFacturasReales.filter(f => f.estado === 'cobrada').reduce((s, f) => s + facturaTotal(f), 0);
  const pend = clienteFacturasReales.filter(f => f.estado === 'pendiente').reduce((s, f) => s + facturaTotal(f), 0);
  const result = clientePresupuestos.length > 0 ? cobr - pend : Math.max(0, cobr - pend);

  const badge = BADGE[cliente.estado] ?? BADGE.potencial;

  const kpis = [
    { label: 'Presupuestado', value: fmt(presup), color: '#333' },
    { label: 'Facturado',     value: fmt(fact),   color: '#333' },
    { label: 'Cobrado',       value: fmt(cobr),   color: cobr > 0 ? '#2e7d46' : '#333' },
    { label: 'Pendiente',     value: fmt(pend),   color: pend > 0 ? '#b07a1e' : '#333' },
    { label: 'Resultado est.', value: fmt(result), color: result >= 0 ? '#2e7d46' : '#c0392b' },
  ];

  const contact = [
    { k: 'NIF/CIF',   v: cliente.nif },
    { k: 'Teléfono',  v: cliente.tel },
    { k: 'Email',     v: cliente.email },
    { k: 'Dirección', v: [cliente.direccionCalle, cliente.direccionCPCiudad, cliente.direccionProvincia].filter(Boolean).join(', ') },
  ].filter((r) => r.v);

  // ── Presupuesto handlers ───────────────────────────────────────────────────

  function openPresup(p: Presupuesto) {
    setPresupModal({ presup: JSON.parse(JSON.stringify(p)), isNew: false });
  }

  function openNewPresup() {
    const nuevo = nuevoPresupuestoObj(presupuestos);
    setPresupModal({
      presup: {
        ...nuevo,
        cliente: {
          nombre: cliente.nombre,
          dni:    cliente.nif,
          tel:    cliente.tel,
          email:  cliente.email,
          dir1:   cliente.direccionCalle,
          dir2:   cliente.direccionCPCiudad,
          dir3:   cliente.direccionProvincia,
        },
        clienteRefId: cliente.id,
      },
      isNew: true,
    });
  }

  function handlePresupSave(p: Presupuesto) {
    startPresupTransition(async () => {
      const updated = await upsertPresupuesto(p);
      onPresupuestosChange(updated);
      setPresupModal(null);
    });
  }

  function handlePresupDelete(id: string) {
    if (!confirm('¿Eliminar este presupuesto?')) return;
    startPresupTransition(async () => {
      const updated = await deletePresupuesto(id);
      onPresupuestosChange(updated);
      setPresupModal(null);
    });
  }

  function handleDuplicar(p: Presupuesto) {
    const copia: Presupuesto = {
      ...p,
      id: 'pr_' + Date.now(),
      numero: p.numero + ' (copia)',
      estado: 'borrador',
      fecha: new Date().toISOString().slice(0, 10),
    };
    startPresupTransition(async () => {
      const updated = await upsertPresupuesto(copia);
      onPresupuestosChange(updated);
    });
  }

  function handleAnular(p: Presupuesto) {
    if (!confirm(`¿Anular el presupuesto ${p.numero}? Se marcará como anulado y no contará en los cálculos.`)) return;
    startPresupTransition(async () => {
      const updated = await upsertPresupuesto({ ...p, estado: 'anulado' });
      onPresupuestosChange(updated);
    });
  }

  // ── Factura handlers ───────────────────────────────────────────────────────

  function openFactura(f: Factura) {
    setFacturaModal({ factura: f });
  }

  function openNewFactura() {
    setFacturaModal({ factura: null });
  }

  function handleFacturaSave(f: Factura) {
    startFacturaTransition(async () => {
      const updated = await upsertFactura(f);
      onFacturasChange(updated);
      setFacturaModal(null);
    });
  }

  function handleFacturaDelete(id: string) {
    if (!confirm('¿Eliminar esta factura? Esta acción no se puede deshacer.')) return;
    startFacturaTransition(async () => {
      const updated = await deleteFactura(id);
      onFacturasChange(updated);
      setFacturaModal(null);
    });
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 4 }}>{cliente.nombre}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#a09e99' }}>
            <span>{cliente.tipo}</span>
            {cliente.desde && <span>· cliente desde {cliente.desde}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}>
            {badge.label}
          </span>
          <button onClick={onEdit} disabled={isPending}
            style={{ height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}>
            Editar
          </button>
          <button onClick={onDelete} disabled={isPending}
            style={{ height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #e3b4ae', background: 'transparent', color: '#c0392b' }}>
            Eliminar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: k.color, letterSpacing: '-.01em', fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Proyectos de Organización */}
        <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '16px 18px' }}>
          <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 12, fontWeight: 500 }}>
            Proyectos en Organización
          </div>
          {(() => {
            const linked = orgProyectos.filter(p => p.clienteNif && p.clienteNif === cliente.nif);
            if (linked.length === 0) return <p style={{ fontSize: 12, color: '#a09e99' }}>Sin proyectos vinculados. Asócialos desde el módulo de Organización.</p>;
            return linked.map(p => {
              const fase = getCurrentPhase(p);
              const progress = getPhaseProgress(p);
              return (
                <div key={p.id} onClick={() => router.push(`/organizacion?proyectoId=${p.id}`)}
                  style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid #f4f2ed', cursor: 'pointer', borderRadius: 4, padding: '8px 6px 10px', marginLeft: -6, marginRight: -6 }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#faf9f6')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{p.code}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 9px', borderRadius: 20, border: '1px solid #e0ddd5', background: '#f5f4f0', color: '#6b6a66' }}>{fase}</span>
                  </div>
                  {p.name && <div style={{ fontSize: 11, color: '#6b6a66', marginBottom: 5 }}>{p.name}</div>}
                  <div style={{ height: 8, background: '#f5f4f0', border: '1px solid #e0ddd5', borderRadius: 20, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: '#333', borderRadius: 20 }} />
                  </div>
                  <div style={{ textAlign: 'right', marginTop: 4, fontSize: 11, color: '#a09e99' }}>{progress}%</div>
                </div>
              );
            });
          })()}
          <button
            onClick={() => router.push('/organizacion')}
            style={{ height: 28, padding: '0 12px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#6b6a66', marginTop: 4 }}
          >
            Ir a Organización
          </button>
        </div>

        {/* Contacto + Nota */}
        <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '16px 18px' }}>
          <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 12, fontWeight: 500 }}>
            Contacto
          </div>
          {contact.map((row) => (
            <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: '1px solid #f4f2ed', fontSize: 12.5, gap: 14 }}>
              <span style={{ color: '#a09e99', fontSize: 11, flexShrink: 0 }}>{row.k}</span>
              <span style={{ textAlign: 'right', color: '#333' }}>{row.v}</span>
            </div>
          ))}
          {contact.length === 0 && <p style={{ fontSize: 12, color: '#a09e99' }}>Sin datos de contacto.</p>}
          {cliente.nota && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 6 }}>Nota</div>
              <p style={{ fontSize: 12, color: '#6b6a66', lineHeight: 1.5 }}>{cliente.nota}</p>
            </div>
          )}
        </div>
      </div>

      {/* Facturas emitidas */}
      <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '16px 18px', marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#a09e99', fontWeight: 500 }}>
            Facturas emitidas
          </div>
          <button
            onClick={openNewFactura}
            style={{ height: 26, padding: '0 11px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#6b6a66' }}
          >
            + Nueva factura
          </button>
        </div>
        {clienteFacturas.length === 0 ? (
          <p style={{ fontSize: 12, color: '#a09e99' }}>Sin facturas vinculadas.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e0ddd5' }}>
                {['Nº', 'Fecha', 'Estado', 'Total'].map((h, i) => (
                  <th key={h} style={{ fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99', fontWeight: 500, padding: '6px 10px', textAlign: i >= 3 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clienteFacturas.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).map(f => {
                const isProforma = f.tipo === 'proforma';
                const estadoColor = f.estado === 'cobrada'
                  ? { color: '#2e7d46', bg: '#e8f3ec' }
                  : { color: '#b07a1e', bg: '#fbf3e0' };
                return (
                  <tr key={f.id} onClick={() => openFactura(f)}
                    style={{ borderBottom: '1px solid #f4f2ed', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#faf9f6')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '8px 10px', fontVariantNumeric: 'tabular-nums' }}>
                      {f.numero}
                      {isProforma && (
                        <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 8, color: '#c0392b', background: '#fdecea', border: '1px solid #e3b4ae' }}>Proforma</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#6b6a66' }}>{f.fecha}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, color: estadoColor.color, background: estadoColor.bg }}>
                        {f.estado}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {fmt(facturaTotal(f))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Presupuestos vinculados */}
      <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '16px 18px', marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#a09e99', fontWeight: 500 }}>
            Presupuestos
          </div>
          <button
            onClick={openNewPresup}
            style={{ height: 26, padding: '0 11px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#6b6a66' }}
          >
            + Nuevo
          </button>
        </div>
        {todosPresupuestos.length === 0 ? (
          <p style={{ fontSize: 12, color: '#a09e99' }}>Sin presupuestos vinculados.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e0ddd5' }}>
                {['Nº', 'Fecha', 'Estado', 'Honorarios', ''].map((h, i) => (
                  <th key={h + i} style={{ fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99', fontWeight: 500, padding: '6px 10px', textAlign: i >= 3 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {todosPresupuestos.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).map(p => {
                const est = ESTADO_PRESUP[p.estado] ?? ESTADO_PRESUP.borrador;
                const anulado = p.estado === 'anulado';
                return (
                  <tr key={p.id} onClick={() => openPresup(p)}
                    style={{ borderBottom: '1px solid #f4f2ed', opacity: anulado ? 0.6 : 1, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#faf9f6')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '8px 10px', fontVariantNumeric: 'tabular-nums', textDecoration: anulado ? 'line-through' : 'none' }}>{p.numero}</td>
                    <td style={{ padding: '8px 10px', color: '#6b6a66' }}>{p.fecha}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, color: est.color, background: est.bg }}>
                        {est.label}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {anulado ? '—' : fmt(honorariosConAjuste(p))}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={e => { e.stopPropagation(); handleDuplicar(p); }} disabled={presupPending}
                        style={{ height: 24, padding: '0 8px', borderRadius: 5, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#6b6a66', marginRight: 4 }}>
                        Duplicar
                      </button>
                      {!anulado && (
                        <button onClick={e => { e.stopPropagation(); handleAnular(p); }} disabled={presupPending}
                          style={{ height: 24, padding: '0 8px', borderRadius: 5, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #e3b4ae', background: 'transparent', color: '#c0392b' }}>
                          Anular
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Factura modal ─────────────────────────────────────────────────────── */}
      {facturaModal !== null && (
        <FacturaModal
          factura={facturaModal.factura}
          facturas={facturas}
          clientes={clientes}
          presupuestos={presupuestos}
          initialClienteNIF={facturaModal.factura ? undefined : cliente.nif}
          onSave={handleFacturaSave}
          onDelete={handleFacturaDelete}
          onClose={() => setFacturaModal(null)}
          isPending={facturaPending}
        />
      )}

      {/* ── Presupuesto modal ─────────────────────────────────────────────────── */}
      {presupModal !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.5)', overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '24px 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#faf9f5', borderRadius: 10, width: '100%', maxWidth: 1320, alignSelf: 'flex-start', boxShadow: '0 16px 50px rgba(0,0,0,.25)', position: 'relative' }}>
            <button
              onClick={() => setPresupModal(null)}
              style={{ position: 'absolute', top: 14, right: 18, zIndex: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: '#a09e99', lineHeight: 1, padding: 0 }}
              aria-label="Cerrar"
            >×</button>
            <PresupuestoEditor
              presupuesto={presupModal.presup}
              clientes={clientes}
              isNew={presupModal.isNew}
              onSave={handlePresupSave}
              onDelete={handlePresupDelete}
              onCancel={() => setPresupModal(null)}
              isPending={presupPending}
            />
          </div>
        </div>
      )}
    </div>
  );
}
