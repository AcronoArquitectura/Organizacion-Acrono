'use client';

import { useState } from 'react';
import type { Factura, Gasto } from '@/lib/types';
import { recBase, recTotal, fmt, yearOf, catColor } from './calculos';
import { CATEGORIAS_GASTO } from './constants';

interface Props { facturas: Factura[]; gastos: Gasto[]; }

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function monthOf(fecha: string) { return new Date(fecha + 'T00:00:00').getMonth(); }

function ingasYear(
  facturas: Factura[], gastos: Gasto[], year: number, maxMonth?: number,
): { ing: number; gas: number } {
  const ok = (fecha: string) =>
    yearOf(fecha) === year && (maxMonth === undefined || monthOf(fecha) <= maxMonth);
  return {
    ing: facturas.filter(f => ok(f.fecha)).reduce((s, f) => s + recBase(f), 0),
    gas: gastos.filter(g => ok(g.fecha)).reduce((s, g) => s + recBase(g), 0),
  };
}

// ── SVG: grouped bar chart (annual) ──────────────────────────────────────────

function BarChartAnual({ data }: {
  data: { year: number; ing: number; gas: number; partial: boolean }[];
}) {
  const H = 180, PL = 52, PB = 26, PT = 12, PR = 16;
  const W = Math.max(data.length * 80 + PL + PR, 360);
  const cW = W - PL - PR, cH = H - PB - PT;
  const maxVal = Math.max(...data.flatMap(d => [d.ing, d.gas]), 1);
  const groupW = cW / data.length;
  const barW = Math.min((groupW - 14) / 2, 30);
  const fmtK = (v: number) => v === 0 ? '0' : v >= 1000 ? Math.round(v / 1000) + 'k' : Math.round(v).toString();

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, overflow: 'visible' }}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = PT + cH - t * cH;
        return (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={y} y2={y} stroke={t === 0 ? '#d0cec8' : '#f0eee9'} strokeWidth={1} />
            <text x={PL - 5} y={y + 3} textAnchor="end" fontSize={9} fill="#a09e99">{fmtK(t * maxVal)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = PL + i * groupW + groupW / 2;
        const bx = cx - barW - 2;
        const iH = (d.ing / maxVal) * cH;
        const gH = (d.gas / maxVal) * cH;
        return (
          <g key={d.year}>
            <rect x={bx}          y={PT + cH - iH} width={barW} height={iH} fill={d.partial ? '#a8a8a8' : '#333'}    rx={2} opacity={d.partial ? 0.6 : 1} />
            <rect x={bx + barW + 4} y={PT + cH - gH} width={barW} height={gH} fill={d.partial ? '#ddd0a0' : '#c8a844'} rx={2} opacity={d.partial ? 0.6 : 1} />
            <text x={cx} y={H - 7} textAnchor="middle" fontSize={10} fill={d.partial ? '#a09e99' : '#6b6a66'}>
              {d.year}{d.partial ? ' *' : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── SVG: monthly bars (selected year + prev year outline) ────────────────────

function BarChartMensual({ ing, gas, ingPrev, gasPrev }: {
  ing: number[]; gas: number[]; ingPrev: number[]; gasPrev: number[];
}) {
  const H = 180, PL = 52, PB = 26, PT = 12, PR = 12;
  const W = 600;
  const cW = W - PL - PR, cH = H - PB - PT;
  const maxVal = Math.max(...ing, ...gas, ...ingPrev, ...gasPrev, 1);
  const groupW = cW / 12;
  const barW = Math.min((groupW - 10) / 2, 18);
  const fmtK = (v: number) => v === 0 ? '0' : v >= 1000 ? Math.round(v / 1000) + 'k' : Math.round(v).toString();

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
      {[0, 0.5, 1].map(t => {
        const y = PT + cH - t * cH;
        return (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={y} y2={y} stroke={t === 0 ? '#d0cec8' : '#f0eee9'} strokeWidth={1} />
            <text x={PL - 5} y={y + 3} textAnchor="end" fontSize={9} fill="#a09e99">{fmtK(t * maxVal)}</text>
          </g>
        );
      })}
      {MESES.map((m, i) => {
        const cx = PL + i * groupW + groupW / 2;
        const bx = cx - barW - 1.5;
        const iH  = (ing[i]     / maxVal) * cH;
        const gH  = (gas[i]     / maxVal) * cH;
        const ipH = (ingPrev[i] / maxVal) * cH;
        const gpH = (gasPrev[i] / maxVal) * cH;
        return (
          <g key={m}>
            {ipH > 0 && <rect x={bx - 1}          y={PT + cH - ipH} width={barW + 2} height={ipH} fill="none" stroke="#b0b0b0" strokeWidth={1} rx={2} opacity={0.45} />}
            {gpH > 0 && <rect x={bx + barW + 2}   y={PT + cH - gpH} width={barW + 2} height={gpH} fill="none" stroke="#d0b86a" strokeWidth={1} rx={2} opacity={0.45} />}
            {iH  > 0 && <rect x={bx}              y={PT + cH - iH}  width={barW}     height={iH}  fill="#333"    rx={2} />}
            {gH  > 0 && <rect x={bx + barW + 3}   y={PT + cH - gH}  width={barW}     height={gH}  fill="#c8a844" rx={2} />}
            <text x={cx} y={H - 8} textAnchor="middle" fontSize={9} fill="#a09e99">{m}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ResultadosTab({ facturas, gastos }: Props) {
  const curYear  = new Date().getFullYear();
  const curMonth = new Date().getMonth(); // 0-indexed

  const rawYears = new Set<number>([curYear]);
  facturas.forEach(f => { const y = yearOf(f.fecha); if (y >= 2024) rawYears.add(y); });
  gastos.forEach(g => { const y = yearOf(g.fecha); if (y >= 2024) rawYears.add(y); });
  const years = [...rawYears].sort((a, b) => a - b);

  const [year, setYear] = useState(curYear);

  const isPartial = year === curYear;
  const ytdMax    = isPartial ? curMonth : undefined;

  const { ing: ingCur, gas: gasCur } = ingasYear(facturas, gastos, year,     ytdMax);
  const { ing: ingPv,  gas: gasPv  } = ingasYear(facturas, gastos, year - 1, ytdMax);
  const netCur = ingCur - gasCur;
  const netPv  = ingPv  - gasPv;

  // Facturas/gastos of selected year for breakdown (filtered same as ingCur)
  const fY = facturas.filter(f => yearOf(f.fecha) === year && (ytdMax === undefined || monthOf(f.fecha) <= ytdMax));
  const gY = gastos.filter(g => yearOf(g.fecha) === year && (ytdMax === undefined || monthOf(g.fecha) <= ytdMax));

  const cobrado = fY.filter(f => f.estado === 'cobrada').reduce((s, f) => s + recTotal(f), 0);
  const pend    = fY.filter(f => f.estado !== 'cobrada').reduce((s, f) => s + recTotal(f), 0);

  const catMap: Record<string, number> = {};
  gY.forEach(g => { const k = g.categoria || 'Sin categoría'; catMap[k] = (catMap[k] ?? 0) + recBase(g); });
  const orden   = CATEGORIAS_GASTO.map(c => c.label);
  const catRows = Object.entries(catMap).sort((a, b) => (orden.indexOf(a[0]) + 1 || 99) - (orden.indexOf(b[0]) + 1 || 99));

  // Monthly arrays for Bloque 3
  const ingM  = Array(12).fill(0), gasM  = Array(12).fill(0);
  const ingMP = Array(12).fill(0), gasMP = Array(12).fill(0);
  facturas.filter(f => yearOf(f.fecha) === year).forEach(f => (ingM[monthOf(f.fecha)] += recBase(f)));
  gastos.filter(g => yearOf(g.fecha) === year).forEach(g => (gasM[monthOf(g.fecha)] += recBase(g)));
  facturas.filter(f => yearOf(f.fecha) === year - 1).forEach(f => (ingMP[monthOf(f.fecha)] += recBase(f)));
  gastos.filter(g => yearOf(g.fecha) === year - 1).forEach(g => (gasMP[monthOf(g.fecha)] += recBase(g)));

  // Annual evolution for Bloque 2
  const anualData = years.map(y => {
    const partial = y === curYear;
    const { ing, gas } = ingasYear(facturas, gastos, y, partial ? curMonth : undefined);
    return { year: y, ing, gas, partial };
  });

  // ── styles ──
  const panel: React.CSSProperties = { background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: 16, marginBottom: 14 };
  const pt: React.CSSProperties = { fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 12, fontWeight: 500 };
  const divRow = (sub = false): React.CSSProperties => ({
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: sub ? '3px 0 3px 14px' : '5px 0', fontSize: sub ? 11 : 12,
    color: sub ? '#a09e99' : '#6b6a66',
    borderBottom: sub ? 'none' : '1px solid #f0eee9',
  });
  const legend = (color: string, outlined = false): React.CSSProperties => ({
    width: 10, height: 10, borderRadius: 2,
    background: outlined ? 'none' : color,
    border: outlined ? `1px solid ${color}` : 'none',
  });

  const periodLabel = isPartial ? ` (ene–${MESES[curMonth]})` : '';

  return (
    <div>
      {/* Year selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <select
          value={year}
          onChange={e => setYear(+e.target.value)}
          style={{ height: 30, padding: '0 9px', border: '1px solid #c8c4bc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#333' }}
        >
          {years.map(y => <option key={y} value={y}>{y}{y === curYear ? ' (parcial)' : ''}</option>)}
        </select>
        {isPartial && (
          <span style={{ fontSize: 11, color: '#a09e99' }}>
            Datos hasta {MESES[curMonth]} {year} — comparativa YTD con mismo periodo {year - 1}
          </span>
        )}
      </div>

      {/* ── Bloque 1a: KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        {([
          { label: 'Ingresos',      val: ingCur, prev: ingPv,  color: '#333' as string },
          { label: 'Gastos',        val: gasCur, prev: gasPv,  color: '#c0392b' as string },
          { label: 'Resultado neto',val: netCur, prev: netPv,  color: (netCur >= 0 ? '#2e7d46' : '#c0392b') as string },
        ] as { label: string; val: number; prev: number; color: string }[]).map(({ label, val, prev, color }) => {
          const diff = val - prev;
          const pct  = prev ? Math.round(diff / Math.abs(prev) * 100) : null;
          const sign = diff >= 0 ? '+' : '';
          return (
            <div key={label} style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 6, fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', marginBottom: 5 }}>{fmt(val)}</div>
              {prev !== 0
                ? <div style={{ fontSize: 11, color: diff >= 0 ? '#2e7d46' : '#c0392b', fontVariantNumeric: 'tabular-nums' }}>
                    {sign}{fmt(diff)} / {sign}{pct}%
                  </div>
                : <div style={{ fontSize: 11, color: '#a09e99' }}>Sin datos año anterior</div>
              }
            </div>
          );
        })}
      </div>

      {/* ── Bloque 1b: Cuenta de resultados ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={panel}>
          <div style={pt}>Ingresos {year}{periodLabel}</div>
          <div style={{ ...divRow(), fontWeight: 600 }}>
            <span>Total facturado (s/IVA)</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(ingCur)}</span>
          </div>
          <div style={divRow(true)}>
            <span>Cobrado (con IVA)</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(cobrado)}</span>
          </div>
          <div style={divRow(true)}>
            <span>Pendiente (con IVA)</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(pend)}</span>
          </div>
          <div style={{ ...divRow(), fontWeight: 700, fontSize: 14, borderTop: '2px solid #333', borderBottom: 'none', marginTop: 8, paddingTop: 8 }}>
            <span>Resultado neto</span>
            <span style={{ color: netCur >= 0 ? '#2e7d46' : '#c0392b', fontVariantNumeric: 'tabular-nums' }}>
              {(netCur >= 0 ? '+' : '') + fmt(netCur)}
            </span>
          </div>
        </div>
        <div style={panel}>
          <div style={pt}>Gastos por categoría {year}{periodLabel}</div>
          <div style={{ ...divRow(), fontWeight: 600 }}>
            <span>Total gastos (s/IVA)</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(gasCur)}</span>
          </div>
          {catRows.map(([k, v]) => {
            const col = catColor(k, [...CATEGORIAS_GASTO]);
            return (
              <div key={k} style={divRow(true)}>
                <span>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: col, marginRight: 6, verticalAlign: 'middle' }} />
                  {k}
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(v)}</span>
              </div>
            );
          })}
          {catRows.length === 0 && <div style={{ fontSize: 11, color: '#a09e99', padding: '8px 0' }}>Sin gastos registrados.</div>}
        </div>
      </div>

      {/* ── Bloque 2: Evolución plurianual ── */}
      <div style={panel}>
        <div style={pt}>Evolución plurianual — ingresos vs gastos (desde 2024)</div>
        <BarChartAnual data={anualData} />
        <div style={{ display: 'flex', gap: 14, marginTop: 8, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
          {([['#333','Ingresos'],['#c8a844','Gastos']] as [string,string][]).map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6b6a66' }}>
              <div style={legend(c)} />{l}
            </div>
          ))}
          <div style={{ fontSize: 10, color: '#a09e99', marginLeft: 4 }}>* año parcial (YTD)</div>
        </div>
      </div>

      {/* ── Bloque 3: Desglose mensual ── */}
      <div style={panel}>
        <div style={pt}>Desglose mensual {year} vs {year - 1}</div>
        <BarChartMensual ing={ingM} gas={gasM} ingPrev={ingMP} gasPrev={gasMP} />
        <div style={{ display: 'flex', gap: 14, marginTop: 8, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
          {([['#333',`Ingresos ${year}`],['#c8a844',`Gastos ${year}`]] as [string,string][]).map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6b6a66' }}>
              <div style={legend(c)} />{l}
            </div>
          ))}
          {([['#b0b0b0',`Ingresos ${year - 1}`],['#d0b86a',`Gastos ${year - 1}`]] as [string,string][]).map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#a09e99' }}>
              <div style={legend(c, true)} />{l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
