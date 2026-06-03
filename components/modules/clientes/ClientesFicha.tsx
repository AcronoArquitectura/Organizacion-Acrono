'use client';

import { useRouter } from 'next/navigation';
import type { Cliente, Factura, Presupuesto, Proyecto } from '@/lib/types';
import { getCurrentPhase, getPhaseProgress } from '@/lib/utils/phases';
import { honorariosConAjuste } from '@/lib/utils/coag';

interface Props {
  cliente: Cliente;
  orgProyectos: Proyecto[];
  facturas: Factura[];
  presupuestos: Presupuesto[];
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const BADGE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  activo:     { color: '#2e7d46', bg: '#e8f3ec', border: '#bfe0cb', label: 'Activo' },
  finalizado: { color: '#6b6a66', bg: '#f5f4f0', border: '#c8c4bc', label: 'Finalizado' },
  potencial:  { color: '#b07a1e', bg: '#fbf3e0', border: '#e5c88a', label: 'Potencial' },
};

export default function ClientesFicha({ cliente, orgProyectos, facturas, presupuestos, onEdit, onDelete, isPending }: Props) {
  const router = useRouter();

  const clientePresupuestos = cliente.nif
    ? presupuestos.filter(p => p.estado === 'aceptado' && p.cliente.dni === cliente.nif)
    : [];
  const presup = clientePresupuestos.reduce((s, p) => s + honorariosConAjuste(p), 0);

  const clienteFacturas = cliente.nif
    ? facturas.filter(f => f.clienteNif && f.clienteNif === cliente.nif)
    : [];
  const facturaTotal = (f: Factura) =>
    f.lines.reduce((s, l) => { const b = +l.base || 0; return s + b + b * (+l.iva || 0) - b * (+l.irpf || 0); }, 0);
  const fact = clienteFacturas.reduce((s, f) => s + facturaTotal(f), 0);
  const cobr = clienteFacturas.filter(f => f.estado === 'cobrada').reduce((s, f) => s + facturaTotal(f), 0);
  const pend = clienteFacturas.filter(f => f.estado === 'pendiente').reduce((s, f) => s + facturaTotal(f), 0);
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
        {/* Proyectos */}
        <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '16px 18px' }}>
          <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 12, fontWeight: 500 }}>
            Proyectos vinculados
          </div>
          {cliente.proyectos.length === 0 ? (
            <p style={{ fontSize: 12, color: '#a09e99' }}>Sin proyectos vinculados.</p>
          ) : (
            cliente.proyectos.map((pj) => {
              const orgPj = orgProyectos.find((p) => p.code === pj.ref);
              const fase = orgPj ? getCurrentPhase(orgPj) : '—';
              const progress = orgPj ? getPhaseProgress(orgPj) : 0;
              return (
                <div key={pj.ref} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid #f4f2ed' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>{pj.ref}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 9px', borderRadius: 20, border: '1px solid #e0ddd5', background: '#f5f4f0', color: '#6b6a66' }}>
                      {fase}
                    </span>
                  </div>
                  <div style={{ height: 8, background: '#f5f4f0', border: '1px solid #e0ddd5', borderRadius: 20, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: '#333', borderRadius: 20 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: '#a09e99' }}>
                    <span>Presup. {fmt(pj.presup)}</span>
                    <span>{progress}%</span>
                  </div>
                </div>
              );
            })
          )}
          <button
            onClick={() => router.push('/presupuestos')}
            style={{ height: 28, padding: '0 12px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#6b6a66', marginTop: 4 }}
          >
            + Nuevo presupuesto
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
    </div>
  );
}
