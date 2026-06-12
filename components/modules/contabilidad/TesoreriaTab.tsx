'use client';

import { useState, useTransition } from 'react';
import type { Factura, Gasto } from '@/lib/types';
import { recBase, recTotal, fmt } from './calculos';
import { saveSaldoBase } from './actions';

interface SaldoBase { importe: number; fecha: string }

interface Props {
  facturas: Factura[];
  gastos: Gasto[];
  initialSaldoBase: SaldoBase | undefined;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtEur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const fmtFecha = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const MESES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${MESES_CORTO[+m - 1]} ${y}`;
}

// Returns last N complete calendar months as 'YYYY-MM', most recent first
function lastCompleteMonths(n: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TesoreriaTab({ facturas, gastos, initialSaldoBase }: Props) {
  const [saldoBase, setSaldoBase] = useState<SaldoBase | undefined>(initialSaldoBase);
  const [editImporte, setEditImporte] = useState(String(initialSaldoBase?.importe ?? ''));
  const [editFecha,   setEditFecha]   = useState(initialSaldoBase?.fecha ?? '');
  const [saved,       setSaved]       = useState(false);
  const [isPending, startTransition]  = useTransition();

  // ── Saldo actual ────────────────────────────────────────────────────────────

  let saldoActual   = 0;
  let cobradoDesde  = 0;
  let gastadoDesde  = 0;
  let pendienteCobro = 0;
  const hasSaldo = !!saldoBase;

  if (saldoBase) {
    const cobradas  = facturas.filter(f =>
      (!f.tipo || f.tipo === 'factura') &&
      f.estado === 'cobrada' &&
      f.fecha > saldoBase.fecha
    );
    const gastosPost = gastos.filter(g => g.fecha > saldoBase.fecha);
    const pendientes = facturas.filter(f =>
      (!f.tipo || f.tipo === 'factura') && f.estado === 'pendiente'
    );

    cobradoDesde   = cobradas.reduce((s, f) => s + recTotal(f), 0);
    gastadoDesde   = gastosPost.reduce((s, g) => s + recTotal(g), 0);
    pendienteCobro = pendientes.reduce((s, f) => s + recTotal(f), 0);
    saldoActual    = saldoBase.importe + cobradoDesde - gastadoDesde;
  }

  // ── Previsión 3 meses ───────────────────────────────────────────────────────

  const last12 = lastCompleteMonths(12);

  const gastoByMonth: Record<string, number> = {};
  for (const g of gastos) {
    const ym = g.fecha?.slice(0, 7);
    if (ym && last12.includes(ym)) {
      gastoByMonth[ym] = (gastoByMonth[ym] ?? 0) + recTotal(g);
    }
  }

  const MIN_GASTO = 10_000;
  const mesesValidos   = last12.filter(ym => (gastoByMonth[ym] ?? 0) > MIN_GASTO);
  const mesesExcluidos = last12.filter(ym => !mesesValidos.includes(ym));

  const mediaGasto  = mesesValidos.length > 0
    ? mesesValidos.reduce((s, ym) => s + (gastoByMonth[ym] ?? 0), 0) / mesesValidos.length
    : 0;
  const prevision3m = mediaGasto * 3;
  const colchon     = hasSaldo ? saldoActual - prevision3m : null;

  // Gastos con base 0 en los meses del cálculo
  const zeroCount = gastos.filter(g => {
    const ym = g.fecha?.slice(0, 7);
    return ym && mesesValidos.includes(ym) && recBase(g) === 0;
  }).length;

  // ── Save ────────────────────────────────────────────────────────────────────

  function handleSave() {
    const imp = parseFloat(editImporte);
    if (isNaN(imp) || !editFecha) return;
    const newBase: SaldoBase = { importe: imp, fecha: editFecha };
    startTransition(async () => {
      await saveSaldoBase(newBase);
      setSaldoBase(newBase);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6,
    padding: '16px 18px', marginBottom: 14,
  };
  const cardTitle: React.CSSProperties = {
    fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase',
    color: '#a09e99', marginBottom: 14, fontWeight: 500,
  };
  const inpSt: React.CSSProperties = {
    height: 32, padding: '0 10px', border: '1px solid #c8c4bc', borderRadius: 6,
    fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#333',
  };
  const kv: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '6px 0', borderBottom: '1px solid #f4f2ed', fontSize: 12.5, gap: 12,
  };
  const lbl: React.CSSProperties = { color: '#a09e99', fontSize: 11 };
  const num: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', fontWeight: 500 };

  return (
    <div style={{ maxWidth: 760 }}>

      {/* ── Saldo base ─────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={cardTitle}>Saldo base — punto de partida manual</div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <div style={{ ...lbl, display: 'block', marginBottom: 4 }}>Fecha del saldo</div>
            <input type="date" style={inpSt} value={editFecha}
              onChange={e => { setEditFecha(e.target.value); setSaved(false); }} />
          </div>
          <div>
            <div style={{ ...lbl, display: 'block', marginBottom: 4 }}>Saldo real del banco ese día</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="number" step="0.01" style={{ ...inpSt, width: 150 }}
                value={editImporte} placeholder="0"
                onChange={e => { setEditImporte(e.target.value); setSaved(false); }} />
              <span style={{ fontSize: 13, color: '#6b6a66' }}>€</span>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isPending || !editFecha || editImporte === ''}
            style={{
              height: 32, padding: '0 18px', borderRadius: 6, fontSize: 12,
              fontFamily: 'inherit', cursor: isPending ? 'wait' : 'pointer',
              border: 'none', background: '#333', color: '#fff',
              opacity: isPending || !editFecha || editImporte === '' ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            {isPending ? 'Guardando…' : 'Guardar saldo base'}
          </button>
          {saved && (
            <span style={{ fontSize: 12, color: '#2e7d46', fontWeight: 500 }}>✓ Guardado</span>
          )}
        </div>
        {!hasSaldo && (
          <p style={{ marginTop: 10, fontSize: 12, color: '#a09e99', fontStyle: 'italic' }}>
            Introduce el saldo real del banco en una fecha concreta para calcular el saldo actual y el colchón disponible.
          </p>
        )}
      </div>

      {hasSaldo && (
        <>
          {/* ── Saldo actual ───────────────────────────────────────────────── */}
          <div style={card}>
            <div style={cardTitle}>Saldo actual estimado</div>
            <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', alignItems: 'flex-start' }}>

              {/* Número destacado */}
              <div style={{ minWidth: 170 }}>
                <div style={{
                  fontSize: 38, fontWeight: 700, lineHeight: 1.1,
                  fontVariantNumeric: 'tabular-nums',
                  color: saldoActual >= 0 ? '#2e7d46' : '#c0392b',
                }}>
                  {fmtEur(saldoActual)}
                </div>
                {colchon !== null && (
                  <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 5, background: colchon >= 0 ? '#f0faf3' : '#fdf0ef', border: `1px solid ${colchon >= 0 ? '#b2dfc0' : '#f0b8b4'}` }}>
                    <div style={{ fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 2 }}>Colchón vs previsión 3m</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: colchon >= 0 ? '#2e7d46' : '#c0392b' }}>
                      {fmtEur(colchon)}
                    </div>
                  </div>
                )}
              </div>

              {/* Desglose */}
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={kv}>
                  <span style={lbl}>Saldo base ({fmtFecha(saldoBase!.fecha)})</span>
                  <span style={num}>{fmtEur(saldoBase!.importe)}</span>
                </div>
                <div style={kv}>
                  <span style={{ ...lbl, color: '#2e7d46' }}>+ Cobrado desde esa fecha</span>
                  <span style={{ ...num, color: '#2e7d46' }}>+{fmtEur(cobradoDesde)}</span>
                </div>
                <div style={kv}>
                  <span style={{ ...lbl, color: '#c0392b' }}>− Gastos desde esa fecha</span>
                  <span style={{ ...num, color: '#c0392b' }}>−{fmtEur(gastadoDesde)}</span>
                </div>
                <div style={{ ...kv, borderBottom: 'none', marginTop: 6, paddingTop: 8, borderTop: '1px solid #e0ddd5' }}>
                  <span style={{ ...lbl, fontStyle: 'italic' }}>Pendiente de cobro (informativo, no incluido)</span>
                  <span style={{ ...num, color: pendienteCobro > 0 ? '#b07a1e' : '#a09e99' }}>
                    {fmtEur(pendienteCobro)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Previsión ───────────────────────────────────────────────────── */}
          <div style={card}>
            <div style={cardTitle}>Previsión de gastos — próximos 3 meses</div>

            {mesesValidos.length === 0 ? (
              <p style={{ fontSize: 12, color: '#a09e99' }}>
                Sin datos suficientes: ningún mes de los últimos 12 supera los {fmt(MIN_GASTO)} de gastos.
              </p>
            ) : (
              <>
                <div style={kv}>
                  <span style={lbl}>
                    Media mensual ({mesesValidos.length} mes{mesesValidos.length !== 1 ? 'es' : ''} incluido{mesesValidos.length !== 1 ? 's' : ''})
                  </span>
                  <span style={num}>{fmtEur(mediaGasto)}/mes</span>
                </div>
                <div style={{ ...kv, borderBottom: 'none', fontWeight: 600, fontSize: 14, paddingTop: 8 }}>
                  <span>Previsión a 3 meses</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: '#b07a1e' }}>{fmtEur(prevision3m)}</span>
                </div>

                <div style={{ marginTop: 12, fontSize: 11, color: '#6b6a66', lineHeight: 1.7 }}>
                  <span style={{ color: '#a09e99' }}>Meses incluidos ({">"}{fmtEur(MIN_GASTO)}): </span>
                  {mesesValidos.map(monthLabel).join(' · ')}
                </div>
                {mesesExcluidos.length > 0 && (
                  <div style={{ fontSize: 11, color: '#a09e99', lineHeight: 1.7 }}>
                    <span>Excluidos ({"≤"}{fmtEur(MIN_GASTO)}): </span>
                    {mesesExcluidos.map(monthLabel).join(' · ')}
                  </div>
                )}

                {zeroCount > 0 && (
                  <div style={{
                    marginTop: 10, padding: '8px 11px',
                    background: '#fef9ec', border: '1px solid #e6d47a',
                    borderRadius: 5, fontSize: 11.5, color: '#7d6200',
                  }}>
                    ⚠ {zeroCount} gasto{zeroCount !== 1 ? 's' : ''} con importe 0 € en los meses del cálculo.
                    La media puede estar subestimada hasta que se completen.
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
