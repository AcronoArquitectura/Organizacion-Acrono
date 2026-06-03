'use client';

import type { Presupuesto } from '@/lib/types';
import {
  honorariosLineas, honorariosBase, honorariosExtrasTotal, pemTotal,
} from '@/lib/utils/coag';

interface Props {
  p: Presupuesto;
  onSave: () => void;
  onPDF: () => void;
  isPending: boolean;
}

const fmt = (n: number) => Math.round(n).toLocaleString('es-ES') + ' €';

const ESTADO_BADGE: Record<string, {color:string;bg:string;border:string}> = {
  borrador:  { color:'#6b6a66', bg:'#f5f4f0', border:'#c8c4bc' },
  enviado:   { color:'#3f6fb0', bg:'#e8eef7', border:'#a8c0e0' },
  aceptado:  { color:'#2e7d46', bg:'#e8f3ec', border:'#bfe0cb' },
  rechazado: { color:'#c0392b', bg:'#fdecea', border:'#e3b4ae' },
};

export default function PresupuestoSummary({ p, onSave, onPDF, isPending }: Props) {
  const lines = honorariosLineas(p);
  const doLine = lines.find(l => l.tipo === 'mensual');
  const fixedLines = lines.filter(l => l.tipo === 'fijo' && Math.abs(l.importe) > 0.005);
  const extrasTotal = honorariosExtrasTotal(p);
  const base = honorariosBase(p);
  const pem = pemTotal(p);
  const badge = ESTADO_BADGE[p.estado] ?? ESTADO_BADGE.borrador;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Panel 1: Resumen de honorarios */}
      <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '14px 16px' }}>
        <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 10, fontWeight: 500 }}>
          Resumen de honorarios
        </div>

        {fixedLines.map(l => (
          <div key={l.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', borderBottom: '1px solid #f4f2ed', fontSize: 12, gap: 8 }}>
            <span style={{ color: '#6b6a66', flex: 1, fontSize: 11 }}>{l.label}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500, whiteSpace: 'nowrap' }}>{fmt(l.importe)}</span>
          </div>
        ))}

        {doLine && doLine.importe > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', borderBottom: '1px solid #f4f2ed', fontSize: 12, gap: 8 }}>
            <span style={{ color: '#6b6a66', flex: 1, fontSize: 11 }}>
              Dirección de obra <span style={{ fontSize: 10, color: '#a09e99' }}>{fmt(doLine.importe)}/mes × {doLine.meses}</span>
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{fmt(doLine.importe * (doLine.meses ?? 0))}</span>
          </div>
        )}

        {extrasTotal > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f4f2ed', fontSize: 12, gap: 8 }}>
            <span style={{ color: '#6b6a66', fontSize: 11 }}>Honorarios extra</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{fmt(extrasTotal)}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 4px', fontSize: 12, fontWeight: 600, borderTop: '1px solid #e0ddd5', marginTop: 4 }}>
          <span>Total honorarios (s/IVA)</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(base)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 11, color: '#6b6a66' }}>
          <span>IVA 21%</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(base * 0.21)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f5f4f0', borderRadius: 6, marginTop: 6, fontSize: 15, fontWeight: 700 }}>
          <span>TOTAL con IVA</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(base * 1.21)}</span>
        </div>

        <div style={{ fontSize: 10, color: '#a09e99', marginTop: 8 }}>
          PEM {fmt(pem)} · ratio honorarios/PEM {pem ? (base / pem * 100).toFixed(2) : '0'}%
        </div>
      </div>

      {/* Panel 2: Estado + Acciones */}
      <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '14px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 4 }}>Estado</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 20, color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}>
                {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
              </span>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 4 }}>Ajuste/descuento</label>
            <span style={{ fontSize: 12, color: p.ajustePct !== 0 ? (p.ajustePct > 0 ? '#2e7d46' : '#c0392b') : '#a09e99' }}>
              {p.ajustePct > 0 ? '+' : ''}{p.ajustePct}%
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onSave} disabled={isPending}
            style={{ height: 34, borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: isPending ? 'wait' : 'pointer', border: 'none', background: '#333', color: '#fff', fontWeight: 500, opacity: isPending ? 0.6 : 1 }}>
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
          <button onClick={onPDF}
            style={{ height: 34, borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}>
            Vista previa PDF
          </button>
        </div>
      </div>

    </div>
  );
}
