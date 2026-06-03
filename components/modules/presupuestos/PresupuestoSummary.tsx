'use client';

import type { Presupuesto } from '@/lib/types';
import {
  honorariosLineas, honorariosBase, honorariosConAjuste, honorariosExtrasTotal,
} from '@/lib/utils/coag';

interface Props {
  p: Presupuesto;
  onSave: () => void;
  onPDF: () => void;
  isPending: boolean;
}

const fmt = (n: number) => Math.round(n).toLocaleString('es-ES') + ' €';

export default function PresupuestoSummary({ p, onSave, onPDF, isPending }: Props) {
  const lines = honorariosLineas(p);
  const base = honorariosBase(p);
  const extrasTotal = honorariosExtrasTotal(p);
  const hasAjuste = !!p.ajustePct;
  const conAjuste = honorariosConAjuste(p);
  const iva = conAjuste * 0.21;
  const total = conAjuste + iva;

  return (
    <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e0ddd5', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a09e99', fontWeight: 500 }}>
        Resumen de honorarios
      </div>

      {/* Lines */}
      <div style={{ padding: '12px 16px' }}>
        {lines.map(l => {
          const imp = l.tipo === 'mensual' ? l.importe * (l.meses ?? 0) : l.importe;
          return (
            <div key={l.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', borderBottom: '1px solid #f4f2ed', fontSize: 12, gap: 8 }}>
              <span style={{ color: '#6b6a66', flex: 1, fontSize: 11 }}>
                {l.label}
                {l.tipo === 'mensual' && <span style={{ fontSize: 10, color: '#a09e99' }}> ×{l.meses}m</span>}
                {l.horas !== undefined && <span style={{ fontSize: 10, color: '#a09e99' }}> ({l.horas}h)</span>}
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {fmt(imp)}
              </span>
            </div>
          );
        })}

        {extrasTotal > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', borderBottom: '1px solid #f4f2ed', fontSize: 12, gap: 8 }}>
            <span style={{ color: '#6b6a66', flex: 1, fontSize: 11 }}>Extras</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{fmt(extrasTotal)}</span>
          </div>
        )}

        {/* Base */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 4px', fontSize: 13, fontWeight: 600, borderTop: '1px solid #e0ddd5', marginTop: 6 }}>
          <span>Total s/IVA</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(base)}</span>
        </div>

        {/* Ajuste */}
        {hasAjuste && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12, color: p.ajustePct < 0 ? '#c0392b' : '#2e7d46' }}>
            <span>Ajuste {p.ajustePct > 0 ? '+' : ''}{p.ajustePct}%</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(conAjuste - base)}</span>
          </div>
        )}

        {hasAjuste && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13, fontWeight: 600 }}>
            <span>Base ajustada</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(conAjuste)}</span>
          </div>
        )}

        {/* IVA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 11, color: '#6b6a66' }}>
          <span>IVA 21%</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(iva)}</span>
        </div>

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#f5f4f0', borderRadius: 6, marginTop: 8, fontSize: 15, fontWeight: 700 }}>
          <span>Total c/IVA</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</span>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #e0ddd5', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={onSave} disabled={isPending}
          style={{ height: 34, borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: isPending ? 'wait' : 'pointer', border: 'none', background: '#333', color: '#fff', fontWeight: 500, opacity: isPending ? 0.6 : 1 }}>
          {isPending ? 'Guardando…' : 'Guardar presupuesto'}
        </button>
        <button onClick={onPDF}
          style={{ height: 34, borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}>
          Vista previa PDF
        </button>
      </div>
    </div>
  );
}
