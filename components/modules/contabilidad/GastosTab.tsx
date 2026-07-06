'use client';

import { useState } from 'react';
import type { Gasto, Proveedor } from '@/lib/types';
import { recBase, recIVA, recIRPF, recTotal, fmt, trimOf, yearOf, allYears, fechaCorta, catColor } from './calculos';
import { upsertGasto, deleteGasto } from './actions';
import { CATEGORIAS_GASTO } from './constants';
import GastoModal from './GastoModal';

interface Props {
  gastos: Gasto[];
  proveedores: Proveedor[];
  onUpdateGastos: (g: Gasto[]) => void;
  onUpdateProveedores: (p: Proveedor[]) => void;
  isPending: boolean;
  startTransition: (fn: () => Promise<void>) => void;
}

const BADGE: Record<string, { bg: string; color: string }> = {
  pagada:    { bg: '#e8f3ec', color: '#2e7d46' },
  pendiente: { bg: '#fbf3e0', color: '#b07a1e' },
};

export default function GastosTab({ gastos, proveedores, onUpdateGastos, onUpdateProveedores, isPending, startTransition }: Props) {
  const years = allYears([], gastos);
  const curYear = new Date().getFullYear();

  const [year, setYear]     = useState(years.includes(curYear) ? curYear : (years[0] ?? curYear));
  const [month, setMonth]   = useState(0); // 0 = todos los meses
  const [trim, setTrim]     = useState('');
  const [estado, setEstado] = useState('');
  const [cat, setCat]       = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Gasto | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Único array filtrado — fuente de verdad para lista y KPIs
  const inYear = gastos.filter(g => yearOf(g.fecha) === year);
  const filtered = inYear.filter(g => {
    if (month > 0) {
      // Fecha inválida/vacía → solo aparece en "Todos los meses"
      if (!g.fecha) return false;
      const d = new Date(g.fecha + 'T00:00:00');
      if (isNaN(d.getTime()) || d.getMonth() + 1 !== month) return false;
    }
    if (trim   && trimOf(g.fecha) !== trim)  return false;
    if (estado && g.estado !== estado)       return false;
    if (cat === '__none__') { if (g.categoria) return false; }
    else if (cat && g.categoria !== cat)     return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(g.numero + ' ' + g.concepto + ' ' + g.proveedor).toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => a.fecha.localeCompare(b.fecha));

  // KPIs siempre derivados del array filtrado — imposible que diverjan de la lista
  const base = filtered.reduce((s, g) => s + recBase(g), 0);
  const iva  = filtered.reduce((s, g) => s + recIVA(g), 0);
  const irpf = filtered.reduce((s, g) => s + recIRPF(g), 0);
  const pend = filtered.filter(g => g.estado === 'pendiente').reduce((s, g) => s + recTotal(g), 0);

  const kpiLabel = month > 0
    ? `${new Date(year, month - 1).toLocaleString('es-ES', { month: 'long' })} ${year}`
    : String(year);

  function handleSave(g: Gasto, nif: string) {
    startTransition(async () => {
      const result = await upsertGasto(g, nif);
      onUpdateGastos(result.gastos);
      onUpdateProveedores(result.proveedores);
      setModalOpen(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const updated = await deleteGasto(id);
      onUpdateGastos(updated);
      setModalOpen(false);
    });
  }

  const kpiLbl: React.CSSProperties = { fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 5 };
  const filterInp: React.CSSProperties = { height: 30, padding: '0 9px', border: '1px solid #c8c4bc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#333' };

  return (
    <>
      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select style={filterInp} value={year} onChange={e => { setYear(+e.target.value); setMonth(0); }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select style={filterInp} value={month} onChange={e => setMonth(+e.target.value)}>
          <option value={0}>Todos los meses</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(year, i).toLocaleString('es-ES', { month: 'long' })}
            </option>
          ))}
        </select>
        <select style={filterInp} value={trim} onChange={e => setTrim(e.target.value)}>
          <option value="">Todos los trimestres</option>
          {['T1','T2','T3','T4'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={filterInp} value={estado} onChange={e => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pagada">Pagada</option>
          <option value="pendiente">Pendiente</option>
        </select>
        <select style={filterInp} value={cat} onChange={e => setCat(e.target.value)}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS_GASTO.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
          <option value="__none__">Sin categoría</option>
        </select>
        <input type="text" style={{ ...filterInp, width: 230 }} placeholder="🔍 Buscar concepto, proveedor…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ flex: 1 }} />
        <button onClick={() => { setEditing(null); setModalOpen(true); }} disabled={isPending}
          style={{ height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', background: '#333', color: '#fff', border: 'none' }}>
          + Nuevo gasto
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { lbl: `Gasto ${kpiLabel}`, val: fmt(base), col: '#333' },
          { lbl: 'IVA soportado', val: fmt(iva), col: '#333' },
          { lbl: 'IRPF', val: fmt(irpf), col: '#333' },
          { lbl: 'Pendiente de pago', val: fmt(pend), col: '#b07a1e' },
        ].map(k => (
          <div key={k.lbl} style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '12px 14px' }}>
            <div style={kpiLbl}>{k.lbl}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: k.col, letterSpacing: '-.01em', fontVariantNumeric: 'tabular-nums' }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f4f0' }}>
              {['Nº','Concepto','Proveedor','Base imp.','IVA','IRPF','Total','Estado','Categoría'].map((h, i) => (
                <th key={h} style={{ fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99', fontWeight: 500, padding: '9px 12px', borderBottom: '1px solid #e0ddd5', textAlign: i >= 3 && i <= 6 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 50, color: '#a09e99', fontSize: 13 }}>
                {inYear.length === 0 ? 'Sin gastos. Pulsa "+ Nuevo gasto".' : 'Sin resultados.'}
              </td></tr>
            ) : (
              (['T1','T2','T3','T4'] as const).flatMap(tg => {
                const rows = filtered.filter(g => trimOf(g.fecha) === tg);
                if (!rows.length) return [];
                return [
                  <tr key={`hdr-${tg}`} style={{ background: '#efece5' }}>
                    <td colSpan={3} style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: '#6b6a66' }}>
                      {tg} {year} · {rows.length} gastos
                    </td>
                    <td style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(rows.reduce((s,g)=>s+recBase(g),0))}</td>
                    <td colSpan={2} />
                    <td style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(rows.reduce((s,g)=>s+recTotal(g),0))}</td>
                    <td colSpan={2} />
                  </tr>,
                  ...rows.map(g => {
                    const col = catColor(g.categoria, [...CATEGORIAS_GASTO]);
                    const tint = g.categoria ? `inset 3px 0 0 ${col}` : '';
                    const badge = BADGE[g.estado] ?? BADGE.pagada;
                    return (
                      <tr key={g.id} style={{ borderBottom: '1px solid #f0eee9', cursor: 'pointer', boxShadow: tint }}
                        onClick={() => { setEditing(g); setModalOpen(true); }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#faf9f6')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '9px 12px', fontSize: 12, color: '#a09e99' }}>{g.numero}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12 }}>{g.concepto}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12, color: '#a09e99' }}>{g.proveedor}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(recBase(g))}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', color: '#a09e99', fontVariantNumeric: 'tabular-nums' }}>{recIVA(g) ? fmt(recIVA(g)) : '—'}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', color: '#a09e99', fontVariantNumeric: 'tabular-nums' }}>{recIRPF(g) ? '−' + fmt(recIRPF(g)) : '—'}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(recTotal(g))}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: badge.bg, color: badge.color }}>{g.estado}</span>
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          {g.categoria
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 500, border: `1px solid ${col}`, color: col, background: col + '14' }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: col }} />{g.categoria}
                              </span>
                            : <span style={{ color: '#a09e99', fontSize: 11 }}>— sin categoría —</span>
                          }
                          {g.nota && <span style={{ fontSize: 12, color: '#a09e99', marginLeft: 4, cursor: 'help' }} title={g.nota}>📝</span>}
                        </td>
                      </tr>
                    );
                  }),
                ];
              })
            )}
          </tbody>
        </table>
        <div style={{ padding: '9px 12px', fontSize: 11, color: '#6b6a66', background: '#f5f4f0', borderTop: '1px solid #e0ddd5', display: 'flex', justifyContent: 'space-between' }}>
          <span>Mostrando {filtered.length} de {inYear.length} gastos de {year}</span>
          <span>Base: {fmt(filtered.reduce((s,g)=>s+recBase(g),0))} · IVA deducible: {fmt(filtered.reduce((s,g)=>s+recIVA(g),0))}</span>
        </div>
      </div>

      {modalOpen && (
        <GastoModal
          gasto={editing}
          proveedores={proveedores}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModalOpen(false)}
          isPending={isPending}
        />
      )}
    </>
  );
}
