'use client';

import { useState } from 'react';
import type { Cliente } from '@/lib/types';

interface Props {
  clientes: Cliente[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onNew: () => void;
  isPending: boolean;
}

type Filter = 'todos' | 'activos' | 'finalizados';

const BADGE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  activo:     { color: '#2e7d46', bg: '#e8f3ec', border: '#bfe0cb', label: 'Activo' },
  finalizado: { color: '#6b6a66', bg: '#f5f4f0', border: '#c8c4bc', label: 'Finalizado' },
  potencial:  { color: '#b07a1e', bg: '#fbf3e0', border: '#e5c88a', label: 'Potencial' },
};

export default function ClientesSidebar({ clientes, selectedId, onSelect, onNew, isPending }: Props) {
  const [filter, setFilter] = useState<Filter>('todos');
  const [search, setSearch] = useState('');

  const filtered = clientes.filter((c) => {
    if (filter === 'activos' && c.estado !== 'activo') return false;
    if (filter === 'finalizados' && c.estado !== 'finalizado') return false;
    if (search && !c.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filterBtn = (f: Filter): React.CSSProperties => ({
    flex: 1, height: 26, padding: '0 6px', borderRadius: 6, fontSize: 11,
    fontFamily: 'inherit', cursor: 'pointer', border: '1px solid',
    background: filter === f ? '#333' : '#fff',
    color: filter === f ? '#fff' : '#6b6a66',
    borderColor: filter === f ? '#333' : '#c8c4bc',
    transition: 'background .12s',
  });

  return (
    <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #e0ddd5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a09e99', fontWeight: 500 }}>
          Clientes
        </span>
        <button
          onClick={onNew}
          disabled={isPending}
          style={{ height: 26, padding: '0 10px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', background: '#333', color: '#fff', border: 'none' }}
        >
          + Nuevo
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 14px 8px' }}>
        <input
          type="text"
          placeholder="Buscar cliente…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', height: 30, padding: '0 8px', border: '1px solid #c8c4bc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#333' }}
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, padding: '0 14px 12px' }}>
        {(['todos', 'activos', 'finalizados'] as Filter[]).map((f) => (
          <button key={f} style={filterBtn(f)} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 14px', color: '#a09e99', fontSize: 12 }}>
            {clientes.length === 0 ? 'Aún no hay clientes.' : 'Sin resultados.'}
          </div>
        ) : (
          filtered.map((c) => {
            const badge = BADGE[c.estado] ?? BADGE.potencial;
            const isActive = c.id === selectedId;
            return (
              <div
                key={c.id}
                onClick={() => onSelect(isActive ? null : c.id)}
                style={{
                  padding: '11px 14px', borderBottom: '1px solid #f0eee9', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: isActive ? '#f3f1ec' : 'transparent',
                  boxShadow: isActive ? 'inset 3px 0 0 #333' : 'none',
                  transition: 'background .12s',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.nombre}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#a09e99' }}>{c.tipo}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, whiteSpace: 'nowrap' }}>
                    {badge.label}
                  </span>
                  {c.proyectos.length > 0 && (
                    <span style={{ fontSize: 10, color: '#a09e99' }}>{c.proyectos.length} proy.</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
