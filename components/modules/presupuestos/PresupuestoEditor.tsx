'use client';

import { useState, useRef, useEffect } from 'react';
import type { Presupuesto, Cliente, PemRow, Partida } from '@/lib/types';
import {
  FL_OPTS, FT_VIV, FC_VIV, USOS_OTROS, USOS_URB, OBSERVACIONES_SEED,
  capsFor, plantillaDef, mcBase, rowEurM2, pemTotal, m2Totales,
  escala, doEurMes, honorariosLineas, honorariosBase, costesTotales,
  calcPartidasDef,
} from '@/lib/utils/coag';
import PresupuestoSummary from './PresupuestoSummary';
import { openPresupuestoPDF } from './presupuestoPDF';
import { useRouter } from 'next/navigation';

// ── fmt 2 decimales (igual que presupuestos.html) ─────────────────────────────
const fmt = (n: number) =>
  (Math.round((+n || 0) * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

// ── Estilos compartidos ───────────────────────────────────────────────────────
const P = {
  panel:  { background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '15px 16px', marginBottom: 14 } as React.CSSProperties,
  title:  { fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#a09e99', marginBottom: 12, fontWeight: 500 },
  inp:    { height: 30, padding: '0 8px', border: '1px solid #c8c4bc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#333', width: '100%' } as React.CSSProperties,
  lbl:    { display: 'block', fontSize: 10, letterSpacing: '.05em', textTransform: 'uppercase' as const, color: '#a09e99', marginBottom: 4 },
  fg:     { marginBottom: 11 } as React.CSSProperties,
  hint:   { fontSize: 10, color: '#a09e99', marginTop: 4, lineHeight: 1.4 } as React.CSSProperties,
  row2:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 11 } as React.CSSProperties,
  row3:   { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 11 } as React.CSSProperties,
  row4:   { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 11 } as React.CSSProperties,
};

interface Props {
  presupuesto: Presupuesto;
  clientes: Cliente[];
  isNew: boolean;
  onSave: (p: Presupuesto) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
  isPending: boolean;
}

export default function PresupuestoEditor({ presupuesto, clientes, isNew, onSave, onDelete, onCancel, isPending }: Props) {
  const [p, setP] = useState<Presupuesto>(presupuesto);
  const router = useRouter();
  const [showSugg, setShowSugg] = useState(false);
  const suppressing = useRef(false);
  const [dragPartidaIdx, setDragPartidaIdx] = useState<number | null>(null);
  const [overPartidaIdx, setOverPartidaIdx] = useState<number | null>(null);

  function upd(patch: Partial<Presupuesto>) { setP(prev => ({ ...prev, ...patch })); }

  const sugg = p.cliente.nombre.trim().length > 0
    ? clientes.filter(c => c.nombre.toLowerCase().includes(p.cliente.nombre.toLowerCase())).slice(0, 7)
    : [];

  function selectCliente(c: Cliente) {
    suppressing.current = true;
    upd({
      cliente: { nombre: c.nombre, dni: c.nif, tel: c.tel, email: c.email, dir1: c.direccionCalle, dir2: c.direccionCPCiudad, dir3: c.direccionProvincia },
      clienteRefId: c.id,
    });
    setShowSugg(false);
  }

  // Familia: reset capitulos
  function setFamilia(familia: Presupuesto['familia']) {
    const caps = capsFor(familia);
    upd({ familia, capitulos: caps.map(c => ({ key: c[0], label: c[1], max: c[2], real: c[2] })) });
  }

  // Plantilla: reset tareas
  function setPlantilla(plantilla: Presupuesto['plantilla']) {
    upd({ plantilla, tareas: plantillaDef(plantilla) });
  }

  function setPemRow(i: number, patch: Partial<PemRow>) {
    const rows = [...p.pemRows];
    rows[i] = { ...rows[i], ...patch };
    upd({ pemRows: rows });
  }

  function setSubH(taskKey: string, si: number, h: number) {
    const tareas = { ...p.tareas };
    const sub = [...tareas[taskKey].sub];
    sub[si] = { ...sub[si], h };
    tareas[taskKey] = { ...tareas[taskKey], sub };
    upd({ tareas });
  }

  function setCapReal(i: number, real: number) {
    const caps = [...p.capitulos];
    caps[i] = { ...caps[i], real };
    upd({ capitulos: caps });
  }

  function recalcPartidas() {
    upd({ partidas: calcPartidasDef(p) });
  }

  function addPartida() {
    const fases = p.fases?.length ? p.fases : ['FASE 1 · PROYECTO', 'FASE 2 · OBRA'];
    upd({ partidas: [...p.partidas, { fase: fases[0], concepto: '', importe: 0, tipo: 'fijo' }] });
  }

  function setPartida(i: number, patch: Partial<Partida>) {
    const parts = [...p.partidas];
    parts[i] = { ...parts[i], ...patch } as Partida;
    upd({ partidas: parts });
  }

  function delPartida(i: number) {
    upd({ partidas: p.partidas.filter((_, idx) => idx !== i) });
  }

  function movePartida(from: number, to: number) {
    if (from === to) return;
    const parts = [...p.partidas];
    const [item] = parts.splice(from, 1);
    parts.splice(to, 0, item);
    upd({ partidas: parts });
  }

  function addFase(name: string) {
    if (!name.trim()) return;
    const fases = p.fases ?? ['FASE 1 · PROYECTO', 'FASE 2 · OBRA'];
    if (!fases.includes(name.trim())) upd({ fases: [...fases, name.trim()] });
  }

  function delFase(f: string) {
    upd({ fases: (p.fases ?? []).filter(x => x !== f) });
  }

  function toggleObs(id: string, on: boolean) {
    const sel = [...p.observacionesSel];
    const i = sel.indexOf(id);
    if (on && i < 0) sel.push(id);
    if (!on && i >= 0) sel.splice(i, 1);
    upd({ observacionesSel: sel });
  }

  function addCustomObs(txt: string, grupo: string) {
    if (!txt.trim()) return;
    const id = 'oc_' + Date.now();
    const obs = [...(p.observacionesCustom ?? []), { id, grupo, txt }];
    upd({ observacionesCustom: obs, observacionesSel: [...p.observacionesSel, id] });
  }

  const I3 = escala(p);
  const m2T = m2Totales(p);
  const tpl = p.plantilla === 'reforma';
  const tplBase = tpl ? 100 : 250;
  const mc = mcBase(p);

  // Toggle button style
  const tog = (active: boolean): React.CSSProperties => ({
    height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit',
    cursor: 'pointer', border: '1px solid', display: 'inline-flex', alignItems: 'center',
    background: active ? '#333' : '#fff', color: active ? '#fff' : '#6b6a66',
    borderColor: active ? '#333' : '#c8c4bc', transition: 'background .12s',
  });

  const pref = p.fases ?? ['FASE 1 · PROYECTO', 'FASE 2 · OBRA'];

  return (
    <div style={{ padding: '18px 20px', maxWidth: 1340 }}>
      {/* Breadcrumb */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e0ddd5', padding: '8px 0', fontSize: 11, color: '#a09e99', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span onClick={onCancel} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Presupuestos</span>
        <span>›</span>
        <b style={{ color: '#333', fontWeight: 500 }}>{p.numero}</b>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16, alignItems: 'start' }}>

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <div>

          {/* Panel 1: Cliente y proyecto */}
          <div style={P.panel}>
            <div style={P.title}>Cliente y proyecto</div>
            <div style={P.row2}>
              <div style={P.fg}><label style={P.lbl}>Nº</label>
                <input style={P.inp} value={p.numero} onChange={e => upd({ numero: e.target.value })} />
              </div>
              <div style={P.fg}><label style={P.lbl}>Fecha</label>
                <input type="date" style={P.inp} value={p.fecha} onChange={e => upd({ fecha: e.target.value })} />
              </div>
            </div>
            <div style={{ ...P.fg, position: 'relative' }}>
              <label style={P.lbl}>Cliente (nombre / razón social)</label>
              <input
                style={P.inp}
                value={p.cliente.nombre}
                placeholder="Buscar cliente existente o escribir nuevo…"
                onChange={e => { upd({ cliente: { ...p.cliente, nombre: e.target.value }, clienteRefId: null }); setShowSugg(true); }}
                onFocus={() => { if (!suppressing.current) setShowSugg(true); suppressing.current = false; }}
                onBlur={() => setTimeout(() => setShowSugg(false), 150)}
              />
              {showSugg && sugg.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #c8c4bc', borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,.1)', zIndex: 200, maxHeight: 220, overflowY: 'auto', marginTop: 2 }}>
                  {sugg.map(c => (
                    <div
                      key={c.id}
                      onMouseDown={() => selectCliente(c)}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f0ede8', fontSize: 12, color: '#333' }}
                    >
                      <div style={{ fontWeight: 500 }}>{c.nombre}</div>
                      {c.nif && <div style={{ fontSize: 10, color: '#a09e99', marginTop: 1 }}>{c.nif}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={P.row3}>
              <div style={P.fg}><label style={P.lbl}>DNI/NIF</label>
                <input style={P.inp} value={p.cliente.dni} onChange={e => upd({ cliente: { ...p.cliente, dni: e.target.value } })} />
              </div>
              <div style={P.fg}><label style={P.lbl}>Teléfono</label>
                <input style={P.inp} value={p.cliente.tel} onChange={e => upd({ cliente: { ...p.cliente, tel: e.target.value } })} />
              </div>
              <div style={P.fg}><label style={P.lbl}>Email</label>
                <input style={P.inp} value={p.cliente.email} onChange={e => upd({ cliente: { ...p.cliente, email: e.target.value } })} />
              </div>
            </div>
            <div style={P.fg}><label style={P.lbl}>Dirección — calle y número</label>
              <input style={P.inp} value={p.cliente.dir1} onChange={e => upd({ cliente: { ...p.cliente, dir1: e.target.value } })} />
            </div>
            <div style={P.row2}>
              <div style={P.fg}><label style={P.lbl}>Código postal y ciudad</label>
                <input style={P.inp} value={p.cliente.dir2} onChange={e => upd({ cliente: { ...p.cliente, dir2: e.target.value } })} />
              </div>
              <div style={P.fg}><label style={P.lbl}>Provincia</label>
                <input style={P.inp} value={p.cliente.dir3} onChange={e => upd({ cliente: { ...p.cliente, dir3: e.target.value } })} />
              </div>
            </div>
            <div style={P.fg}><label style={P.lbl}>Título del proyecto</label>
              <input style={P.inp} value={p.proyecto.titulo} placeholder="Vivienda unifamiliar…" onChange={e => upd({ proyecto: { ...p.proyecto, titulo: e.target.value } })} />
            </div>
            <div style={P.row3}>
              <div style={P.fg}><label style={P.lbl}>Municipio actuación</label>
                <input style={P.inp} value={p.proyecto.lugarMunicipio} onChange={e => upd({ proyecto: { ...p.proyecto, lugarMunicipio: e.target.value } })} />
              </div>
              <div style={P.fg}><label style={P.lbl}>Dirección actuación</label>
                <input style={P.inp} value={p.proyecto.lugarDir} onChange={e => upd({ proyecto: { ...p.proyecto, lugarDir: e.target.value } })} />
              </div>
              <div style={P.fg}><label style={P.lbl}>Ref. catastral</label>
                <input style={P.inp} value={p.proyecto.refCatastral} onChange={e => upd({ proyecto: { ...p.proyecto, refCatastral: e.target.value } })} />
              </div>
            </div>
          </div>

          {/* Panel 2: Tipo de intervención */}
          <div style={P.panel}>
            <div style={P.title}>Tipo de intervención</div>
            <div style={P.fg}><label style={P.lbl}>Familia (módulos COAG)</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[['viviendas','Edificios de viviendas'],['otros','Otros usos'],['urbanizacion','Urbanización']].map(([v, l]) => (
                  <button key={v} style={tog(p.familia === v)} onClick={() => setFamilia(v as Presupuesto['familia'])}>{l}</button>
                ))}
              </div>
            </div>
            <div style={P.fg}><label style={P.lbl}>Plantilla de honorarios</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['nueva','Obra nueva'],['reforma','Rehabilitación / Reforma']].map(([v, l]) => (
                  <button key={v} style={tog(p.plantilla === v)} onClick={() => setPlantilla(v as Presupuesto['plantilla'])}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Panel 3: PEM · módulos COAG */}
          <div style={P.panel}>
            <div style={P.title}>PEM · módulos COAG</div>

            {/* Selectores según familia */}
            {p.familia === 'viviendas' && (<>
              <div style={P.row2}>
                <div style={P.fg}><label style={P.lbl}>Módulo base Mo (€/m²)</label>
                  <input type="number" step="0.01" style={P.inp} value={p.mo} onChange={e => upd({ mo: +e.target.value })} />
                </div>
                <div style={P.fg}><label style={P.lbl}>Localización (Fl)</label>
                  <select style={P.inp} value={p.flKey} onChange={e => upd({ flKey: e.target.value as 'A'|'B' })}>
                    {FL_OPTS.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={P.row2}>
                <div style={P.fg}><label style={P.lbl}>Tipología (Ft)</label>
                  <select style={P.inp} value={p.ftKey} onChange={e => upd({ ftKey: e.target.value as Presupuesto['ftKey'] })}>
                    {FT_VIV.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
                  </select>
                </div>
                <div style={P.fg}><label style={P.lbl}>Calidad (Fc)</label>
                  <select style={P.inp} value={p.fcKey} onChange={e => upd({ fcKey: e.target.value as Presupuesto['fcKey'] })}>
                    {FC_VIV.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </>)}

            {p.familia === 'otros' && (<>
              <div style={P.row2}>
                <div style={P.fg}><label style={P.lbl}>Módulo base Mo (€/m²)</label>
                  <input type="number" step="0.01" style={P.inp} value={p.mo} onChange={e => upd({ mo: +e.target.value })} />
                </div>
                <div style={P.fg}><label style={P.lbl}>Localización (Fl)</label>
                  <select style={P.inp} value={p.flKey} onChange={e => upd({ flKey: e.target.value as 'A'|'B' })}>
                    {FL_OPTS.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={P.fg}><label style={P.lbl}>Uso</label>
                <select style={P.inp} value={p.usoKey} onChange={e => upd({ usoKey: e.target.value })}>
                  <option value="">— Selecciona uso —</option>
                  {USOS_OTROS.map(g => (
                    <optgroup key={g.g} label={g.g}>
                      {g.items.map(it => <option key={it[0]} value={it[0]}>{it[1]} (×{it[2]})</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
            </>)}

            {p.familia === 'urbanizacion' && (<>
              <div style={P.row2}>
                <div style={P.fg}><label style={P.lbl}>Módulo base Mu (€/m²)</label>
                  <input type="number" step="0.01" style={P.inp} value={p.mu} onChange={e => upd({ mu: +e.target.value })} />
                </div>
                <div style={P.fg}><label style={P.lbl}>Localización (Fl)</label>
                  <select style={P.inp} value={p.flKey} onChange={e => upd({ flKey: e.target.value as 'A'|'B' })}>
                    {FL_OPTS.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={p.urbCalle} onChange={e => upd({ urbCalle: e.target.checked })} style={{ width: 'auto', height: 'auto' }} />
                Urbanización completa de calle (93,50 €/m²)
              </label>
              {!p.urbCalle && (
                <div style={P.fg}><label style={P.lbl}>Tipo</label>
                  <select style={P.inp} value={p.usoKey} onChange={e => upd({ usoKey: e.target.value })}>
                    <option value="">— Selecciona —</option>
                    {USOS_URB.map(g => (
                      <optgroup key={g.g} label={g.g}>
                        {g.items.map(it => <option key={it[0]} value={it[0]}>{it[1]}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}
            </>)}

            <div style={P.hint}>
              Mc base = <b>{fmt(mc)}/m²</b>. Cada fila usa Mc×coef (vivienda=1; garaje/piscina/porche≈0,5) o un €/m² manual.
            </div>

            {/* Tabla PEM */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e0ddd5' }}>
                  {['Concepto','m²','€/m²','Coef / €','m²t','Importe',''].map((h, i) => (
                    <th key={i} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: '#a09e99', fontWeight: 500, padding: '4px 6px', textAlign: h === 'Importe' || h === 'm²' ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.pemRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f4f2ed' }}>
                    <td style={{ padding: '4px 6px' }}>
                      <input style={{ ...P.inp, height: 28 }} value={r.concepto} onChange={e => setPemRow(i, { concepto: e.target.value })} />
                    </td>
                    <td style={{ padding: '4px 6px', width: 70 }}>
                      <input type="number" step="0.01" style={{ ...P.inp, height: 28, textAlign: 'right', width: '100%' }} value={r.m2 || ''} onChange={e => setPemRow(i, { m2: +e.target.value || 0 })} />
                    </td>
                    <td style={{ padding: '4px 6px', width: 96 }}>
                      <select style={{ ...P.inp, height: 28, fontSize: 11 }} value={r.modo} onChange={e => setPemRow(i, { modo: e.target.value as 'auto' | 'manual' })}>
                        <option value="auto">Mc×coef</option>
                        <option value="manual">Manual</option>
                      </select>
                    </td>
                    <td style={{ padding: '4px 6px', width: 78 }}>
                      {r.modo === 'manual'
                        ? <input type="number" step="0.01" style={{ ...P.inp, height: 28, textAlign: 'right', width: '100%' }} value={r.eurM2 || ''} onChange={e => setPemRow(i, { eurM2: +e.target.value || 0 })} />
                        : <input type="number" step="0.01" style={{ ...P.inp, height: 28, textAlign: 'right', width: '100%' }} value={r.coef} title="coeficiente sobre Mc" onChange={e => setPemRow(i, { coef: +e.target.value })} />
                      }
                    </td>
                    <td style={{ padding: '4px 6px', width: 34, textAlign: 'center' }} title="Computa en m² totales">
                      <input type="checkbox" checked={r.computaM2} onChange={e => setPemRow(i, { computaM2: e.target.checked })}
                        style={{ accentColor: '#b07a1e', width: 'auto', height: 'auto' }} />
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', width: 100 }}>
                      {fmt((r.m2 || 0) * rowEurM2(p, r))}
                    </td>
                    <td style={{ padding: '4px 4px', width: 26 }}>
                      {p.pemRows.length > 1 && (
                        <button onClick={() => upd({ pemRows: p.pemRows.filter((_, idx) => idx !== i) })}
                          style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', color: '#a09e99', fontSize: 15 }}>×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button onClick={() => upd({ pemRows: [...p.pemRows, { concepto: '', m2: 0, computaM2: false, modo: 'auto', coef: 0.5, eurM2: 0 }] })}
              style={{ height: 26, padding: '0 9px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333', marginTop: 6 }}>
              + Fila
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', fontSize: 12.5, borderTop: '1px solid #e0ddd5', marginTop: 8, fontWeight: 600 }}>
              <span style={{ fontSize: 11, color: '#a09e99' }}>PEM total</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(pemTotal(p))}</span>
            </div>
          </div>

          {/* Panel 4: Capítulos */}
          <div style={P.panel}>
            <div style={P.title}>Capítulos · % de obra (coeficiente sobre Mc y, en reforma, complejidad)</div>
            <div style={P.hint}>Por defecto 100% (obra completa). Baja el % de cada capítulo en intervenciones parciales/reforma.</div>
            <div style={{ marginTop: 8 }}>
              {p.capitulos.map((c, i) => (
                <div key={c.key} style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: 11, color: '#6b6a66' }}>{c.label} <span style={{ fontSize: 10, color: '#a09e99' }}>(máx {c.max}%)</span></label>
                  <input type="number" step="0.1" style={{ ...P.inp, height: 28, textAlign: 'right' }}
                    value={c.real} onChange={e => setCapReal(i, +e.target.value || 0)} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 12.5, borderTop: '1px solid #e0ddd5', marginTop: 8, fontWeight: 600 }}>
              <span style={{ fontSize: 11, color: '#a09e99' }}>Σ % capítulos</span>
              <span>{p.capitulos.reduce((s, c) => s + (+c.real || 0), 0).toFixed(1)}% → ×{(p.capitulos.reduce((s, c) => s + (+c.real || 0), 0) / 100).toFixed(3)}</span>
            </div>
          </div>

          {/* Panel 5: Honorarios */}
          <div style={P.panel}>
            <div style={P.title}>Honorarios · cálculo por horas</div>
            <div style={P.row4}>
              <div style={P.fg}><label style={P.lbl}>€/hora</label>
                <input type="number" step="1" style={P.inp} value={p.eurHora} onChange={e => upd({ eurHora: +e.target.value })} />
              </div>
              <div style={P.fg}>
                <label style={P.lbl}>Superficie (m²) <span style={{ fontSize: 9, fontWeight: 400, letterSpacing: 0 }}>→ del PEM</span></label>
                <input type="number" style={{ ...P.inp, background: '#f5f4f0', color: '#6b6a66' }} value={m2T} disabled />
              </div>
              <div style={P.fg}><label style={P.lbl}>Sup. parcela (m²)</label>
                <input type="number" step="0.01" style={P.inp} value={p.superficieParcela || ''} onChange={e => upd({ superficieParcela: +e.target.value || 0 })} />
              </div>
              <div style={P.fg}>
                <label style={P.lbl}>Complejidad k</label>
                <input type="number" step="0.05" style={tpl ? { ...P.inp, background: '#f5f4f0', color: '#6b6a66' } : P.inp}
                  disabled={tpl} value={p.complejidadK}
                  title={tpl ? 'En reforma k se calcula del % de capítulos' : ''}
                  onChange={e => upd({ complejidadK: +e.target.value })} />
              </div>
            </div>
            <div style={P.hint}>
              Factor de escala I3 = k × ({m2T} m² / {tplBase}) = <b>{I3.toFixed(3)}</b>.
            </div>

            {/* Entregables colapsables */}
            <div style={{ margin: '10px 0' }}>
              {Object.entries(p.tareas).map(([key, tarea]) => {
                const meta = (tpl ? p.plantilla === 'reforma' : false) ? undefined : undefined;
                void meta;
                const h = tarea.sub.reduce((s, s2) => s + (+s2.h || 0), 0);
                const imp = h * (tarea.escala ? I3 : 1) * p.eurHora;
                return (
                  <details key={key} style={{ border: '1px solid #e0ddd5', borderRadius: 5, marginBottom: 7 }}>
                    <summary style={{ listStyle: 'none', cursor: 'pointer', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{key}</span>
                        {tarea.escala && <span style={{ fontSize: 11, color: '#6b6a66' }}>×escala</span>}
                      </span>
                      <span style={{ fontSize: 11, color: '#6b6a66', whiteSpace: 'nowrap' }}>{h} h · {fmt(imp)}</span>
                    </summary>
                    <div style={{ padding: '8px 10px', borderTop: '1px solid #e0ddd5' }}>
                      {tarea.sub.map((s, si) => (
                        <div key={si} style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <label style={{ fontSize: 11, color: '#6b6a66' }}>{s.label}</label>
                          <input type="number" step="0.5" style={{ ...P.inp, height: 26, textAlign: 'right' }}
                            value={s.h} onChange={e => setSubH(key, si, +e.target.value || 0)} />
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>

            {/* D.O. */}
            <div style={P.row4}>
              {[
                { lbl: 'Duración obra (meses)', key: 'duracionMeses' },
                { lbl: 'Visitas/mes', key: 'visitasMes' },
                { lbl: 'Km (ida/vuelta)', key: 'km' },
                { lbl: 'Horas/visita extra', key: 'horasVisita' },
              ].map(({ lbl, key }) => (
                <div key={key} style={P.fg}><label style={P.lbl}>{lbl}</label>
                  <input type="number" step="1" style={P.inp}
                    value={(p as unknown as Record<string, number>)[key] ?? 0}
                    onChange={e => upd({ [key]: +e.target.value || 0 } as Partial<Presupuesto>)} />
                </div>
              ))}
            </div>
            <div style={P.hint}>
              Dirección de obra = <b>{fmt(doEurMes(p))}/mes</b> × {p.duracionMeses} meses · DRS = {m2T} m² ×{' '}
              <input type="number" step="0.1" value={p.drsEurM2}
                style={{ width: 54, height: 24, padding: '0 4px', border: '1px solid #c8c4bc', borderRadius: 4, fontSize: 11, fontFamily: 'inherit', textAlign: 'right' as const, outline: 'none' }}
                onChange={e => upd({ drsEurM2: +e.target.value })} />{' '}
              €/m².
            </div>

            {/* Extras */}
            <div style={{ ...P.title, marginTop: 14, marginBottom: 8 }}>Honorarios extra (se suman aparte, no escalan)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {p.extras.map((e, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f4f2ed' }}>
                    <td style={{ width: 24, textAlign: 'center', padding: '5px 6px' }}>
                      <input type="checkbox" checked={e.aplica} style={{ accentColor: '#b07a1e', width: 'auto', height: 'auto' }}
                        onChange={ev => {
                          const extras = [...p.extras]; extras[i] = { ...e, aplica: ev.target.checked };
                          upd({ extras });
                        }} />
                    </td>
                    <td style={{ fontSize: 12, padding: '5px 6px' }}>{e.label}</td>
                    <td style={{ width: 64, padding: '5px 6px' }}>
                      <input type="number" step="0.5" style={{ ...P.inp, height: 26, textAlign: 'right' }}
                        value={e.horas}
                        onChange={ev => { const extras = [...p.extras]; extras[i] = { ...e, horas: +ev.target.value || 0 }; upd({ extras }); }} />
                    </td>
                    <td style={{ width: 80, textAlign: 'right', fontSize: 12, padding: '5px 8px', fontVariantNumeric: 'tabular-nums', color: '#6b6a66' }}>
                      {e.aplica ? fmt((+e.horas || 0) * p.eurHora) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Panel 6: Partidas */}
          <div style={P.panel}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ ...P.title, margin: 0 }}>Partidas del presupuesto</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={recalcPartidas} style={{ height: 26, padding: '0 9px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }} title="Recalcular desde honorarios">
                  ↺ Recalcular
                </button>
                <button onClick={addPartida} style={{ height: 26, padding: '0 9px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}>
                  + Línea
                </button>
              </div>
            </div>

            {/* Chips de fases */}
            <FasesChips fases={pref} onAdd={addFase} onDel={delFase} />

            {/* Tabla de partidas */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e0ddd5' }}>
                  {(['', 'Fase', 'Concepto', 'Tipo', 'Importe', 'Meses', ''] as const).map((h, i) => (
                    <th key={i} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: '#a09e99', fontWeight: 500, padding: '4px 6px', textAlign: h === 'Importe' ? 'right' : 'left', width: i === 0 ? 20 : h === 'Fase' ? 110 : h === 'Tipo' ? 90 : h === 'Importe' ? 92 : h === 'Meses' ? 64 : i === 6 ? 26 : undefined }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.partidas.map((r, i) => {
                  const tipo = r.tipo || 'fijo';
                  const hasVal = tipo === 'fijo' || tipo === 'mensual' || tipo === 'porhoras' || tipo === 'opcional';
                  const isDragging = dragPartidaIdx === i;
                  const isOver = overPartidaIdx === i && dragPartidaIdx !== i;
                  return (
                    <tr key={i}
                      draggable
                      onDragStart={e => {
                        const tag = (e.target as HTMLElement).tagName.toLowerCase();
                        if (['input', 'select', 'button'].includes(tag)) { e.preventDefault(); return; }
                        setDragPartidaIdx(i);
                      }}
                      onDragOver={e => { e.preventDefault(); if (overPartidaIdx !== i) setOverPartidaIdx(i); }}
                      onDrop={() => { if (dragPartidaIdx !== null) movePartida(dragPartidaIdx, i); setDragPartidaIdx(null); setOverPartidaIdx(null); }}
                      onDragEnd={() => { setDragPartidaIdx(null); setOverPartidaIdx(null); }}
                      style={{ borderBottom: '1px solid #f4f2ed', opacity: isDragging ? 0.35 : 1, background: isOver ? '#f5f2ec' : 'transparent', transition: 'background .1s' }}
                    >
                      <td style={{ padding: '4px 2px', textAlign: 'center', cursor: 'grab' }}>
                        <DragHandle />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <select style={{ ...P.inp, height: 26, fontSize: 11 }} value={r.fase}
                          onChange={e => setPartida(i, { fase: e.target.value })}>
                          {pref.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="text" style={{ ...P.inp, height: 26, fontSize: 11 }} value={r.concepto}
                          onChange={e => setPartida(i, { concepto: e.target.value })} />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <select style={{ ...P.inp, height: 26, fontSize: 11 }} value={tipo}
                          onChange={e => setPartida(i, { tipo: e.target.value as Partida['tipo'] })}>
                          <option value="fijo">€ fijo</option>
                          <option value="mensual">€/mes</option>
                          <option value="porhoras">€/h</option>
                          <option value="opcional">Opcional</option>
                          <option value="incluido">Incluido</option>
                          <option value="noincluido">NO INC.</option>
                        </select>
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="number" step="1" style={{ ...P.inp, height: 26, fontSize: 11, textAlign: 'right' }}
                          disabled={!hasVal} value={hasVal ? Math.round(+(r.importe ?? 0)) : ''}
                          onChange={e => setPartida(i, { importe: +e.target.value })} />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        {tipo === 'mensual' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <input type="number" style={{ ...P.inp, height: 26, fontSize: 11, width: 42 }}
                              value={+(r.meses ?? 0)}
                              onChange={e => { const m = +e.target.value; setPartida(i, { meses: m }); upd({ duracionMeses: m }); }} />
                            <span style={{ fontSize: 11 }}>m</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '4px 4px' }}>
                        <button onClick={() => delPartida(i)} style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', color: '#a09e99', fontSize: 15 }}>×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer partidas */}
            {(() => {
              const baseFijo = p.partidas.filter(r => r.tipo === 'fijo').reduce((s, r) => s + +(r.importe ?? 0), 0);
              const mensual = p.partidas.find(r => r.tipo === 'mensual');
              return (
                <div style={{ marginTop: 8, padding: '6px 8px', background: '#f5f4f0', borderRadius: 4, fontSize: 11.5, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <span>Base fija: <b>{fmt(baseFijo)}</b></span>
                  {mensual && <span>DO: <b>{fmt(mensual.importe ?? 0)}/mes × {mensual.meses ?? 0} m</b></span>}
                  <span>Total c/IVA: <b>{fmt(baseFijo * 1.21)}{mensual ? ' + ' + fmt((mensual.importe ?? 0) * 1.21) + '/mes' : ''}</b></span>
                </div>
              );
            })()}
          </div>

          {/* Panel 7: Estimación de costes */}
          <div style={P.panel}>
            <div style={P.title}>Estimación de costes totales</div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b6a66', marginBottom: 4 }}>Parámetros editables</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                {([
                  ['Ajuste mercado %', 'ajusteMercadoPct'],
                  ['GG + BI %', 'ggbiPct'],
                  ['IVA construcción %', 'ivaConstrPct'],
                  ['Licencia obra % (PEM)', 'licenciaObraPct'],
                  ['1ª ocupación % (PEM)', 'primeraOcupPct'],
                  ['Honorarios técnico (s/IVA)', 'honorariosTecnico'],
                  ['Visados (s/IVA)', 'visados'],
                  ['Fianzas', 'fianzas'],
                  ['Estudio geotécnico (s/IVA)', 'geotecnico'],
                  ['Impuestos, notaría y registro', 'impuestos'],
                ] as const).map(([lbl, key]) => (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#6b6a66' }}>{lbl}</span>
                    <input type="number" step="0.01" style={{ ...P.inp, height: 26, textAlign: 'right' }}
                      value={p.costes[key]} onChange={e => upd({ costes: { ...p.costes, [key]: +e.target.value } })} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderTop: '1px solid #e0ddd5', paddingTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b6a66', marginBottom: 6 }}>Resultado</div>
              {(() => {
                const ct = costesTotales(p);
                return (<>
                  {ct.filas.map(([lbl, val]) => (
                    <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f4f2ed', fontSize: 12 }}>
                      <span style={{ color: '#6b6a66', fontSize: 11 }}>{lbl as string}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(val as number)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, fontWeight: 700 }}>
                    <span style={{ fontSize: 11, color: '#a09e99' }}>TOTAL estimado</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 16 }}>{fmt(ct.total)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b6a66', padding: '2px 0' }}>
                    <span>Coste total obra</span><span>{fmt(ct.costeObra)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b6a66', padding: '2px 0' }}>
                    <span>m² totales · coste/m²</span><span>{ct.m2} m² · {fmt(ct.costeM2)}</span>
                  </div>
                </>);
              })()}
            </div>
          </div>

          {/* Panel 8: Observaciones */}
          <ObservacionesPanel key={p.id} p={p} onToggle={toggleObs} onAdd={addCustomObs} onUpd={upd} />

        </div>

        {/* ── RIGHT COLUMN (sticky) ──────────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 64, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}>
          <PresupuestoSummary
            p={p}
            isNew={isNew}
            onSave={() => onSave(p)}
            onPDF={() => openPresupuestoPDF(p)}
            onDelete={() => onDelete(p.id)}
            onUpd={upd}
            isPending={isPending}
          />
        </div>

      </div>
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function DragHandle() {
  return (
    <svg width={10} height={14} viewBox="0 0 10 14" style={{ display: 'block', margin: '0 auto' }}>
      <circle cx="3" cy="3"  r="1.5" fill="#c8c4bc" />
      <circle cx="7" cy="3"  r="1.5" fill="#c8c4bc" />
      <circle cx="3" cy="7"  r="1.5" fill="#c8c4bc" />
      <circle cx="7" cy="7"  r="1.5" fill="#c8c4bc" />
      <circle cx="3" cy="11" r="1.5" fill="#c8c4bc" />
      <circle cx="7" cy="11" r="1.5" fill="#c8c4bc" />
    </svg>
  );
}

function FasesChips({ fases, onAdd, onDel }: { fases: string[]; onAdd: (s: string) => void; onDel: (s: string) => void }) {
  const [input, setInput] = useState('');
  return (
    <div style={{ marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '6px 0 2px' }}>
      <span style={{ fontSize: 10, color: '#a09e99', textTransform: 'uppercase', letterSpacing: '.06em' }}>Fases:</span>
      {fases.map((f, fi) => (
        <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f5f4f0', border: '1px solid #c8c4bc', borderRadius: 12, padding: '1px 8px', fontSize: 11 }}>
          {f}
          {fi >= 2 && (
            <button onClick={() => onDel(f)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#a09e99', fontSize: 12, lineHeight: 1, padding: 0 }}>×</button>
          )}
        </span>
      ))}
      <input type="text" placeholder="Nueva fase…" value={input} onChange={e => setInput(e.target.value)}
        style={{ height: 26, padding: '0 8px', border: '1px solid #c8c4bc', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', outline: 'none', width: 150 }} />
      <button onClick={() => { onAdd(input); setInput(''); }}
        style={{ height: 26, padding: '0 9px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}>
        + Fase
      </button>
    </div>
  );
}

function buildObsGroupOrders(
  items: Array<{ id: string; grupo?: string }>,
  sel: string[],
): Record<string, string[]> {
  const byGroup: Record<string, string[]> = {};
  items.forEach(o => {
    const g = o.grupo ?? 'Otros';
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(o.id);
  });
  // Checked items first (in sel order), then unchecked in their original order
  Object.keys(byGroup).forEach(g => {
    const checked = sel.filter(id => byGroup[g].includes(id));
    const unchecked = byGroup[g].filter(id => !sel.includes(id));
    byGroup[g] = [...checked, ...unchecked];
  });
  return byGroup;
}

const OBS_GRUPOS = ['Incluye', 'No incluye', 'Otros'] as const;

function ObservacionesPanel({ p, onToggle, onAdd, onUpd }: {
  p: Presupuesto;
  onToggle: (id: string, on: boolean) => void;
  onAdd: (txt: string, grupo: string) => void;
  onUpd: (patch: Partial<Presupuesto>) => void;
}) {
  const [newTxt, setNewTxt] = useState('');
  const [newGrupo, setNewGrupo] = useState('Incluye');
  const inpSt: React.CSSProperties = { height: 30, padding: '0 8px', border: '1px solid #c8c4bc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#333', width: '100%' };

  const all = [...OBSERVACIONES_SEED, ...(p.observacionesCustom ?? [])];
  const [groupOrders, setGroupOrders] = useState(() => buildObsGroupOrders(all, p.observacionesSel));
  const [dragObs, setDragObs] = useState<{ g: string; i: number } | null>(null);
  const [overObs, setOverObs] = useState<{ g: string; i: number } | null>(null);

  // Sync new custom observations into groupOrders when they're added
  useEffect(() => {
    setGroupOrders(prev => {
      const currentIds = new Set(Object.values(prev).flat());
      const newItems = all.filter(o => !currentIds.has(o.id));
      if (!newItems.length) return prev;
      const next = { ...prev };
      newItems.forEach(o => {
        const g = o.grupo ?? 'Otros';
        next[g] = [...(next[g] ?? []), o.id];
      });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.observacionesCustom]);

  const obsById = new Map(all.map(o => [o.id, o]));

  function moveObs(grupo: string, from: number, to: number) {
    if (from === to) return;
    const next = { ...groupOrders };
    const ids = [...(next[grupo] ?? [])];
    const [item] = ids.splice(from, 1);
    ids.splice(to, 0, item);
    next[grupo] = ids;
    setGroupOrders(next);
    // Persist the new intra-group order of checked items via observacionesSel
    const newSel = OBS_GRUPOS.flatMap(g => (next[g] ?? []).filter(id => p.observacionesSel.includes(id)));
    onUpd({ observacionesSel: newSel });
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '15px 16px', marginBottom: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 12, fontWeight: 500 }}>
        Observaciones del PDF (solo aparecen las marcadas)
      </div>
      {OBS_GRUPOS.map(g => {
        const ids = groupOrders[g] ?? [];
        const items = ids.map(id => obsById.get(id)).filter((o): o is typeof all[number] => !!o);
        if (!items.length) return null;
        return (
          <div key={g} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, margin: '6px 0 2px', color: '#6b6a66' }}>{g}</div>
            {items.map((o, idx) => {
              const isDragging = dragObs?.g === g && dragObs.i === idx;
              const isOver = overObs?.g === g && overObs.i === idx && dragObs?.g === g && dragObs.i !== idx;
              return (
                <div
                  key={o.id}
                  draggable
                  onDragStart={e => {
                    const tag = (e.target as HTMLElement).tagName.toLowerCase();
                    if (['input', 'button'].includes(tag)) { e.preventDefault(); return; }
                    setDragObs({ g, i: idx });
                  }}
                  onDragOver={e => { e.preventDefault(); setOverObs({ g, i: idx }); }}
                  onDrop={() => { if (dragObs?.g === g) moveObs(g, dragObs.i, idx); setDragObs(null); setOverObs(null); }}
                  onDragEnd={() => { setDragObs(null); setOverObs(null); }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '6px 0', borderBottom: '1px solid #f4f2ed', fontSize: 12,
                    opacity: isDragging ? 0.35 : 1,
                    background: isOver ? '#f5f2ec' : 'transparent',
                    transition: 'background .1s',
                  }}
                >
                  <span style={{ flexShrink: 0, marginTop: 3, cursor: 'grab' }}><DragHandle /></span>
                  <input type="checkbox" checked={p.observacionesSel.includes(o.id)} onChange={e => onToggle(o.id, e.target.checked)}
                    style={{ marginTop: 3, accentColor: '#b07a1e', width: 'auto', height: 'auto', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>{(o as { txt?: string }).txt}</div>
                </div>
              );
            })}
          </div>
        );
      })}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
        <input type="text" placeholder="Nueva observación personalizada…" value={newTxt} onChange={e => setNewTxt(e.target.value)} style={inpSt} />
        <select value={newGrupo} onChange={e => setNewGrupo(e.target.value)} style={inpSt}>
          <option>Incluye</option><option>No incluye</option><option>Otros</option>
        </select>
      </div>
      <button onClick={() => { onAdd(newTxt, newGrupo); setNewTxt(''); }}
        style={{ height: 26, padding: '0 9px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333', marginTop: 6 }}>
        + Añadir observación
      </button>
      <div style={{ marginTop: 12 }}>
        <label style={{ display: 'block', fontSize: 10, letterSpacing: '.05em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 4 }}>Nota interna (no sale en el PDF)</label>
        <input type="text" style={inpSt} value={p.notaInterna} onChange={e => onUpd({ notaInterna: e.target.value })} />
      </div>
    </div>
  );
}
