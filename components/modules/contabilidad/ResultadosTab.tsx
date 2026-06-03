'use client';

import { useState } from 'react';
import type { Factura, Gasto } from '@/lib/types';
import { recBase, recIVA, recIRPF, recTotal, fmt, trimOf, yearOf, allYears, catColor } from './calculos';
import { CATEGORIAS_GASTO } from './constants';

interface Props { facturas: Factura[]; gastos: Gasto[]; }

type Mode = 'mes' | 'trim' | 'anual' | 'proyecto' | 'categoria';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function ResultadosTab({ facturas, gastos }: Props) {
  const years = allYears(facturas, gastos);
  const curYear = new Date().getFullYear();
  const [year, setYear] = useState(years.includes(curYear) ? curYear : (years[0] ?? curYear));
  const [mode, setMode] = useState<Mode>('mes');

  const fY = facturas.filter(f => yearOf(f.fecha) === year);
  const gY = gastos.filter(g => yearOf(g.fecha) === year);

  const filterInp: React.CSSProperties = { height: 30, padding: '0 9px', border: '1px solid #c8c4bc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#333' };
  const toggleBtn = (active: boolean): React.CSSProperties => ({
    height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit',
    cursor: 'pointer', border: '1px solid',
    background: active ? '#333' : '#fff', color: active ? '#fff' : '#6b6a66', borderColor: active ? '#333' : '#c8c4bc',
  });
  const panel: React.CSSProperties = { background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: 16 };
  const pt: React.CSSProperties = { fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 12, fontWeight: 500 };
  const row = (head?: boolean, sub?: boolean): React.CSSProperties => ({
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: sub ? '4px 0 4px 16px' : '5px 0', fontSize: sub ? 11 : 12,
    color: sub ? '#a09e99' : head ? '#333' : '#6b6a66',
    fontWeight: head ? 600 : sub ? 400 : 400,
    borderBottom: sub ? 'none' : '1px solid #f0eee9',
  });

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select style={filterInp} value={year} onChange={e => setYear(+e.target.value)}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {(['mes','trim','anual','proyecto','categoria'] as Mode[]).map(m => (
          <button key={m} style={toggleBtn(mode === m)} onClick={() => setMode(m)}>
            {m === 'mes' ? 'Por mes' : m === 'trim' ? 'Por trimestre' : m === 'anual' ? 'Anual' : m === 'proyecto' ? 'Por proyecto' : 'Por categoría'}
          </button>
        ))}
      </div>

      {/* By month */}
      {mode === 'mes' && (() => {
        const ing = Array(12).fill(0), gas = Array(12).fill(0);
        fY.forEach(f => (ing[new Date(f.fecha + 'T00:00:00').getMonth()] += recBase(f)));
        gY.forEach(g => (gas[new Date(g.fecha + 'T00:00:00').getMonth()] += recBase(g)));
        const ti = ing.reduce((a,b)=>a+b,0), tg = gas.reduce((a,b)=>a+b,0), net = ti - tg;
        const rows = MESES.map((m, i) => ({ m, ing: ing[i], gas: gas[i] })).filter(r => r.ing || r.gas);
        return (
          <div style={panel}>
            <div style={pt}>Resultado mensual {year}</div>
            {rows.length === 0 ? <div style={{ textAlign: 'center', padding: 50, color: '#a09e99' }}>Sin datos en {year}.</div> : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#f5f4f0' }}>
                  {['Mes','Ingresos','Gastos','Resultado'].map((h, i) => (
                    <th key={h} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: '#a09e99', fontWeight: 500, padding: '9px 12px', borderBottom: '1px solid #e0ddd5', textAlign: i > 0 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rows.map(r => {
                    const net = r.ing - r.gas;
                    return <tr key={r.m} style={{ borderBottom: '1px solid #f0eee9' }}>
                      <td style={{ padding: '9px 12px', fontSize: 12 }}>{r.m} {year}</td>
                      <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.ing ? fmt(r.ing) : '—'}</td>
                      <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.gas ? fmt(r.gas) : '—'}</td>
                      <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: net >= 0 ? '#2e7d46' : '#c0392b' }}>{(net >= 0 ? '+' : '') + fmt(net)}</td>
                    </tr>;
                  })}
                </tbody>
                <tfoot><tr style={{ background: '#efece5', fontWeight: 600 }}>
                  <td style={{ padding: '7px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: '#6b6a66' }}>TOTAL {year}</td>
                  <td style={{ padding: '7px 12px', fontSize: 11, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(ti)}</td>
                  <td style={{ padding: '7px 12px', fontSize: 11, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(tg)}</td>
                  <td style={{ padding: '7px 12px', fontSize: 11, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: net >= 0 ? '#2e7d46' : '#c0392b' }}>{(net >= 0 ? '+' : '') + fmt(net)}</td>
                </tr></tfoot>
              </table>
            )}
          </div>
        );
      })()}

      {/* By trimestre */}
      {mode === 'trim' && (() => {
        const T = ['T1','T2','T3','T4'] as const;
        const ing = T.map(t => fY.filter(f => trimOf(f.fecha) === t).reduce((s,f) => s+recBase(f), 0));
        const gas = T.map(t => gY.filter(g => trimOf(g.fecha) === t).reduce((s,g) => s+recBase(g), 0));
        const ti = ing.reduce((a,b)=>a+b,0), tg = gas.reduce((a,b)=>a+b,0), net = ti-tg;
        const th = (h: string, right = false): React.CSSProperties => ({ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: '#a09e99', fontWeight: 500, padding: '9px 12px', borderBottom: '1px solid #e0ddd5', textAlign: right ? 'right' : 'left' });
        const td = (v: number, color?: string): React.CSSProperties => ({ padding: '9px 12px', fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: color ?? '#333' });
        return (
          <div style={panel}>
            <div style={pt}>Resultado trimestral {year}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#f5f4f0' }}>
                <th style={th('')}></th>
                {T.map(t => <th key={t} style={th(t, true)}>{t}</th>)}
                <th style={th('Total', true)}>Total</th>
              </tr></thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f0eee9' }}>
                  <td style={{ padding: '9px 12px', fontSize: 12 }}>Ingresos</td>
                  {ing.map((v, i) => <td key={i} style={td(v)}>{v ? fmt(v) : '—'}</td>)}
                  <td style={{ ...td(ti), fontWeight: 600 }}>{fmt(ti)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f0eee9' }}>
                  <td style={{ padding: '9px 12px', fontSize: 12 }}>Gastos</td>
                  {gas.map((v, i) => <td key={i} style={td(v)}>{v ? fmt(v) : '—'}</td>)}
                  <td style={{ ...td(tg), fontWeight: 600 }}>{fmt(tg)}</td>
                </tr>
                <tr style={{ background: '#efece5', fontWeight: 600 }}>
                  <td style={{ padding: '7px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: '#6b6a66' }}>Resultado</td>
                  {ing.map((v, i) => {
                    const n = v - gas[i];
                    return <td key={i} style={{ ...td(n, n >= 0 ? '#2e7d46' : '#c0392b') }}>{(n>=0?'+':'') + fmt(n)}</td>;
                  })}
                  <td style={{ ...td(net, net >= 0 ? '#2e7d46' : '#c0392b'), fontWeight: 700 }}>{(net>=0?'+':'') + fmt(net)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Anual */}
      {mode === 'anual' && (() => {
        const ingTotal = fY.reduce((s,f) => s+recBase(f), 0);
        const cobrado  = fY.filter(f => f.estado === 'cobrada').reduce((s,f) => s+recTotal(f), 0);
        const pend     = fY.filter(f => f.estado === 'pendiente').reduce((s,f) => s+recTotal(f), 0);
        const gasTotal = gY.reduce((s,g) => s+recBase(g), 0);
        const neto     = ingTotal - gasTotal;
        const catMap: Record<string, number> = {};
        gY.forEach(g => { const k = g.categoria || 'Sin categoría'; catMap[k] = (catMap[k] ?? 0) + recBase(g); });
        const catRows = Object.entries(catMap)
          .sort((a, b) => {
            const orden = CATEGORIAS_GASTO.map(c => c.label);
            return (orden.indexOf(a[0]) + 1 || 99) - (orden.indexOf(b[0]) + 1 || 99);
          });
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={panel}>
              <div style={pt}>Cuenta de resultados {year}</div>
              <div style={row(true)}><span>Ingresos (facturas emitidas)</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(ingTotal)}</span></div>
              <div style={row(false, true)}><span>Cobrado</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(cobrado)}</span></div>
              <div style={row(false, true)}><span>Pendiente de cobro</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(pend)}</span></div>
              <div style={row(true)}><span>Gastos (facturas recibidas)</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(gasTotal)}</span></div>
              {catRows.map(([k, v]) => (
                <div key={k} style={row(false, true)}><span>{k}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(v)}</span></div>
              ))}
              <div style={{ ...row(), fontWeight: 700, fontSize: 15, borderTop: '2px solid #333', borderBottom: 'none', marginTop: 8, paddingTop: 10 }}>
                <span>Resultado neto</span>
                <span style={{ color: neto >= 0 ? '#2e7d46' : '#c0392b', fontVariantNumeric: 'tabular-nums' }}>{(neto >= 0 ? '+' : '') + fmt(neto)}</span>
              </div>
            </div>
            <div style={panel}>
              <div style={pt}>IVA · resumen {year}</div>
              <div style={row()}><span>IVA repercutido (emitidas)</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(fY.reduce((s,f) => s+recIVA(f), 0))}</span></div>
              <div style={row()}><span>IVA soportado (recibidas)</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(gY.reduce((s,g) => s+recIVA(g), 0))}</span></div>
              <div style={{ ...row(), fontWeight: 600, fontSize: 15, borderTop: '2px solid #333', borderBottom: 'none', marginTop: 8, paddingTop: 10 }}>
                <span>IVA a liquidar</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(fY.reduce((s,f) => s+recIVA(f), 0) - gY.reduce((s,g) => s+recIVA(g), 0))}</span>
              </div>
              <div style={{ ...row(true), marginTop: 14 }}><span>IRPF retenido (emitidas)</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(fY.reduce((s,f) => s+recIRPF(f), 0))}</span></div>
            </div>
          </div>
        );
      })()}

      {/* By proyecto */}
      {mode === 'proyecto' && (() => {
        const map: Record<string, { ing: number; gas: number }> = {};
        fY.forEach(f => {
          const k = (f.concepto.match(/\b(vu\d+|eq\d+|vp\d+)\b/i) ?? [])[1];
          if (!k) return;
          const key = k.toLowerCase();
          if (!map[key]) map[key] = { ing: 0, gas: 0 };
          map[key].ing += recBase(f);
        });
        gY.forEach(g => {
          const k = (g.concepto.match(/\b(vu\d+|eq\d+|vp\d+)\b/i) ?? [])[1];
          if (!k) return;
          const key = k.toLowerCase();
          if (!map[key]) map[key] = { ing: 0, gas: 0 };
          map[key].gas += recBase(g);
        });
        const rows = Object.entries(map).sort((a, b) => b[1].ing - a[1].ing);
        return (
          <div style={panel}>
            <div style={pt}>Resultado por proyecto</div>
            {rows.length === 0
              ? <div style={{ textAlign: 'center', padding: 50, color: '#a09e99' }}>Aún no hay proyectos identificables en los conceptos (vuXX, eqXX, vpXX).</div>
              : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f5f4f0' }}>
                    {['Código','Ingresos','Gastos','Margen','%'].map((h, i) => (
                      <th key={h} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: '#a09e99', fontWeight: 500, padding: '9px 12px', borderBottom: '1px solid #e0ddd5', textAlign: i > 0 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {rows.map(([k, v]) => {
                      const mg = v.ing - v.gas;
                      const pc = v.ing ? Math.round(mg / v.ing * 100) : 0;
                      return <tr key={k} style={{ borderBottom: '1px solid #f0eee9' }}>
                        <td style={{ padding: '9px 12px', fontSize: 12 }}>{k}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(v.ing)}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', color: '#a09e99', fontVariantNumeric: 'tabular-nums' }}>{v.gas ? fmt(v.gas) : '—'}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', color: mg >= 0 ? '#2e7d46' : '#c0392b', fontVariantNumeric: 'tabular-nums' }}>{(mg>=0?'+':'') + fmt(mg)}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', color: mg >= 0 ? '#2e7d46' : '#c0392b' }}>{(mg>=0?'+':'') + pc}%</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
            }
          </div>
        );
      })()}

      {/* By categoría */}
      {mode === 'categoria' && (() => {
        const map: Record<string, { base: number; n: number }> = {};
        gY.forEach(g => { const k = g.categoria || 'Sin categoría'; if (!map[k]) map[k] = { base: 0, n: 0 }; map[k].base += recBase(g); map[k].n++; });
        const orden = CATEGORIAS_GASTO.map(c => c.label).concat('Sin categoría');
        const rows = Object.entries(map).sort((a, b) => (orden.indexOf(a[0]) + 1 || 99) - (orden.indexOf(b[0]) + 1 || 99));
        const tot = rows.reduce((s, r) => s + r[1].base, 0);
        return (
          <div style={panel}>
            <div style={pt}>Gasto por categoría {year}</div>
            {rows.length === 0
              ? <div style={{ textAlign: 'center', padding: 50, color: '#a09e99' }}>Sin gastos en {year}.</div>
              : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f5f4f0' }}>
                    {['Categoría','Nº','Importe (base)','% del total'].map((h, i) => (
                      <th key={h} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: '#a09e99', fontWeight: 500, padding: '9px 12px', borderBottom: '1px solid #e0ddd5', textAlign: i > 0 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {rows.map(([k, v]) => {
                      const col = catColor(k, [...CATEGORIAS_GASTO]);
                      const pc = tot ? Math.round(v.base / tot * 100) : 0;
                      return <tr key={k} style={{ borderBottom: '1px solid #f0eee9' }}>
                        <td style={{ padding: '9px 12px', fontSize: 12 }}>
                          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: col, marginRight: 7, verticalAlign: 'middle' }} />{k}
                        </td>
                        <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', color: '#a09e99' }}>{v.n}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(v.base)}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', color: '#a09e99' }}>{pc}%</td>
                      </tr>;
                    })}
                  </tbody>
                  <tfoot><tr style={{ background: '#efece5', fontWeight: 600 }}>
                    <td style={{ padding: '7px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', color: '#6b6a66' }}>TOTAL {year}</td>
                    <td style={{ padding: '7px 12px', fontSize: 11, textAlign: 'right' }}>{rows.reduce((s,r) => s+r[1].n, 0)}</td>
                    <td style={{ padding: '7px 12px', fontSize: 11, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(tot)}</td>
                    <td style={{ padding: '7px 12px', fontSize: 11, textAlign: 'right' }}>100%</td>
                  </tr></tfoot>
                </table>
            }
          </div>
        );
      })()}
    </div>
  );
}
