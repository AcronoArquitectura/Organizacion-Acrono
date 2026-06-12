'use client';

import type { Factura, Gasto } from '@/lib/types';
import { recBase, fmt, yearOf, allYears, catColor } from './calculos';
import { esFacturaReal } from '@/lib/utils/facturas';
import { CATEGORIAS_GASTO } from './constants';

interface Props { facturas: Factura[]; gastos: Gasto[]; }

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const barRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#6b6a66', marginBottom: 6 };
const barLabel: React.CSSProperties = { width: 34, textAlign: 'right', flexShrink: 0 };
const barTrack: React.CSSProperties = { flex: 1, height: 18, background: '#f5f4f0', borderRadius: 3, overflow: 'hidden', position: 'relative' };
const barFill = (w: number, color: string): React.CSSProperties => ({ height: '100%', position: 'absolute', top: 0, left: 0, width: `${w.toFixed(1)}%`, background: color, borderRadius: 3 });
const barVal: React.CSSProperties = { minWidth: 96, textAlign: 'right', fontVariantNumeric: 'tabular-nums', flexShrink: 0 };

export default function GraficasTab({ facturas, gastos }: Props) {
  const years = allYears(facturas, gastos);
  const year = years.length > 0 ? Math.max(...years) : new Date().getFullYear();

  if (years.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180, color: '#a09e99', fontSize: 13 }}>
        No hay facturas ni gastos registrados.
      </div>
    );
  }

  // Evolución anual — solo datos reales de Dropbox
  const hist: Record<number, { ing: number; gas: number }> = {};
  years.forEach(y => {
    const fY = facturas.filter(f => yearOf(f.fecha) === y && esFacturaReal(f));
    const gY = gastos.filter(g => yearOf(g.fecha) === y);
    hist[y] = { ing: fY.reduce((s, f) => s + recBase(f), 0), gas: gY.reduce((s, g) => s + recBase(g), 0) };
  });
  const yrs = Object.keys(hist).map(Number).sort();
  const maxA = Math.max(...yrs.map(y => Math.max(hist[y].ing, hist[y].gas)), 1);

  // Facturación mensual año actual
  const ing = Array(12).fill(0);
  facturas.filter(f => yearOf(f.fecha) === year && esFacturaReal(f)).forEach(f => (ing[new Date(f.fecha + 'T00:00:00').getMonth()] += recBase(f)));
  const maxM = Math.max(...ing, 1);

  // Gastos por categoría
  const cmap: Record<string, number> = {};
  gastos.filter(g => yearOf(g.fecha) === year).forEach(g => {
    const k = g.categoria || 'Sin categoría';
    cmap[k] = (cmap[k] ?? 0) + recBase(g);
  });
  const cats = Object.entries(cmap)
    .map(([l, v]) => ({ l, v, c: catColor(l, [...CATEGORIAS_GASTO]) }))
    .sort((a, b) => b.v - a.v);
  const maxC = Math.max(...cats.map(c => c.v), 1);

  const panel: React.CSSProperties = { background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: 16 };
  const pt: React.CSSProperties = { fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 12, fontWeight: 500 };

  return (
    <div>
      {/* Chart 1: Evolución anual */}
      <div style={{ ...panel, marginBottom: 14 }}>
        <div style={pt}>Evolución anual — ingresos vs gastos</div>
        {yrs.map(y => (
          <div key={y} style={barRow}>
            <span style={barLabel}>{y}</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ ...barTrack, flex: 'none', height: 14 }}><div style={barFill(hist[y].ing / maxA * 100, '#333')} /></div>
              <div style={{ ...barTrack, flex: 'none', height: 14 }}><div style={barFill(hist[y].gas / maxA * 100, '#d8c08a')} /></div>
            </div>
            <div style={{ minWidth: 108, textAlign: 'right' }}>
              <div style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(hist[y].ing)}</div>
              <div style={{ color: '#a09e99', fontVariantNumeric: 'tabular-nums' }}>{fmt(hist[y].gas)}</div>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'flex-end' }}>
          {[['#333','Ingresos'],['#d8c08a','Gastos']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6b6a66' }}>
              <div style={{ width: 11, height: 11, borderRadius: 2, background: c }} />{l}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Chart 2: Facturación mensual */}
        <div style={panel}>
          <div style={pt}>Facturación mensual {year}</div>
          {MESES.map((m, i) => (
            <div key={m} style={barRow}>
              <span style={barLabel}>{m}</span>
              <div style={barTrack}><div style={barFill(ing[i] / maxM * 100, '#333')} /></div>
              <span style={barVal}>{ing[i] ? fmt(ing[i]) : '—'}</span>
            </div>
          ))}
        </div>

        {/* Chart 3: Gastos por categoría */}
        <div style={panel}>
          <div style={pt}>Gastos por categoría {year}</div>
          {cats.length === 0
            ? <div style={{ textAlign: 'center', padding: 30, color: '#a09e99' }}>Sin gastos.</div>
            : cats.map(c => (
              <div key={c.l} style={barRow}>
                <div style={{ width: 150, fontSize: 11, color: '#6b6a66', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.l}</div>
                <div style={{ ...barTrack, flex: 1 }}><div style={barFill(c.v / maxC * 100, c.c)} /></div>
                <span style={barVal}>{c.v ? fmt(c.v) : '—'}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
