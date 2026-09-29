'use client';

import { useState } from 'react';
import type { Proyecto, Author } from '@/lib/types';
import { addWeeks, fmtDate } from '@/lib/utils/gantt';

interface Props {
  projects: Proyecto[]; // solo archivados
  authors: Author[];
  onEdit: (id: string) => void;
  onReactivar: (id: string) => void;
  isPending: boolean;
}

const th: React.CSSProperties = {
  fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99',
  fontWeight: 500, padding: '8px 12px', borderBottom: '1px solid #e0ddd5', textAlign: 'left', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = { padding: '8px 12px', fontSize: 12 };

export default function ProyectosArchivados({ projects, authors, onEdit, onReactivar, isPending }: Props) {
  const [search, setSearch] = useState('');

  const authorNames = (p: Proyecto) => {
    const ids = new Set<string>();
    if (p.authorId) ids.add(p.authorId);
    (p.phases ?? []).forEach(ph => (ph.authorIds ?? []).forEach(id => ids.add(id)));
    return [...ids].map(id => authors.find(a => a.id === id)?.name ?? '').filter(Boolean).join(', ');
  };

  const q = search.trim().toLowerCase();
  const rows = projects
    .filter(p => !q || [p.code, p.name, authorNames(p)].join(' ').toLowerCase().includes(q))
    .sort((a, b) => (b.archivadoEn ?? '').localeCompare(a.archivadoEn ?? ''));

  return (
    <div style={{ padding: '18px 20px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: '#6b6a66' }}>{projects.length} proyecto{projects.length === 1 ? '' : 's'} archivado{projects.length === 1 ? '' : 's'}</span>
        <div style={{ flex: 1 }} />
        <input placeholder="Buscar código, nombre, autor…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ height: 28, padding: '0 8px', border: '1px solid #c8c4bc', borderRadius: 4, fontSize: 11, fontFamily: 'inherit', outline: 'none', width: 240, background: '#fff' }} />
      </div>
      <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#a09e99', fontSize: 12 }}>
            {projects.length === 0 ? 'No hay proyectos archivados.' : 'Sin resultados.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f4f0' }}>
                <th style={th}>Código</th>
                <th style={th}>Nombre</th>
                <th style={th}>Inicio</th>
                <th style={th}>Fin</th>
                <th style={th}>Autores</th>
                <th style={th}>Archivado</th>
                <th style={{ ...th, width: 1 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map(p => {
                const start = new Date(p.startDate);
                const totalWeeks = (p.phases ?? []).reduce((s, ph) => s + (ph.weeks || 0), 0);
                return (
                  <tr key={p.id} onClick={() => onEdit(p.id)}
                    style={{ borderBottom: '1px solid #f0eee9', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#faf9f6')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, color: '#6b6a66' }}>{p.code}</td>
                    <td style={{ ...td, fontWeight: 500 }}>{p.name}</td>
                    <td style={td}>{fmtDate(start)}</td>
                    <td style={td}>{fmtDate(addWeeks(start, totalWeeks))}</td>
                    <td style={{ ...td, color: '#6b6a66' }}>{authorNames(p) || '—'}</td>
                    <td style={td}>{p.archivadoEn ? new Date(p.archivadoEn).toLocaleDateString('es-ES') : ''}</td>
                    <td style={td} onClick={e => e.stopPropagation()}>
                      <button onClick={() => onReactivar(p.id)} disabled={isPending}
                        style={{ height: 26, padding: '0 10px', borderRadius: 4, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}>
                        Reactivar
                      </button>
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
