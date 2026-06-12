'use client';

import { useState } from 'react';
import type { Presupuesto } from '@/lib/types';
import { honorariosBase } from '@/lib/utils/coag';
import { openPresupuestoPDF } from './presupuestoPDF';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const ESTADO_BADGE: Record<string, { color: string; bg: string; border: string }> = {
  borrador:  { color: '#6b6a66', bg: '#f5f4f0', border: '#c8c4bc' },
  enviado:   { color: '#3f6fb0', bg: '#e8eef7', border: '#a8c0e0' },
  aceptado:  { color: '#2e7d46', bg: '#e8f3ec', border: '#bfe0cb' },
  rechazado: { color: '#c0392b', bg: '#fdecea', border: '#e3b4ae' },
};

type SortKey = 'fecha' | 'cliente' | 'honorarios' | 'estado';

interface Props {
  presupuestos: Presupuesto[];
  onNew: () => void;
  onEdit: (p: Presupuesto) => void;
  onDelete: (id: string) => void;
  onDuplicate: (p: Presupuesto) => void;
  isPending: boolean;
}

export default function PresupuestosList({ presupuestos, onNew, onEdit, onDelete, onDuplicate, isPending }: Props) {
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('fecha');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  }

  const filtered = presupuestos.filter(p => {
    if (filter && p.estado !== filter) return false;
    const q = search.toLowerCase();
    if (q) {
      const hay = [p.numero, p.cliente.nombre, p.proyecto.titulo].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if      (sortKey === 'fecha')       cmp = a.fecha.localeCompare(b.fecha);
    else if (sortKey === 'cliente')     cmp = (a.cliente.nombre || '').localeCompare(b.cliente.nombre || '');
    else if (sortKey === 'honorarios')  cmp = honorariosBase(a) - honorariosBase(b);
    else if (sortKey === 'estado')      cmp = a.estado.localeCompare(b.estado);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const btnSt = (active: boolean): React.CSSProperties => ({
    height: 26, padding: '0 12px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit',
    cursor: 'pointer', border: '1px solid', transition: 'background .12s',
    background: active ? '#333' : '#fff', color: active ? '#fff' : '#6b6a66',
    borderColor: active ? '#333' : '#c8c4bc',
  });

  const baseTh: React.CSSProperties = {
    fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase',
    fontWeight: 500, padding: '9px 12px', borderBottom: '1px solid #e0ddd5',
    whiteSpace: 'nowrap', userSelect: 'none',
  };

  function SortTh({ label, sk, align }: { label: string; sk?: SortKey; align?: 'left' | 'right' }) {
    const active = sk && sortKey === sk;
    return (
      <th
        onClick={sk ? () => toggleSort(sk) : undefined}
        style={{
          ...baseTh,
          textAlign: align ?? 'left',
          cursor: sk ? 'pointer' : 'default',
          color: active ? '#444' : '#a09e99',
        }}
      >
        {label}
        {active && <span style={{ marginLeft: 3, fontSize: 9 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </th>
    );
  }

  return (
    <div style={{ padding: '18px 20px', maxWidth: 1340 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Presupuestos</h1>
        <button onClick={onNew} disabled={isPending}
          style={{ height: 30, padding: '0 14px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', background: '#333', color: '#fff', border: 'none' }}>
          + Nuevo presupuesto
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['','Todos'],['borrador','Borrador'],['enviado','Enviado'],['aceptado','Aceptado'],['rechazado','Rechazado']].map(([v, l]) => (
          <button key={v} style={btnSt(filter === v)} onClick={() => setFilter(v)}>{l}</button>
        ))}
        <div style={{ flex: 1 }} />
        <input placeholder="Buscar nº, cliente, proyecto…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ height: 30, padding: '0 8px', border: '1px solid #c8c4bc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', width: 240 }} />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, overflow: 'hidden' }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#a09e99', fontSize: 12 }}>
            {presupuestos.length === 0 ? 'Aún no hay presupuestos. Haz clic en "+ Nuevo presupuesto".' : 'Sin resultados.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f4f0' }}>
                <SortTh label="Nº" />
                <SortTh label="Fecha" sk="fecha" />
                <SortTh label="Cliente" sk="cliente" />
                <SortTh label="Proyecto" />
                <SortTh label="Honorarios s/IVA" sk="honorarios" align="right" />
                <SortTh label="Estado" sk="estado" />
                <th style={{ ...baseTh, width: 1 }} />
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => {
                const badge = ESTADO_BADGE[p.estado] ?? ESTADO_BADGE.borrador;
                const hon = honorariosBase(p);
                return (
                  <tr key={p.id} onClick={() => onEdit(p)}
                    style={{ borderBottom: '1px solid #f0eee9', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#faf9f6')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 500 }}>{p.numero}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12 }}>{p.fecha}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12 }}>{p.cliente.nombre || '—'}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.proyecto.titulo || '—'}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(hon)}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 20, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}>
                        {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => onDuplicate(p)} disabled={isPending}
                          style={{ height: 26, padding: '0 10px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}>
                          Duplicar
                        </button>
                        <button onClick={() => openPresupuestoPDF(p)}
                          style={{ height: 26, padding: '0 10px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}>
                          PDF
                        </button>
                        <button onClick={() => onDelete(p.id)} disabled={isPending}
                          style={{ height: 26, padding: '0 8px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #e3b4ae', background: 'transparent', color: '#c0392b' }}>
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
