'use client';

import { useState } from 'react';
import type { Presupuesto } from '@/lib/types';
import { honorariosBase, calcPartidasDef } from '@/lib/utils/coag';
import { openPresupuestoPDF } from './presupuestoPDF';
import { openProformaFromPresupuesto } from '@/components/modules/contabilidad/facturaPDF';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const ESTADO_BADGE: Record<string, { color: string; bg: string; border: string }> = {
  borrador:  { color: '#6b6a66', bg: '#f5f4f0', border: '#c8c4bc' },
  enviado:   { color: '#3f6fb0', bg: '#e8eef7', border: '#a8c0e0' },
  aceptado:  { color: '#2e7d46', bg: '#e8f3ec', border: '#bfe0cb' },
  rechazado: { color: '#c0392b', bg: '#fdecea', border: '#e3b4ae' },
};

interface Props {
  presupuestos: Presupuesto[];
  onNew: () => void;
  onEdit: (p: Presupuesto) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}

export default function PresupuestosList({ presupuestos, onNew, onEdit, onDelete, isPending }: Props) {
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  const filtered = presupuestos.filter(p => {
    if (filter && p.estado !== filter) return false;
    const q = search.toLowerCase();
    if (q) {
      const hay = [p.numero, p.cliente.nombre, p.proyecto.titulo].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const btnSt = (active: boolean): React.CSSProperties => ({
    height: 26, padding: '0 12px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit',
    cursor: 'pointer', border: '1px solid', transition: 'background .12s',
    background: active ? '#333' : '#fff', color: active ? '#fff' : '#6b6a66',
    borderColor: active ? '#333' : '#c8c4bc',
  });

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
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#a09e99', fontSize: 12 }}>
            {presupuestos.length === 0 ? 'Aún no hay presupuestos. Haz clic en "+ Nuevo presupuesto".' : 'Sin resultados.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f4f0' }}>
                {['Nº','Fecha','Cliente','Proyecto','Honorarios s/IVA','Estado',''].map(h => (
                  <th key={h} style={{ fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99', fontWeight: 500, textAlign: h === 'Honorarios s/IVA' ? 'right' : 'left', padding: '9px 12px', borderBottom: '1px solid #e0ddd5' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
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
                        <button onClick={() => openPresupuestoPDF(p)}
                          style={{ height: 26, padding: '0 10px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}>
                          PDF
                        </button>
                        <button onClick={() => openProformaFromPresupuesto(p)}
                          style={{ height: 26, padding: '0 10px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #e3b4ae', background: '#fff', color: '#c0392b' }}>
                          Proforma
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
