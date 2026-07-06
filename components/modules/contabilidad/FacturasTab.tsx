'use client';

import { useState, useEffect } from 'react';
import type { Factura, Cliente, Presupuesto } from '@/lib/types';
import { recBase, recIVA, recIRPF, recTotal, fmt, trimOf, yearOf, allYears, fechaCorta } from './calculos';
import { esFacturaReal } from '@/lib/utils/facturas';
import { upsertFactura, deleteFactura } from './actions';
import { TAGS } from './constants';
import FacturaModal from './FacturaModal';

interface Props {
  facturas: Factura[];
  onUpdate: (f: Factura[]) => void;
  clientes: Cliente[];
  presupuestos: Presupuesto[];
  initialClienteNIF?: string;
  initialFacturaId?: string;
  isPending: boolean;
  startTransition: (fn: () => Promise<void>) => void;
}

const tagById = (id: string) => TAGS.find(t => t.id === id);

const BADGE: Record<string, { bg: string; color: string }> = {
  cobrada:   { bg: '#e8f3ec', color: '#2e7d46' },
  pendiente: { bg: '#fbf3e0', color: '#b07a1e' },
};

export default function FacturasTab({ facturas, onUpdate, clientes, presupuestos, initialClienteNIF, initialFacturaId, isPending, startTransition }: Props) {
  const years = allYears(facturas, []);
  const curYear = new Date().getFullYear();

  const [year, setYear]     = useState(years.includes(curYear) ? curYear : (years[0] ?? curYear));
  const [month, setMonth]   = useState(0); // 0 = todos los meses
  const [estado, setEstado] = useState('');
  const [trim, setTrim]     = useState('');
  const [tag, setTag]       = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Factura | null | 'new'>('new');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTipo, setModalTipo] = useState<'factura' | 'proforma'>('factura');

  useEffect(() => {
    if (initialFacturaId) {
      const f = facturas.find(x => x.id === initialFacturaId);
      if (f) { setEditing(f); setModalTipo(f.tipo ?? 'factura'); setModalOpen(true); return; }
    }
    if (!initialClienteNIF) return;
    setEditing(null);
    setModalOpen(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Único array filtrado — fuente de verdad para lista y KPIs
  const inYear = facturas.filter(f => yearOf(f.fecha) === year);
  const filtered = inYear.filter(f => {
    if (month > 0) {
      const d = new Date(f.fecha + 'T00:00:00');
      if (isNaN(d.getTime()) || d.getMonth() + 1 !== month) return false;
    }
    if (trim   && trimOf(f.fecha) !== trim) return false;
    if (estado && f.estado !== estado) return false;
    if (tag    && !(f.tags ?? []).includes(tag)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(f.numero + ' ' + f.cliente + ' ' + f.concepto).toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Proformas excluidas de KPIs y totales
  const filteredReal = filtered.filter(esFacturaReal);

  // KPIs siempre derivados de filteredReal — imposible que diverjan de la lista
  const emitido   = filteredReal.reduce((s, f) => s + recBase(f), 0);
  const ivaTotal  = filteredReal.reduce((s, f) => s + recIVA(f), 0);
  const cobrado   = filteredReal.filter(f => f.estado === 'cobrada').reduce((s, f) => s + recTotal(f), 0);
  const pendiente = filteredReal.filter(f => f.estado === 'pendiente').reduce((s, f) => s + recTotal(f), 0);
  const irpf      = filteredReal.reduce((s, f) => s + recIRPF(f), 0);

  const kpiLabel = month > 0
    ? `${new Date(year, month - 1).toLocaleString('es-ES', { month: 'long' })} ${year}`
    : trim ? `${trim} ${year}` : String(year);

  function openNew() {
    setEditing(null);
    setModalTipo('factura');
    setModalOpen(true);
  }

  function openNewProforma() {
    setEditing(null);
    setModalTipo('proforma');
    setModalOpen(true);
  }

  function openEdit(f: Factura) {
    setEditing(f);
    setModalTipo(f.tipo ?? 'factura');
    setModalOpen(true);
  }

  function handleSave(f: Factura) {
    startTransition(async () => {
      const updated = await upsertFactura(f);
      onUpdate(updated);
      setModalOpen(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const updated = await deleteFactura(id);
      onUpdate(updated);
      setModalOpen(false);
    });
  }

  function nextFacturaNumero(allFacturas: Factura[]): string {
    const today = new Date();
    const curYear = today.getFullYear();
    const yy = String(curYear).slice(2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const max = allFacturas
      .filter(esFacturaReal)
      .filter(f => yearOf(f.fecha) === curYear)
      .map(f => parseInt(f.numero.split('-')[1] ?? '0', 10))
      .filter(n => !isNaN(n))
      .reduce((a, b) => Math.max(a, b), 0);
    return `FA${yy}${mm}-${String(max + 1).padStart(3, '0')}`;
  }

  function handleConvertir(e: React.MouseEvent, f: Factura) {
    e.stopPropagation();
    if (!confirm(`¿Convertir la proforma "${f.numero}" en factura?\n\nSe le asignará el siguiente número correlativo y la fecha de hoy.`)) return;
    const converted: Factura = {
      ...f,
      tipo: 'factura',
      numero: nextFacturaNumero(facturas),
      fecha: new Date().toISOString().slice(0, 10),
    };
    startTransition(async () => {
      const updated = await upsertFactura(converted);
      onUpdate(updated);
    });
  }

  const kpiStyle = (col?: string): React.CSSProperties => ({
    background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '12px 14px',
  });
  const kpiLbl: React.CSSProperties = { fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 5 };
  const kpiVal = (col = '#333'): React.CSSProperties => ({ fontSize: 20, fontWeight: 600, color: col, letterSpacing: '-.01em', fontVariantNumeric: 'tabular-nums' });

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
        <select style={filterInp} value={estado} onChange={e => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="cobrada">Cobrada</option>
          <option value="pendiente">Pendiente</option>
        </select>
        <select style={filterInp} value={trim} onChange={e => setTrim(e.target.value)}>
          <option value="">Todos los trimestres</option>
          {['T1','T2','T3','T4'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={filterInp} value={tag} onChange={e => setTag(e.target.value)}>
          <option value="">Todas las etiquetas</option>
          {TAGS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <input type="text" style={{ ...filterInp, width: 230 }} placeholder="🔍 Buscar nº, cliente, concepto…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ flex: 1 }} />
        <button onClick={openNew} disabled={isPending}
          style={{ height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', background: '#333', color: '#fff', border: 'none' }}>
          + Nueva factura
        </button>
        <button onClick={openNewProforma} disabled={isPending}
          style={{ height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', background: '#fff', color: '#c0392b', border: '1px solid #e3b4ae' }}>
          + Nueva proforma
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 16 }}>
        <div style={kpiStyle()}><div style={kpiLbl}>Base imp. {kpiLabel}</div><div style={kpiVal()}>{fmt(emitido)}</div></div>
        <div style={kpiStyle()}><div style={kpiLbl}>Total IVA</div><div style={kpiVal()}>{fmt(ivaTotal)}</div></div>
        <div style={kpiStyle()}><div style={kpiLbl}>Emitido c/IVA</div><div style={kpiVal()}>{fmt(emitido + ivaTotal)}</div></div>
        <div style={kpiStyle()}><div style={kpiLbl}>Cobrado</div><div style={kpiVal('#2e7d46')}>{fmt(cobrado)}</div></div>
        <div style={kpiStyle()}><div style={kpiLbl}>Pendiente cobro</div><div style={kpiVal('#b07a1e')}>{fmt(pendiente)}</div></div>
        <div style={kpiStyle()}><div style={kpiLbl}>IRPF retenido</div><div style={kpiVal()}>{fmt(irpf)}</div></div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f4f0' }}>
              {['Nº','Fecha','Cliente / Concepto','Base imp.','IVA','IRPF','Total','Estado','Anotación'].map((h, i) => (
                <th key={h} style={{ fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99', fontWeight: 500, padding: '9px 12px', borderBottom: '1px solid #e0ddd5', textAlign: i >= 3 && i <= 6 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 50, color: '#a09e99', fontSize: 13 }}>
                {inYear.length === 0 ? 'Sin facturas. Pulsa "+ Nueva factura".' : 'Sin resultados para este filtro.'}
              </td></tr>
            ) : (
              (['T1','T2','T3','T4'] as const).flatMap(tg => {
                const rows = filtered.filter(f => trimOf(f.fecha) === tg);
                if (!rows.length) return [];
                const gb = rows.filter(esFacturaReal).reduce((s, f) => s + recBase(f), 0);
                const gt = rows.filter(esFacturaReal).reduce((s, f) => s + recTotal(f), 0);
                return [
                  <tr key={`hdr-${tg}`} style={{ background: '#efece5' }}>
                    <td colSpan={3} style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: '#6b6a66' }}>
                      {tg} {year} · {rows.length} fact.
                    </td>
                    <td style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(gb)}</td>
                    <td colSpan={2} />
                    <td style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(gt)}</td>
                    <td colSpan={2} />
                  </tr>,
                  ...rows.map(f => {
                    const tint = (f.tags?.length && tagById(f.tags[0]))
                      ? `inset 3px 0 0 ${tagById(f.tags[0])!.color}` : '';
                    const badge = BADGE[f.estado] ?? BADGE.pendiente;
                    return (
                      <tr key={f.id} style={{ borderBottom: '1px solid #f0eee9', cursor: 'pointer', boxShadow: tint }}
                        onClick={() => openEdit(f)}
                        onMouseEnter={e => (e.currentTarget.style.background = '#faf9f6')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '9px 12px', fontSize: 12 }}>
                          {f.numero}
                          {f.tipo === 'proforma' && (
                            <>
                              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 8, color: '#c0392b', background: '#fdecea', border: '1px solid #e3b4ae' }}>Proforma</span>
                              <button
                                onClick={e => handleConvertir(e, f)}
                                disabled={isPending}
                                style={{ marginLeft: 8, fontSize: 10, padding: '1px 7px', borderRadius: 8, cursor: 'pointer', background: '#eaf3eb', color: '#2e7d46', border: '1px solid #a8d5b0', fontFamily: 'inherit', fontWeight: 600 }}>
                                Convertir en factura
                              </button>
                            </>
                          )}
                        </td>
                        <td style={{ padding: '9px 12px', fontSize: 12, color: '#a09e99' }}>{fechaCorta(f.fecha)}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12 }}>
                          <div>{f.cliente !== '—' ? f.cliente : <span style={{ color: '#a09e99' }}>—</span>}</div>
                          {f.concepto && <div style={{ fontSize: 11, color: '#a09e99', marginTop: 1 }}>{f.concepto}</div>}
                        </td>
                        <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(recBase(f))}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', color: '#a09e99', fontVariantNumeric: 'tabular-nums' }}>{fmt(recIVA(f))}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', color: '#a09e99', fontVariantNumeric: 'tabular-nums' }}>{recIRPF(f) ? '−' + fmt(recIRPF(f)) : '—'}</td>
                        <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(recTotal(f))}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: badge.bg, color: badge.color }}>{f.estado}</span>
                        </td>
                        <td style={{ padding: '9px 12px', fontSize: 12 }}>
                          {(f.tags ?? []).map(id => {
                            const t = tagById(id);
                            return t ? <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 500, border: `1px solid ${t.color}`, color: t.color, background: t.color + '14', marginRight: 3 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.color }} />{t.label}
                            </span> : null;
                          })}
                          {f.nota && <span style={{ fontSize: 12, color: '#a09e99', cursor: 'help' }} title={f.nota}>📝</span>}
                          {!(f.tags?.length) && !f.nota && <span style={{ color: '#a09e99' }}>—</span>}
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
          <span>Mostrando {filtered.length} de {inYear.length} facturas de {year}</span>
          <span>Base: {fmt(filteredReal.reduce((s,f) => s+recBase(f),0))} · IVA: {fmt(filteredReal.reduce((s,f) => s+recIVA(f),0))} · IRPF: {fmt(filteredReal.reduce((s,f) => s+recIRPF(f),0))}</span>
        </div>
      </div>

      {modalOpen && (
        <FacturaModal
          factura={editing as Factura | null}
          facturas={facturas}
          clientes={clientes}
          presupuestos={presupuestos}
          initialClienteNIF={editing === null ? initialClienteNIF : undefined}
          initialTipo={editing === null ? modalTipo : undefined}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModalOpen(false)}
          isPending={isPending}
        />
      )}
    </>
  );
}
