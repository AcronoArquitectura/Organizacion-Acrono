'use client';

import type { Cliente, Proyecto } from '@/lib/types';
import { getCurrentPhase } from '@/lib/utils/phases';
import { formatearMoneda } from '@/lib/utils/formato';

interface Props {
  clientes: Cliente[];
  orgProyectos: Proyecto[];
  onNew: () => void;
}


export default function ClientesResumen({ clientes, orgProyectos, onNew }: Props) {
  const activos    = clientes.filter((c) => c.estado === 'activo').length;
  const potencial  = clientes.filter((c) => c.estado === 'potencial').length;
  const pendGlobal = clientes.reduce(
    (s, c) => s + c.proyectos.reduce((s2, p) => s2 + Math.max(0, (p.fact || 0) - (p.cobr || 0)), 0),
    0,
  );

  const enEspera = clientes.flatMap((c) =>
    c.proyectos
      .map((pj) => {
        const orgPj = orgProyectos.find((p) => p.code === pj.ref);
        if (!orgPj || getCurrentPhase(orgPj) !== 'En Espera') return null;
        return { cliente: c.nombre, ref: pj.ref };
      })
      .filter((x): x is { cliente: string; ref: string } => x !== null),
  );

  const pendPorCliente = clientes
    .map((c) => ({
      nombre: c.nombre,
      pend: c.proyectos.reduce((s, p) => s + Math.max(0, (p.fact || 0) - (p.cobr || 0)), 0),
    }))
    .filter((c) => c.pend > 0)
    .sort((a, b) => b.pend - a.pend);

  if (clientes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontSize: 14, color: '#a09e99', marginBottom: 16 }}>Aún no hay clientes registrados.</p>
        <button
          onClick={onNew}
          style={{ height: 34, padding: '0 18px', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', background: '#333', color: '#fff', border: 'none' }}
        >
          + Nuevo cliente
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total clientes',     value: clientes.length, color: '#333' },
          { label: 'Activos',            value: activos,         color: '#2e7d46' },
          { label: 'Potenciales',        value: potencial,       color: '#b07a1e' },
          { label: 'Pendiente de cobro', value: formatearMoneda(pendGlobal), color: pendGlobal > 0 ? '#b07a1e' : '#333' },
        ].map((k) => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: k.color, letterSpacing: '-.01em' }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Proyectos en espera */}
        <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '16px 18px' }}>
          <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 12, fontWeight: 500 }}>
            Proyectos en espera de inicio
          </div>
          {enEspera.length === 0 ? (
            <p style={{ fontSize: 12, color: '#a09e99' }}>Ninguno.</p>
          ) : (
            enEspera.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f4f2ed', fontSize: 12.5, gap: 12 }}>
                <span style={{ color: '#a09e99', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.cliente}</span>
                <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{e.ref}</span>
              </div>
            ))
          )}
        </div>

        {/* Pendiente de cobro por cliente */}
        <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '16px 18px' }}>
          <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 12, fontWeight: 500 }}>
            Pendiente de cobro por cliente
          </div>
          {pendPorCliente.length === 0 ? (
            <p style={{ fontSize: 12, color: '#a09e99' }}>Sin importes pendientes.</p>
          ) : (
            pendPorCliente.map((c) => (
              <div key={c.nombre} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: '1px solid #f4f2ed', fontSize: 12.5, gap: 12 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</span>
                <span style={{ fontWeight: 600, color: '#b07a1e', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatearMoneda(c.pend)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
