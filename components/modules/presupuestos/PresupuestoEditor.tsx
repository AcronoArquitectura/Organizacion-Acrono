'use client';

import { useState } from 'react';
import type { Presupuesto, Cliente, PemRow } from '@/lib/types';
import {
  FL_OPTS, FT_VIV, FC_VIV, USOS_OTROS, USOS_URB, CAPS_EDIF, CAPS_URB,
  capsFor, plantillaDef, fcSugerido, EXTRAS_LIST, OBSERVACIONES_SEED,
  mcBase, rowEurM2, pemTotal, m2Totales, escala,
  doHoras, doEurMes, honorariosLineas, honorariosBase,
} from '@/lib/utils/coag';
import PresupuestoSummary from './PresupuestoSummary';
import { openPresupuestoPDF } from './presupuestoPDF';

interface Props {
  presupuesto: Presupuesto;
  clientes: Cliente[];
  onSave: (p: Presupuesto) => void;
  onCancel: () => void;
  isPending: boolean;
}

const S = {
  panel: { background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '16px 18px', marginBottom: 14 } as React.CSSProperties,
  title: { fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#a09e99', marginBottom: 12, fontWeight: 500 },
  inp:  { width: '100%', height: 30, padding: '0 8px', border: '1px solid #c8c4bc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#333' } as React.CSSProperties,
  lbl:  { display: 'block', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: '#a09e99', marginBottom: 4 },
  fg:   { marginBottom: 12 } as React.CSSProperties,
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 } as React.CSSProperties,
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 } as React.CSSProperties,
};

const fmt = (n: number) => Math.round(n).toLocaleString('es-ES') + ' €';

export default function PresupuestoEditor({ presupuesto, clientes, onSave, onCancel, isPending }: Props) {
  const [p, setP] = useState<Presupuesto>(presupuesto);

  function upd(patch: Partial<Presupuesto>) {
    setP(prev => ({ ...prev, ...patch }));
  }

  // Familia change: reset capitulos and tareas
  function setFamilia(familia: Presupuesto['familia']) {
    const caps = capsFor(familia);
    upd({
      familia,
      capitulos: caps.map(c => ({ key: c[0], label: c[1], max: c[2], real: c[2] })),
    });
  }

  // Plantilla change: reset tareas
  function setPlantilla(plantilla: Presupuesto['plantilla']) {
    upd({ plantilla, tareas: plantillaDef(plantilla) });
  }

  // PEM row operations
  function setPemRow(i: number, patch: Partial<PemRow>) {
    const rows = [...p.pemRows];
    rows[i] = { ...rows[i], ...patch };
    upd({ pemRows: rows });
  }
  function addPemRow() {
    upd({ pemRows: [...p.pemRows, { concepto: '', m2: 0, computaM2: false, modo: 'auto', coef: 0.5, eurM2: 0 }] });
  }
  function delPemRow(i: number) {
    if (p.pemRows.length <= 1) return;
    upd({ pemRows: p.pemRows.filter((_, idx) => idx !== i) });
  }

  // Tarea sub-hour change
  function setSubH(taskKey: string, subIdx: number, h: number) {
    const tareas = { ...p.tareas };
    const sub = [...tareas[taskKey].sub];
    sub[subIdx] = { ...sub[subIdx], h };
    tareas[taskKey] = { ...tareas[taskKey], sub };
    upd({ tareas });
  }

  // Capitulo real change
  function setCapReal(i: number, real: number) {
    const caps = [...p.capitulos];
    caps[i] = { ...caps[i], real };
    upd({ capitulos: caps });
  }

  const I3 = escala(p);
  const m2T = m2Totales(p);
  const tpl = p.plantilla === 'reforma' ? 'reforma' : 'nueva';

  return (
    <div style={{ padding: '18px 20px', maxWidth: 1340 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={onCancel}
          style={{ height: 30, padding: '0 12px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}>
          ← Volver
        </button>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{p.numero}</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => openPresupuestoPDF(p)}
          style={{ height: 30, padding: '0 12px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}>
          Vista PDF
        </button>
        <button onClick={() => onSave(p)} disabled={isPending}
          style={{ height: 30, padding: '0 16px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: isPending ? 'wait' : 'pointer', border: 'none', background: '#333', color: '#fff', opacity: isPending ? 0.6 : 1 }}>
          {isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>
        {/* ── LEFT COLUMN ────────────────────────────────────────────────── */}
        <div>

          {/* Panel Datos */}
          <div style={S.panel}>
            <div style={S.title}>Datos</div>
            <div style={S.row2}>
              <div>
                <label style={S.lbl}>Número</label>
                <input style={S.inp} value={p.numero} onChange={e => upd({ numero: e.target.value })} />
              </div>
              <div>
                <label style={S.lbl}>Fecha</label>
                <input type="date" style={S.inp} value={p.fecha} onChange={e => upd({ fecha: e.target.value })} />
              </div>
            </div>
            <div style={S.fg}>
              <label style={S.lbl}>Cliente</label>
              <select style={S.inp} value={p.clienteRefId ?? ''}
                onChange={e => {
                  const cli = clientes.find(c => c.id === e.target.value);
                  upd({
                    clienteRefId: e.target.value || null,
                    cliente: cli
                      ? { nombre: cli.nombre, dni: cli.nif, tel: cli.tel, email: cli.email, dir1: cli.dir1, dir2: cli.dir2, dir3: cli.dir3 }
                      : p.cliente,
                  });
                }}>
                <option value="">— Sin cliente vinculado —</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div style={S.row2}>
              <div>
                <label style={S.lbl}>Nombre del cliente</label>
                <input style={S.inp} value={p.cliente.nombre} onChange={e => upd({ cliente: { ...p.cliente, nombre: e.target.value } })} />
              </div>
              <div>
                <label style={S.lbl}>NIF / CIF</label>
                <input style={S.inp} value={p.cliente.dni} onChange={e => upd({ cliente: { ...p.cliente, dni: e.target.value } })} />
              </div>
            </div>
            <div style={S.fg}>
              <label style={S.lbl}>Título del proyecto</label>
              <input style={S.inp} value={p.proyecto.titulo} onChange={e => upd({ proyecto: { ...p.proyecto, titulo: e.target.value } })} />
            </div>
            <div style={S.row2}>
              <div>
                <label style={S.lbl}>Municipio</label>
                <input style={S.inp} value={p.proyecto.lugarMunicipio} onChange={e => upd({ proyecto: { ...p.proyecto, lugarMunicipio: e.target.value } })} />
              </div>
              <div>
                <label style={S.lbl}>Dirección</label>
                <input style={S.inp} value={p.proyecto.lugarDir} onChange={e => upd({ proyecto: { ...p.proyecto, lugarDir: e.target.value } })} />
              </div>
            </div>
          </div>

          {/* Panel Intervención */}
          <div style={S.panel}>
            <div style={S.title}>Intervención COAG</div>
            <div style={S.row2}>
              <div>
                <label style={S.lbl}>Familia</label>
                <select style={S.inp} value={p.familia} onChange={e => setFamilia(e.target.value as Presupuesto['familia'])}>
                  <option value="viviendas">Viviendas</option>
                  <option value="otros">Otros usos</option>
                  <option value="urbanizacion">Urbanización</option>
                </select>
              </div>
              <div>
                <label style={S.lbl}>Plantilla</label>
                <select style={S.inp} value={p.plantilla} onChange={e => setPlantilla(e.target.value as Presupuesto['plantilla'])}>
                  <option value="nueva">Obra nueva</option>
                  <option value="reforma">Reforma</option>
                </select>
              </div>
            </div>

            {/* Localización */}
            <div style={{ marginBottom: 10 }}>
              <label style={S.lbl}>Localización (Fl)</label>
              <select style={S.inp} value={p.flKey} onChange={e => upd({ flKey: e.target.value as 'A' | 'B' })}>
                {FL_OPTS.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
              </select>
            </div>

            {/* Viviendas */}
            {p.familia === 'viviendas' && (
              <>
                <div style={S.row3}>
                  <div>
                    <label style={S.lbl}>Mo (€/m²)</label>
                    <input type="number" style={S.inp} value={p.mo} onChange={e => upd({ mo: +e.target.value })} />
                  </div>
                  <div>
                    <label style={S.lbl}>Tipología (Ft)</label>
                    <select style={S.inp} value={p.ftKey} onChange={e => upd({ ftKey: e.target.value as Presupuesto['ftKey'] })}>
                      {FT_VIV.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.lbl}>Calidad (Fc)</label>
                    <select style={S.inp} value={p.fcKey} onChange={e => upd({ fcKey: e.target.value as Presupuesto['fcKey'] })}>
                      {FC_VIV.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#a09e99', marginTop: -8, marginBottom: 10 }}>
                  Mc = {p.mo} × {(FL_OPTS.find(x => x.k === p.flKey)?.v ?? 1).toFixed(2)} × {(FT_VIV.find(x => x.k === p.ftKey)?.v ?? 1).toFixed(2)} × {(FC_VIV.find(x => x.k === p.fcKey)?.v ?? 1).toFixed(2)} = <b style={{ color: '#333' }}>{fmt(mcBase(p))}/m²</b>
                </div>
              </>
            )}

            {/* Otros usos */}
            {p.familia === 'otros' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={S.lbl}>Mo (€/m²)</label>
                  <input type="number" style={S.inp} value={p.mo} onChange={e => upd({ mo: +e.target.value })} />
                </div>
                <div>
                  <label style={S.lbl}>Uso</label>
                  <select style={S.inp} value={p.usoKey} onChange={e => upd({ usoKey: e.target.value })}>
                    <option value="">— Selecciona uso —</option>
                    {USOS_OTROS.map(g => (
                      <optgroup key={g.g} label={g.g}>
                        {g.items.map(it => <option key={it[0]} value={it[0]}>{it[1]} (×{it[2]})</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Urbanización */}
            {p.familia === 'urbanizacion' && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={p.urbCalle} onChange={e => upd({ urbCalle: e.target.checked })} />
                  Urbanización completa de calle (93,50 €/m² fijo)
                </label>
                {!p.urbCalle && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={S.lbl}>Mu (€/m²)</label>
                      <input type="number" style={S.inp} value={p.mu} onChange={e => upd({ mu: +e.target.value })} />
                    </div>
                    <div>
                      <label style={S.lbl}>Tipo</label>
                      <select style={S.inp} value={p.usoKey} onChange={e => upd({ usoKey: e.target.value })}>
                        <option value="">— Selecciona —</option>
                        {USOS_URB.map(g => (
                          <optgroup key={g.g} label={g.g}>
                            {g.items.map(it => <option key={it[0]} value={it[0]}>{it[1]}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel PEM */}
          <div style={S.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={S.title}>Presupuesto de Ejecución Material (PEM)</div>
              <button onClick={addPemRow}
                style={{ height: 24, padding: '0 10px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', borderRadius: 6, background: '#fff', color: '#6b6a66' }}>
                + Fila
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f5f4f0' }}>
                  {['Concepto','m²','Computa','Modo','Coef / €/m²','€/m²','Total',''].map(h => (
                    <th key={h} style={{ fontSize: 10, letterSpacing: '.05em', textTransform: 'uppercase', color: '#a09e99', fontWeight: 500, padding: '6px 8px', borderBottom: '1px solid #e0ddd5', textAlign: h === 'Total' || h === '€/m²' ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.pemRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0eee9' }}>
                    <td style={{ padding: '5px 6px' }}>
                      <input style={{ ...S.inp, height: 26 }} value={r.concepto} onChange={e => setPemRow(i, { concepto: e.target.value })} />
                    </td>
                    <td style={{ padding: '5px 6px', width: 70 }}>
                      <input type="number" min="0" style={{ ...S.inp, height: 26, textAlign: 'right' }} value={r.m2 || ''} onChange={e => setPemRow(i, { m2: +e.target.value || 0 })} />
                    </td>
                    <td style={{ padding: '5px 6px', textAlign: 'center', width: 60 }}>
                      <input type="checkbox" checked={r.computaM2} onChange={e => setPemRow(i, { computaM2: e.target.checked })} />
                    </td>
                    <td style={{ padding: '5px 6px', width: 80 }}>
                      <select style={{ ...S.inp, height: 26, fontSize: 11 }} value={r.modo} onChange={e => setPemRow(i, { modo: e.target.value as 'auto' | 'manual' })}>
                        <option value="auto">Auto</option>
                        <option value="manual">Manual</option>
                      </select>
                    </td>
                    <td style={{ padding: '5px 6px', width: 80 }}>
                      {r.modo === 'auto'
                        ? <input type="number" min="0" step="0.1" style={{ ...S.inp, height: 26, textAlign: 'right' }} value={r.coef} onChange={e => setPemRow(i, { coef: +e.target.value })} />
                        : <input type="number" min="0" style={{ ...S.inp, height: 26, textAlign: 'right' }} value={r.eurM2 || ''} onChange={e => setPemRow(i, { eurM2: +e.target.value || 0 })} />
                      }
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 11, color: '#6b6a66' }}>
                      {Math.round(rowEurM2(p, r)).toLocaleString('es-ES')}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {Math.round((r.m2 || 0) * rowEurM2(p, r)).toLocaleString('es-ES')} €
                    </td>
                    <td style={{ padding: '5px 6px', width: 28 }}>
                      {p.pemRows.length > 1 && (
                        <button onClick={() => delPemRow(i)} style={{ width: 24, height: 26, border: 'none', background: 'none', cursor: 'pointer', color: '#a09e99', fontSize: 16 }}>×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f5f4f0', fontWeight: 600 }}>
                  <td colSpan={6} style={{ padding: '7px 8px', fontSize: 11, textAlign: 'right' }}>PEM TOTAL · I3 = {I3.toFixed(3)} · m² = {m2T}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Math.round(pemTotal(p)).toLocaleString('es-ES')} €</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Panel Capítulos */}
          <div style={S.panel}>
            <div style={S.title}>Capítulos (coeficiente de obra)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {p.capitulos.map((c, i) => (
                <div key={c.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f4f2ed' }}>
                  <span style={{ fontSize: 11, color: '#6b6a66', flex: 1 }}>{c.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="number" min="0" max={c.max} step="0.5"
                      style={{ width: 52, height: 26, padding: '0 6px', border: '1px solid #c8c4bc', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', textAlign: 'right', outline: 'none' }}
                      value={c.real} onChange={e => setCapReal(i, +e.target.value || 0)} />
                    <span style={{ fontSize: 10, color: '#a09e99', width: 16 }}>%</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#6b6a66', textAlign: 'right' }}>
              Suma: {p.capitulos.reduce((s, c) => s + (+c.real || 0), 0).toFixed(1)}% ·
              Coef. capítulos = {(p.capitulos.reduce((s, c) => s + (+c.real || 0), 0) / 100).toFixed(3)}
            </div>
          </div>

          {/* Panel Honorarios */}
          <div style={S.panel}>
            <div style={S.title}>Honorarios por horas</div>

            {/* Parámetros base */}
            <div style={{ ...S.row3, marginBottom: 16 }}>
              <div>
                <label style={S.lbl}>€/hora</label>
                <input type="number" min="1" style={S.inp} value={p.eurHora} onChange={e => upd({ eurHora: +e.target.value })} />
              </div>
              <div>
                <label style={S.lbl}>Superficie parcela (m²)</label>
                <input type="number" min="0" style={S.inp} value={p.superficieParcela || ''} onChange={e => upd({ superficieParcela: +e.target.value || 0 })} />
              </div>
              <div>
                <label style={S.lbl}>Complejidad k</label>
                <input type="number" min="0.1" step="0.1" style={S.inp} value={p.complejidadK} onChange={e => upd({ complejidadK: +e.target.value })} />
              </div>
            </div>

            {/* Entregables */}
            <div style={{ fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 8, fontWeight: 500 }}>
              Entregables (I3={I3.toFixed(3)})
            </div>
            {Object.entries(p.tareas).map(([key, tarea]) => {
              const h = tarea.sub.reduce((s, s2) => s + (+s2.h || 0), 0);
              const imp = h * (tarea.escala ? I3 : 1) * p.eurHora;
              return (
                <details key={key} style={{ marginBottom: 8, border: '1px solid #f0eee9', borderRadius: 4 }}>
                  <summary style={{ padding: '7px 10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 500 }}>
                    <span>{tarea.escala ? '↗' : '—'} {key}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: '#6b6a66' }}>{h}h → {fmt(imp)}</span>
                  </summary>
                  <div style={{ padding: '8px 10px', background: '#faf9f6' }}>
                    {tarea.sub.map((sub, si) => (
                      <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ flex: 1, fontSize: 11, color: '#6b6a66' }}>{sub.label}</span>
                        <input type="number" min="0"
                          style={{ width: 60, height: 24, padding: '0 6px', border: '1px solid #c8c4bc', borderRadius: 4, fontSize: 11, fontFamily: 'inherit', textAlign: 'right', outline: 'none' }}
                          value={sub.h} onChange={e => setSubH(key, si, +e.target.value || 0)} />
                        <span style={{ fontSize: 10, color: '#a09e99', width: 12 }}>h</span>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}

            {/* D.O. */}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e0ddd5' }}>
              <div style={{ fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 8, fontWeight: 500 }}>
                Dirección de obra — {fmt(doEurMes(p))}/mes × {p.duracionMeses} m = {fmt(doEurMes(p) * p.duracionMeses)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {[
                  { lbl: 'Duración (meses)', key: 'duracionMeses' },
                  { lbl: 'Visitas/mes', key: 'visitasMes' },
                  { lbl: 'Km ida/vuelta', key: 'km' },
                  { lbl: 'h extra/visita', key: 'horasVisita' },
                ].map(({ lbl, key: k }) => (
                  <div key={k}>
                    <label style={S.lbl}>{lbl}</label>
                    <input type="number" min="0" style={S.inp}
                      value={(p as unknown as Record<string, number>)[k] ?? 0}
                      onChange={e => upd({ [k]: +e.target.value || 0 } as Partial<Presupuesto>)} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: '#a09e99' }}>
                h D.O. = {p.duracionMeses}m × {p.visitasMes}v × 3 + {p.duracionMeses}m × 16 = {doHoras(p)}h
              </div>
            </div>

            {/* DRS */}
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ ...S.lbl, margin: 0, minWidth: 120 }}>DRS (€/m²)</label>
              <input type="number" min="0" step="0.1" style={{ ...S.inp, width: 80 }}
                value={p.drsEurM2} onChange={e => upd({ drsEurM2: +e.target.value })} />
              <span style={{ fontSize: 11, color: '#6b6a66' }}>× {m2T} m² = {fmt(m2T * p.drsEurM2)}</span>
            </div>

            {/* Extras aplicados */}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e0ddd5' }}>
              <div style={{ fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 8, fontWeight: 500 }}>Extras (no escalan)</div>
              {p.extras.map((ex, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <input type="checkbox" checked={ex.aplica} onChange={e => {
                    const extras = [...p.extras]; extras[i] = { ...ex, aplica: e.target.checked }; upd({ extras });
                  }} />
                  <span style={{ flex: 1, fontSize: 11 }}>{ex.label}</span>
                  {ex.aplica && (
                    <>
                      <input type="number" min="0"
                        style={{ width: 60, height: 24, padding: '0 6px', border: '1px solid #c8c4bc', borderRadius: 4, fontSize: 11, fontFamily: 'inherit', textAlign: 'right', outline: 'none' }}
                        value={ex.horas} onChange={e => {
                          const extras = [...p.extras]; extras[i] = { ...ex, horas: +e.target.value || 0 }; upd({ extras });
                        }} />
                      <span style={{ fontSize: 10, color: '#a09e99', width: 20 }}>h</span>
                      <span style={{ fontSize: 11, color: '#6b6a66', width: 70, textAlign: 'right' }}>{fmt(ex.horas * p.eurHora)}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Panel Estado */}
          <div style={S.panel}>
            <div style={S.title}>Estado y ajuste</div>
            <div style={S.row2}>
              <div>
                <label style={S.lbl}>Estado</label>
                <select style={S.inp} value={p.estado} onChange={e => upd({ estado: e.target.value as Presupuesto['estado'] })}>
                  <option value="borrador">Borrador</option>
                  <option value="enviado">Enviado</option>
                  <option value="aceptado">Aceptado</option>
                  <option value="rechazado">Rechazado</option>
                </select>
              </div>
              <div>
                <label style={S.lbl}>Ajuste / descuento (%)</label>
                <input type="number" step="0.5" style={S.inp} value={p.ajustePct}
                  onChange={e => upd({ ajustePct: +e.target.value })} />
              </div>
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN (sticky) ────────────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 66 }}>
          <PresupuestoSummary p={p} onSave={() => onSave(p)} onPDF={() => openPresupuestoPDF(p)} isPending={isPending} />
        </div>
      </div>
    </div>
  );
}
