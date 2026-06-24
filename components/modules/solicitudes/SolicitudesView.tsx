'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Solicitud } from '@/lib/types';
import { deleteSolicitud } from '@/lib/actions/solicitudes';

const ESTADO_LABEL: Record<Solicitud['estado'], string> = {
  nueva:      'Nueva',
  revisada:   'Revisada',
  convertida: 'Convertida',
  descartada: 'Descartada',
};

const ESTADO_COLOR: Record<Solicitud['estado'], string> = {
  nueva:      '#b07a1e',
  revisada:   '#5f8a6e',
  convertida: '#a09e99',
  descartada: '#c89898',
};

function fechaCorta(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return iso; }
}

interface Props {
  initialSolicitudes: Solicitud[];
}

export default function SolicitudesView({ initialSolicitudes }: Props) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>(initialSolicitudes);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [filtroEstado, setFiltroEstado] = useState<'todas' | Solicitud['estado']>('todas');
  const [busqueda, setBusqueda] = useState('');

  const filtradas = solicitudes
    .filter(s => filtroEstado === 'todas' || s.estado === filtroEstado)
    .filter(s => {
      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase();
      return s.nombre.toLowerCase().includes(q)
        || s.municipio_provincia.toLowerCase().includes(q)
        || s.tipo_proyecto.toLowerCase().includes(q)
        || s.email.toLowerCase().includes(q);
    })
    .sort((a, b) => b.fechaRecepcion.localeCompare(a.fechaRecepcion));

  const nuevas = solicitudes.filter(s => s.estado === 'nueva').length;

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta solicitud?')) return;
    startTransition(async () => {
      const updated = await deleteSolicitud(id);
      setSolicitudes(updated);
    });
  }

  return (
    <div style={{ padding: '18px 20px', maxWidth: 960, margin: '0 auto' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: '#333', margin: 0 }}>
          Solicitudes Jotform
        </h1>
        {nuevas > 0 && (
          <span style={{ background: '#b07a1e', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
            {nuevas} nueva{nuevas !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar nombre, municipio, tipo…"
          style={{ height: 30, padding: '0 10px', border: '1px solid #c8c4bc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', minWidth: 220 }}
        />
        {(['todas', 'nueva', 'revisada', 'convertida', 'descartada'] as const).map(e => (
          <button
            key={e}
            onClick={() => setFiltroEstado(e)}
            style={{
              height: 30, padding: '0 12px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit',
              cursor: 'pointer', border: '1px solid',
              background: filtroEstado === e ? '#333' : '#fff',
              color: filtroEstado === e ? '#fff' : '#6b6a66',
              borderColor: filtroEstado === e ? '#333' : '#c8c4bc',
            }}
          >
            {e === 'todas' ? 'Todas' : ESTADO_LABEL[e]}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#a09e99', fontSize: 13 }}>
          {solicitudes.length === 0
            ? 'Aún no hay solicitudes. Las nuevas entradas de Jotform aparecerán aquí.'
            : 'No hay solicitudes con los filtros aplicados.'}
        </div>
      ) : (
        <div style={{ border: '1px solid #e0ddd5', borderRadius: 6, overflow: 'hidden' }}>
          {/* Cabecera tabla */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 160px 90px 90px', background: '#f5f4f0', borderBottom: '1px solid #e0ddd5', padding: '8px 14px', gap: 10 }}>
            {['Cliente', 'Tipo proyecto', 'Municipio', 'Fecha', 'Estado'].map(h => (
              <span key={h} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: '#a09e99', fontWeight: 500 }}>{h}</span>
            ))}
          </div>

          {filtradas.map((sol, i) => (
            <div
              key={sol.id}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 140px 160px 90px 90px',
                padding: '10px 14px', gap: 10, alignItems: 'center',
                borderBottom: i < filtradas.length - 1 ? '1px solid #f0ede8' : 'none',
                background: sol.estado === 'nueva' ? '#fffdf7' : '#fff',
                cursor: 'pointer',
                transition: 'background .1s',
              }}
              onClick={() => router.push(`/solicitudes/${sol.id}`)}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f4f0')}
              onMouseLeave={e => (e.currentTarget.style.background = sol.estado === 'nueva' ? '#fffdf7' : '#fff')}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{sol.nombre || '—'}</div>
                <div style={{ fontSize: 11, color: '#a09e99', marginTop: 1 }}>{sol.email}</div>
              </div>
              <div style={{ fontSize: 12, color: '#6b6a66' }}>{sol.tipo_proyecto || '—'}</div>
              <div style={{ fontSize: 12, color: '#6b6a66' }}>{sol.municipio_provincia || '—'}</div>
              <div style={{ fontSize: 11, color: '#a09e99' }}>{fechaCorta(sol.fechaRecepcion)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, borderRadius: 8,
                  padding: '2px 7px', letterSpacing: '.04em',
                  background: ESTADO_COLOR[sol.estado] + '22',
                  color: ESTADO_COLOR[sol.estado],
                  border: `1px solid ${ESTADO_COLOR[sol.estado]}44`,
                }}>
                  {ESTADO_LABEL[sol.estado]}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(sol.id); }}
                  disabled={isPending}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#c8c4bc', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
                  title="Eliminar solicitud"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ayuda configuración */}
      <div style={{ marginTop: 20, padding: '12px 14px', background: '#f5f4f0', borderRadius: 6, fontSize: 11, color: '#6b6a66', lineHeight: 1.7 }}>
        <b>Webhook Jotform:</b> configura la URL{' '}
        <code style={{ background: '#e8e4de', padding: '1px 5px', borderRadius: 3 }}>
          /api/webhooks/jotform/intake?token=TU_TOKEN
        </code>{' '}
        en la configuración del formulario.
        Env vars necesarias en Vercel:{' '}
        <code style={{ background: '#e8e4de', padding: '1px 5px', borderRadius: 3 }}>JOTFORM_WEBHOOK_TOKEN</code>{' '}
        y{' '}
        <code style={{ background: '#e8e4de', padding: '1px 5px', borderRadius: 3 }}>DROPBOX_REFRESH_TOKEN</code>.
      </div>
    </div>
  );
}
