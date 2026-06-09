'use client';

import { useState } from 'react';
import type { Factura, Gasto } from '@/lib/types';
import { recBase, recTotal, fmt, yearOf, catColor } from './calculos';
import { CATEGORIAS_GASTO } from './constants';

interface Props { facturas: Factura[]; gastos: Gasto[]; }

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const YEAR_COLORS = ['#4a7eb5','#e07b2a','#7b5ea7','#2e7d46','#c0392b','#16a085'];

type Metric   = 'ing' | 'gas' | 'net';
type CompMode = 'prevYear' | 'avgPrev';

// ── helpers ───────────────────────────────────────────────────────────────────

function monthOf(fecha: string) { return new Date(fecha + 'T00:00:00').getMonth(); }

function monthlyArrays(
  facturas: Factura[], gastos: Gasto[], year: number,
): { ing: number[]; gas: number[] } {
  const ing = Array(12).fill(0) as number[];
  const gas = Array(12).fill(0) as number[];
  facturas.filter(f => yearOf(f.fecha) === year).forEach(f => (ing[monthOf(f.fecha)] += recBase(f)));
  gastos.filter(g => yearOf(g.fecha) === year).forEach(g => (gas[monthOf(g.fecha)] += recBase(g)));
  return { ing, gas };
}

function ingasYtd(
  facturas: Factura[], gastos: Gasto[], year: number, maxMonth?: number,
) {
  const ok = (fecha: string) =>
    yearOf(fecha) === year && (maxMonth === undefined || monthOf(fecha) <= maxMonth);
  return {
    ing: facturas.filter(f => ok(f.fecha)).reduce((s, f) => s + recBase(f), 0),
    gas: gastos.filter(g => ok(g.fecha)).reduce((s, g) => s + recBase(g), 0),
  };
}

function fmtK(v: number): string {
  const abs = Math.abs(v);
  const s   = v < 0 ? '-' : '';
  if (abs >= 1000) return s + Math.round(abs / 1000) + 'k';
  return s + Math.round(abs).toString();
}

function yTicks(minVal: number, maxVal: number): number[] {
  const range = maxVal - minVal || 1;
  const raw   = range / 4;
  const mag   = Math.pow(10, Math.floor(Math.log10(raw)));
  const step  = Math.ceil(raw / mag) * mag;
  const t0    = Math.floor(minVal / step) * step;
  const ticks: number[] = [];
  for (let t = t0; t <= maxVal + step * 0.01; t += step) ticks.push(t);
  return ticks;
}

function makeYScale(minVal: number, maxVal: number, chartH: number, PT: number) {
  const range = maxVal - minVal || 1;
  return (v: number) => PT + chartH - ((v - minVal) / range) * chartH;
}

// ── Gráfica 1: columnas mensuales + línea resultado ───────────────────────────

function ChartMensual({
  ing, gas, partial, curMonth,
}: { ing: number[]; gas: number[]; partial: boolean; curMonth: number }) {
  const W = 700, H = 230, PL = 56, PR = 20, PT = 16, PB = 30;
  const cW = W - PL - PR, cH = H - PT - PB;
  const visible = partial ? curMonth + 1 : 12;

  const net     = ing.map((v, i) => v - gas[i]);
  const allVals = [
    ...ing.slice(0, visible), ...gas.slice(0, visible), ...net.slice(0, visible), 0,
  ];
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals, 1);
  const yS     = makeYScale(minVal, maxVal, cH, PT);
  const zeroY  = yS(0);
  const ticks  = yTicks(minVal, maxVal);

  const groupW = cW / 12;
  const barW   = Math.min((groupW - 10) / 2, 22);
  const gap    = 4;

  // Polyline for net result
  const netPts = net.slice(0, visible)
    .map((v, i) => `${PL + i * groupW + groupW / 2},${yS(v)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
      {/* Y grid */}
      {ticks.map(t => {
        const y = yS(t); if (y < PT - 6 || y > PT + cH + 6) return null;
        return (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={y} y2={y}
              stroke={t === 0 ? '#c8c4bc' : '#f0eee9'} strokeWidth={t === 0 ? 1 : 0.8} />
            <text x={PL - 5} y={y + 3} textAnchor="end" fontSize={9} fill="#a09e99">{fmtK(t)}</text>
          </g>
        );
      })}

      {/* Bars */}
      {MESES.map((m, i) => {
        if (i >= visible) return null;
        const cx  = PL + i * groupW + groupW / 2;
        const bx  = cx - barW - gap / 2;
        const iH  = Math.max(Math.abs(yS(ing[i]) - zeroY), 0);
        const gH  = Math.max(Math.abs(yS(gas[i]) - zeroY), 0);
        const iy  = Math.min(yS(ing[i]), zeroY);
        const gy  = Math.min(yS(gas[i]), zeroY);
        return (
          <g key={m}>
            {iH > 0 && <rect x={bx}          y={iy} width={barW} height={iH} fill="#333"    rx={1.5} />}
            {gH > 0 && <rect x={bx + barW + gap} y={gy} width={barW} height={gH} fill="#c8a844" rx={1.5} />}
            <text x={cx} y={H - 9} textAnchor="middle" fontSize={9} fill="#a09e99">{m}</text>
          </g>
        );
      })}

      {/* Net result line */}
      {visible > 1 && (
        <polyline points={netPts} fill="none" stroke="#2e7d46"
          strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {net.slice(0, visible).map((v, i) => (
        <circle key={i} cx={PL + i * groupW + groupW / 2} cy={yS(v)} r={3} fill="#2e7d46" />
      ))}
    </svg>
  );
}

// ── Gráfica 2: líneas comparativas por año ────────────────────────────────────

function ChartLineas({
  yearData, allYears, selectedYear, metric, compMode, curYear, curMonth,
}: {
  yearData: Record<number, { ing: number[]; gas: number[] }>;
  allYears: number[];
  selectedYear: number;
  metric: Metric;
  compMode: CompMode;
  curYear: number;
  curMonth: number;
}) {
  const W = 700, H = 210, PL = 56, PR = 20, PT = 16, PB = 30;
  const cW = W - PL - PR, cH = H - PT - PB;
  const groupW = cW / 12;

  function metricVal(d: { ing: number[]; gas: number[] }, i: number): number {
    if (metric === 'ing') return d.ing[i];
    if (metric === 'gas') return d.gas[i];
    return d.ing[i] - d.gas[i];
  }

  const prevYears = allYears.filter(y => y < selectedYear);

  type LineDef = { key: string; vals: (number | null)[]; color: string; dashed: boolean; label: string };
  const lines: LineDef[] = [];

  // Selected year
  const selD = yearData[selectedYear];
  if (selD) {
    lines.push({
      key: String(selectedYear),
      vals: Array.from({ length: 12 }, (_, i) =>
        selectedYear === curYear && i > curMonth ? null : metricVal(selD, i),
      ),
      color: '#333',
      dashed: selectedYear === curYear,
      label: `${selectedYear}${selectedYear === curYear ? ' (parcial)' : ''}`,
    });
  }

  // Comparison series
  if (compMode === 'prevYear') {
    const py = selectedYear - 1;
    const pyD = yearData[py];
    if (pyD) {
      const cidx = allYears.filter(y => y < selectedYear).indexOf(py);
      lines.push({
        key: String(py),
        vals: Array.from({ length: 12 }, (_, i) => metricVal(pyD, i)),
        color: YEAR_COLORS[cidx % YEAR_COLORS.length] ?? '#888',
        dashed: false,
        label: String(py),
      });
    }
  } else {
    if (prevYears.length > 0) {
      const avgVals = Array.from({ length: 12 }, (_, i) => {
        const sum = prevYears.reduce((s, y) => {
          const d = yearData[y]; return d ? s + metricVal(d, i) : s;
        }, 0);
        return sum / prevYears.length;
      });
      lines.push({
        key: 'avg',
        vals: avgVals,
        color: '#a09e99',
        dashed: true,
        label: `Media ${prevYears.join('/')}`,
      });
    }
  }

  const allVals = lines.flatMap(l => l.vals.filter((v): v is number => v !== null));
  const minVal  = Math.min(...allVals, 0);
  const maxVal  = Math.max(...allVals, 1);
  const yS      = makeYScale(minVal, maxVal, cH, PT);
  const ticks   = yTicks(minVal, maxVal);

  function buildPath(vals: (number | null)[]): string {
    let d = '';
    vals.forEach((v, i) => {
      if (v === null) return;
      const x = PL + i * groupW + groupW / 2;
      const y = yS(v);
      d += d === '' ? `M${x},${y}` : ` L${x},${y}`;
    });
    return d;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
      {ticks.map(t => {
        const y = yS(t); if (y < PT - 6 || y > PT + cH + 6) return null;
        return (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={y} y2={y}
              stroke={t === 0 ? '#c8c4bc' : '#f0eee9'} strokeWidth={t === 0 ? 1 : 0.8} />
            <text x={PL - 5} y={y + 3} textAnchor="end" fontSize={9} fill="#a09e99">{fmtK(t)}</text>
          </g>
        );
      })}

      {MESES.map((m, i) => (
        <text key={m} x={PL + i * groupW + groupW / 2} y={H - 9}
          textAnchor="middle" fontSize={9} fill="#a09e99">{m}</text>
      ))}

      {lines.map(line => {
        const pathD = buildPath(line.vals);
        if (!pathD) return null;
        return (
          <g key={line.key}>
            <path d={pathD} fill="none" stroke={line.color} strokeWidth={2}
              strokeDasharray={line.dashed ? '5,3' : undefined}
              strokeLinejoin="round" strokeLinecap="round" />
            {line.vals.map((v, i) => v !== null && (
              <circle key={i} cx={PL + i * groupW + groupW / 2} cy={yS(v)} r={2.5} fill={line.color} />
            ))}
          </g>
        );
      })}

      {/* Inline labels at end of line */}
      {lines.map(line => {
        const lastIdx = [...line.vals].map((v, i) => v !== null ? i : -1).filter(i => i >= 0).at(-1);
        if (lastIdx === undefined) return null;
        const v = line.vals[lastIdx];
        if (v === null) return null;
        return (
          <text key={`lbl-${line.key}`}
            x={PL + lastIdx * groupW + groupW / 2 + 6}
            y={yS(v) + 4}
            fontSize={9} fill={line.color}>
            {fmtK(v)}
          </text>
        );
      })}
    </svg>
  );
}

// ── Gráfica 3: barras horizontales de gastos ──────────────────────────────────

function ChartCategorias({ catRows }: { catRows: [string, number][] }) {
  const ROW_H = 30, PL = 162, PR = 90, BAR_H = 14;
  const W = 700;
  const H = catRows.length * ROW_H + 8;
  const cW = W - PL - PR;
  const maxVal = Math.max(...catRows.map(r => r[1]), 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H }}>
      {catRows.map(([k, v], i) => {
        const col  = catColor(k, [...CATEGORIAS_GASTO]);
        const barW = (v / maxVal) * cW;
        const cy   = i * ROW_H + ROW_H / 2 + 4;
        return (
          <g key={k}>
            <text x={PL - 8} y={cy} textAnchor="end" fontSize={11} fill="#6b6a66">{k}</text>
            <rect x={PL} y={cy - BAR_H / 2 - 2} width={Math.max(barW, 1)} height={BAR_H} fill={col} rx={2} />
            <text x={PL + barW + 6} y={cy} fontSize={11} fill="#6b6a66"
              style={{ fontVariantNumeric: 'tabular-nums' }}>
              {fmt(v)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ResultadosTab({ facturas, gastos }: Props) {
  const curYear  = new Date().getFullYear();
  const curMonth = new Date().getMonth();

  const rawYears = new Set<number>([curYear]);
  facturas.forEach(f => { const y = yearOf(f.fecha); if (y >= 2024) rawYears.add(y); });
  gastos.forEach(g => { const y = yearOf(g.fecha); if (y >= 2024) rawYears.add(y); });
  const years = [...rawYears].sort((a, b) => a - b);

  const [year, setYear]         = useState(curYear);
  const [metric, setMetric]     = useState<Metric>('ing');
  const [compMode, setCompMode] = useState<CompMode>('prevYear');

  const isPartial = year === curYear;
  const ytdMax    = isPartial ? curMonth : undefined;
  const periodLbl = isPartial ? ` (ene–${MESES[curMonth]})` : '';

  // KPI totals
  const { ing: ingCur, gas: gasCur } = ingasYtd(facturas, gastos, year,     ytdMax);
  const { ing: ingPv,  gas: gasPv  } = ingasYtd(facturas, gastos, year - 1, ytdMax);
  const netCur = ingCur - gasCur, netPv = ingPv - gasPv;

  // Monthly data
  const { ing: ingM, gas: gasM } = monthlyArrays(facturas, gastos, year);

  // Category breakdown
  const gY = gastos.filter(g =>
    yearOf(g.fecha) === year && (ytdMax === undefined || monthOf(g.fecha) <= ytdMax),
  );
  const catMap: Record<string, number> = {};
  gY.forEach(g => { const k = g.categoria || 'Sin categoría'; catMap[k] = (catMap[k] ?? 0) + recBase(g); });
  const catRows = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  // Year data for Gráfica 2
  const yearData: Record<number, { ing: number[]; gas: number[] }> = {};
  years.forEach(y => { yearData[y] = monthlyArrays(facturas, gastos, y); });

  // ── styles ──
  const panel: React.CSSProperties = {
    background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: 16, marginBottom: 14,
  };
  const pt: React.CSSProperties = {
    fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
    color: '#a09e99', fontWeight: 500,
  };
  const tBtn = (active: boolean): React.CSSProperties => ({
    height: 26, padding: '0 11px', borderRadius: 5, fontSize: 11, fontFamily: 'inherit',
    cursor: 'pointer', border: '1px solid',
    background: active ? '#333' : '#fff', color: active ? '#fff' : '#6b6a66',
    borderColor: active ? '#333' : '#c8c4bc',
  });

  // KPI definitions
  type KpiDef = { label: string; val: number; prev: number; color: string };
  const kpis: KpiDef[] = [
    { label: 'Ingresos',       val: ingCur, prev: ingPv, color: '#333' },
    { label: 'Gastos',         val: gasCur, prev: gasPv, color: '#c0392b' },
    { label: 'Resultado neto', val: netCur, prev: netPv, color: netCur >= 0 ? '#2e7d46' : '#c0392b' },
  ];

  return (
    <div>
      {/* Year selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <select value={year} onChange={e => setYear(+e.target.value)}
          style={{ height: 30, padding: '0 9px', border: '1px solid #c8c4bc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#333' }}>
          {years.map(y => <option key={y} value={y}>{y}{y === curYear ? ' (parcial)' : ''}</option>)}
        </select>
        {isPartial && (
          <span style={{ fontSize: 11, color: '#a09e99' }}>
            Datos hasta {MESES[curMonth]} {year} — comparativa YTD vs mismo periodo {year - 1}
          </span>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        {kpis.map(({ label, val, prev, color }) => {
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

      {/* ── Gráfica 1: Mensual ── */}
      <div style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <span style={pt}>Mensual {year}{periodLbl}</span>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            {([['#333','Ingresos'],['#c8a844','Gastos']] as [string,string][]).map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6b6a66' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#2e7d46' }}>
              <svg width={22} height={10} style={{ verticalAlign: 'middle' }}>
                <line x1={0} y1={5} x2={22} y2={5} stroke="#2e7d46" strokeWidth={2} />
                <circle cx={11} cy={5} r={3} fill="#2e7d46" />
              </svg>
              Resultado neto
            </div>
          </div>
        </div>
        <ChartMensual ing={ingM} gas={gasM} partial={isPartial} curMonth={curMonth} />
      </div>

      {/* ── Gráfica 2: Comparativa por años ── */}
      <div style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <span style={pt}>Comparativa entre años</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Metric toggle */}
            <div style={{ display: 'flex', gap: 3 }}>
              {([['ing','Ingresos'],['gas','Gastos'],['net','Beneficio neto']] as [Metric,string][]).map(([m, l]) => (
                <button key={m} style={tBtn(metric === m)} onClick={() => setMetric(m)}>{l}</button>
              ))}
            </div>
            <div style={{ width: 1, height: 20, background: '#e0ddd5' }} />
            {/* Comparison mode */}
            <div style={{ display: 'flex', gap: 3 }}>
              <button style={tBtn(compMode === 'prevYear')} onClick={() => setCompMode('prevYear')}>Año anterior</button>
              <button style={tBtn(compMode === 'avgPrev')} onClick={() => setCompMode('avgPrev')}>Media años ant.</button>
            </div>
          </div>
        </div>
        <ChartLineas
          yearData={yearData}
          allYears={years}
          selectedYear={year}
          metric={metric}
          compMode={compMode}
          curYear={curYear}
          curMonth={curMonth}
        />
        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Selected year */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#333' }}>
            <svg width={22} height={10} style={{ verticalAlign: 'middle' }}>
              <line x1={0} y1={5} x2={22} y2={5} stroke="#333" strokeWidth={2}
                strokeDasharray={isPartial ? '5,3' : undefined} />
            </svg>
            {year}{isPartial ? ' (parcial)' : ''}
          </div>
          {/* Comparison series */}
          {compMode === 'prevYear' && yearData[year - 1] && (() => {
            const cidx = years.filter(y => y < year).indexOf(year - 1);
            const col  = YEAR_COLORS[cidx % YEAR_COLORS.length] ?? '#888';
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: col }}>
                <svg width={22} height={10} style={{ verticalAlign: 'middle' }}>
                  <line x1={0} y1={5} x2={22} y2={5} stroke={col} strokeWidth={2} />
                </svg>
                {year - 1}
              </div>
            );
          })()}
          {compMode === 'avgPrev' && years.filter(y => y < year).length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#a09e99' }}>
              <svg width={22} height={10} style={{ verticalAlign: 'middle' }}>
                <line x1={0} y1={5} x2={22} y2={5} stroke="#a09e99" strokeWidth={2} strokeDasharray="5,3" />
              </svg>
              Media {years.filter(y => y < year).join('/')}
            </div>
          )}
        </div>
      </div>

      {/* ── Gráfica 3: Categorías ── */}
      <div style={panel}>
        <div style={{ ...pt, marginBottom: catRows.length > 0 ? 14 : 8 }}>
          Gastos por categoría {year}{periodLbl}
        </div>
        {catRows.length === 0
          ? <div style={{ fontSize: 12, color: '#a09e99', padding: '8px 0' }}>Sin gastos registrados.</div>
          : <ChartCategorias catRows={catRows} />
        }
      </div>
    </div>
  );
}
