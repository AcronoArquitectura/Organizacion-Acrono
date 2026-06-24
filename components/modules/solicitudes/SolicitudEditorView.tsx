'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Solicitud, EstanciaSolicitud } from '@/lib/types';
import { updateSolicitud, generarPresupuesto } from '@/lib/actions/solicitudes';
import { FL_OPTS, FT_VIV, FC_VIV, USOS_OTROS, MO_DEF, MU_DEF, fcSugerido } from '@/lib/utils/coag';

// ── Estilos compartidos ───────────────────────────────────────────────────────

const P = {
  panel: { background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '15px 16px', marginBottom: 14 } as React.CSSProperties,
  title: { fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#a09e99', marginBottom: 12, fontWeight: 500 },
  inp:   { height: 30, padding: '0 8px', border: '1px solid #c8c4bc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#333', width: '100%' } as React.CSSProperties,
  lbl:   { display: 'block', fontSize: 10, letterSpacing: '.05em', textTransform: 'uppercase' as const, color: '#a09e99', marginBottom: 4 },
  fg:    { marginBottom: 10 } as React.CSSProperties,
  row2:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 } as React.CSSProperties,
  row3:  { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 } as React.CSSProperties,
  hint:  { fontSize: 10, color: '#a09e99', marginTop: 3, lineHeight: 1.4 } as React.CSSProperties,
};

// Opciones de coeficiente por tipo de estancia (CALIBRAR aquí si es necesario)
const COEF_OPTS = [
  { value: 1.0,      label: 'Vivienda (1,0)' },
  { value: 0.8,      label: 'Zona compl. (0,8)' },
  { value: 0.6,      label: 'Garaje (0,6)' },
  { value: 0.5,      label: 'Exterior (0,5)' },
  { value: 'piscina', label: 'Piscina (manual €/m²)' },
] as const;

function fmt2(n: number): string {
  return (Math.round((+n || 0) * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fechaCorta(iso: string): string {
  try { return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function coefSelectValue(e: EstanciaSolicitud): string {
  return e.esPiscina ? 'piscina' : String(e.coef);
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  solicitud: Solicitud;
}

export default function SolicitudEditorView({ solicitud }: Props) {
  const [sol, setSol] = useState<Solicitud>(solicitud);
  const [isPending, startTransition] = useTransition();
  const [savedOk, setSavedOk] = useState(false);
  const router = useRouter();

  function upd(patch: Partial<Solicitud>) {
    setSol(prev => ({ ...prev, ...patch }));
    setSavedOk(false);
  }

  function setEstancia(i: number, patch: Partial<EstanciaSolicitud>) {
    const estancias = [...sol.estancias];
    estancias[i] = { ...estancias[i], ...patch };
    upd({ estancias });
  }

  function addEstancia() {
    upd({
      estancias: [
        ...sol.estancias,
        { concepto: '', m2Util: 0, coef: 1.0, calidad: 'vivienda' as const, esPiscina: false, eurM2Piscina: 0 },
      ],
    });
  }

  function delEstancia(i: number) {
    upd({ estancias: sol.estancias.filter((_, idx) => idx !== i) });
  }

  function handleCoefChange(i: number, v: string) {
    if (v === 'piscina') {
      setEstancia(i, { esPiscina: true, coef: 0, eurM2Piscina: sol.estancias[i].eurM2Piscina || 1000 });
    } else {
      setEstancia(i, { esPiscina: false, coef: parseFloat(v) || 1.0 });
    }
  }

  // ── Cálculos de totales ─────────────────────────────────────────────────────

  const normales = sol.estancias.filter(e => !e.esPiscina);
  const piscs    = sol.estancias.filter(e => e.esPiscina);

  // Agrupar m² útiles por coef
  const byCoef = new Map<number, number>();
  normales.forEach(e => byCoef.set(e.coef, (byCoef.get(e.coef) ?? 0) + (e.m2Util || 0)));
  const coefGroups = [...byCoef.entries()].sort((a, b) => b[0] - a[0]);

  const m2UtilTotal   = normales.reduce((s, e) => s + (e.m2Util || 0), 0);
  const m2ConstrTotal = m2UtilTotal * 1.25;
  const m2UtilViv     = (byCoef.get(1.0) ?? 0);
  const fcSugg        = fcSugerido(m2UtilViv * 1.25);

  function coefLabel(coef: number): string {
    const opt = COEF_OPTS.find(o => o.value === coef);
    return opt ? opt.label : `×${coef}`;
  }

  // ── Guardar cambios ─────────────────────────────────────────────────────────

  function handleSave() {
    startTransition(async () => {
      await updateSolicitud(sol);
      setSavedOk(true);
    });
  }

  // ── Generar presupuesto ─────────────────────────────────────────────────────

  function handleGenerar() {
    if (!confirm('¿Generar presupuesto en borrador a partir de esta solicitud?')) return;
    startTransition(async () => {
      const { presupuesto } = await generarPresupuesto(sol);
      router.push(`/presupuestos?id=${presupuesto.id}`);
    });
  }

  const yaConvertida = sol.estado === 'convertida';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '18px 20px', maxWidth: 1300 }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 11, color: '#a09e99', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span onClick={() => router.push('/solicitudes')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
          Solicitudes
        </span>
        <span>›</span>
        <b style={{ color: '#333', fontWeight: 500 }}>{sol.nombre || '(sin nombre)'}</b>
        <span style={{ fontSize: 10, color: '#a09e99' }}>{fechaCorta(sol.fechaRecepcion)}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>

        {/* ── COLUMNA IZQUIERDA ─────────────────────────────────────────── */}
        <div>

          {/* Panel 1: Datos del contacto */}
          <div style={P.panel}>
            <div style={P.title}>Datos del contacto</div>
            <div style={P.row3}>
              <div style={P.fg}><label style={P.lbl}>Nombre</label>
                <input style={P.inp} value={sol.nombre} onChange={e => upd({ nombre: e.target.value })} />
              </div>
              <div style={P.fg}><label style={P.lbl}>Email</label>
                <input style={P.inp} value={sol.email} onChange={e => upd({ email: e.target.value })} />
              </div>
              <div style={P.fg}><label style={P.lbl}>Teléfono</label>
                <input style={P.inp} value={sol.telefono} onChange={e => upd({ telefono: e.target.value })} />
              </div>
            </div>
            <div style={P.row2}>
              <div style={P.fg}><label style={P.lbl}>Tipo de cliente</label>
                <input style={P.inp} value={sol.tipo_cliente} onChange={e => upd({ tipo_cliente: e.target.value })} />
              </div>
              <div style={P.fg}><label style={P.lbl}>Tipo de proyecto</label>
                <input style={P.inp} value={sol.tipo_proyecto} onChange={e => upd({ tipo_proyecto: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div style={P.fg}><label style={P.lbl}>Municipio / Provincia</label>
                <input style={P.inp} value={sol.municipio_provincia} onChange={e => upd({ municipio_provincia: e.target.value })} />
              </div>
              <div style={P.fg}><label style={P.lbl}>Dirección actuación</label>
                <input style={P.inp}
                  value={sol.solar_direccion || sol.local_direccion || ''}
                  onChange={e => {
                    const t = sol.tipo_proyecto.toLowerCase();
                    const isLocal = t.includes('local') || t.includes('oficina') || t.includes('cl') || t.includes('sanitario') || t.includes('restaur');
                    upd(isLocal ? { local_direccion: e.target.value } : { solar_direccion: e.target.value });
                  }}
                />
              </div>
            </div>
            <div style={P.row3}>
              <div style={P.fg}><label style={P.lbl}>Ref. catastral</label>
                <input style={P.inp} value={sol.referencia_catastral} onChange={e => upd({ referencia_catastral: e.target.value })} />
              </div>
              <div style={P.fg}><label style={P.lbl}>m² solar / local</label>
                <input type="number" style={P.inp} value={sol.m2_solar || ''} onChange={e => upd({ m2_solar: +e.target.value || 0 })} />
              </div>
              <div />
            </div>
          </div>

          {/* Panel 2: Contexto del cliente (read-only) */}
          <div style={P.panel}>
            <div style={P.title}>Contexto del cliente (del formulario)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <div style={P.lbl}>Presupuesto indicado</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>
                  {sol.presupuesto_cliente > 0
                    ? sol.presupuesto_cliente.toLocaleString('es-ES') + ' €'
                    : '—'}
                </div>
              </div>
              <div>
                <div style={P.lbl}>Inicio proyecto</div>
                <div style={{ fontSize: 13, color: '#333' }}>{sol.plazo_inicio_proyecto || sol.plazo || '—'}</div>
              </div>
              <div>
                <div style={P.lbl}>Inicio obra</div>
                <div style={{ fontSize: 13, color: '#333' }}>{sol.plazo_inicio_obra || '—'}</div>
              </div>
              <div>
                <div style={P.lbl}>Documentación</div>
                {sol.documentacion.length > 0
                  ? sol.documentacion.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer"
                      style={{ display: 'block', fontSize: 11, color: '#5f8a6e', marginBottom: 2 }}>
                      Archivo {i + 1}
                    </a>
                  ))
                  : <span style={{ fontSize: 11, color: '#a09e99' }}>Ninguno</span>
                }
              </div>
            </div>
            {/* Notas y descripciones del formulario */}
            {(sol.notas_libres || sol.descripcion_necesidades) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {sol.notas_libres && (
                  <div style={{ padding: '8px 10px', background: '#fffdf0', border: '1px solid #e8ddb0', borderRadius: 5, fontSize: 12, color: '#6b6a66', lineHeight: 1.6 }}>
                    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: '#a09e99', display: 'block', marginBottom: 3 }}>Notas del cliente</span>
                    {sol.notas_libres}
                  </div>
                )}
                {sol.descripcion_necesidades && (
                  <div style={{ padding: '8px 10px', background: '#f5f4f0', border: '1px solid #e0ddd5', borderRadius: 5, fontSize: 12, color: '#6b6a66', lineHeight: 1.6 }}>
                    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: '#a09e99', display: 'block', marginBottom: 3 }}>Descripción de necesidades</span>
                    {sol.descripcion_necesidades}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel 3: Tabla de estancias */}
          <div style={P.panel}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ ...P.title, margin: 0 }}>Estancias — m² útiles</div>
              <button
                onClick={addEstancia}
                style={{ height: 26, padding: '0 10px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}
              >
                + Fila
              </button>
            </div>
            <div style={P.hint}>
              Introduce metros cuadrados <b>útiles</b>. Se convertirán a construidos (×1,25) al generar el presupuesto.
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e0ddd5' }}>
                  {['Estancia', 'm² útil', 'Tipo / Coef', ''].map((h, i) => (
                    <th key={i} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: '#a09e99', fontWeight: 500, padding: '4px 6px', textAlign: i === 1 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sol.estancias.map((e, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f4f2ed' }}>
                    <td style={{ padding: '4px 6px' }}>
                      <input style={{ ...P.inp, height: 27 }} value={e.concepto}
                        onChange={ev => setEstancia(i, { concepto: ev.target.value })} />
                    </td>
                    <td style={{ padding: '4px 6px', width: 80 }}>
                      <input type="number" step="0.5"
                        style={{ ...P.inp, height: 27, textAlign: 'right', width: '100%' }}
                        value={e.m2Util || ''}
                        onChange={ev => setEstancia(i, { m2Util: +ev.target.value || 0 })} />
                    </td>
                    <td style={{ padding: '4px 6px', width: e.esPiscina ? 240 : 160 }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <select
                          style={{ ...P.inp, height: 27, width: e.esPiscina ? 140 : '100%', fontSize: 11 }}
                          value={coefSelectValue(e)}
                          onChange={ev => handleCoefChange(i, ev.target.value)}
                        >
                          {COEF_OPTS.map(o => (
                            <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
                          ))}
                        </select>
                        {e.esPiscina && (
                          <>
                            <input type="number" step="50"
                              style={{ ...P.inp, height: 27, width: 80, textAlign: 'right', fontSize: 11 }}
                              value={e.eurM2Piscina || ''}
                              onChange={ev => setEstancia(i, { eurM2Piscina: +ev.target.value || 0 })}
                              title="€/m² fijo para piscina"
                            />
                            <span style={{ fontSize: 10, color: '#a09e99', whiteSpace: 'nowrap' }}>€/m²</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '4px 4px', width: 28 }}>
                      <button
                        onClick={() => delEstancia(i)}
                        style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', color: '#a09e99', fontSize: 15 }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totales por grupo de coeficiente */}
            {coefGroups.length > 0 && (
              <div style={{ marginTop: 12, padding: '10px 10px 4px', background: '#f5f4f0', borderRadius: 5 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: '#a09e99', marginBottom: 6 }}>
                  Resumen por coeficiente → m² construidos (útil × 1,25)
                </div>
                {coefGroups.map(([coef, m2Util]) => (
                  <div key={coef} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#6b6a66' }}>{coefLabel(coef)}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: '#333' }}>
                      {fmt2(m2Util)} m² útil → <b>{fmt2(m2Util * 1.25)} m² constr.</b>
                    </span>
                  </div>
                ))}
                {piscs.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#6b6a66' }}>Piscina (manual)</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: '#333' }}>
                      {fmt2(p.m2Util)} m² · {fmt2(p.eurM2Piscina)} €/m²
                    </span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #e0ddd5', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                  <span style={{ color: '#a09e99', fontWeight: 400, fontSize: 11 }}>TOTAL útil / construido</span>
                  <span>{fmt2(m2UtilTotal)} m² → <b>{fmt2(m2ConstrTotal)} m²</b></span>
                </div>
                {m2UtilViv > 0 && (
                  <div style={{ fontSize: 11, color: '#a09e99', marginTop: 4, textAlign: 'right' }}>
                    fcKey sugerida por m² vivienda ({fmt2(m2UtilViv * 1.25)} m²):{' '}
                    <b style={{ color: '#b07a1e' }}>
                      {fcSugg === 'a' ? '≤70 m² (a)' : fcSugg === 'b' ? '70–130 m² (b)' : fcSugg === 'c' ? '130–210 m² (c)' : '>210 m² (d)'}
                    </b>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel 4: Parámetros COAG */}
          <div style={P.panel}>
            <div style={P.title}>Parámetros COAG (editables antes de generar)</div>
            <div style={P.row2}>
              <div style={P.fg}><label style={P.lbl}>Familia</label>
                <select style={P.inp} value={sol.familia} onChange={e => upd({ familia: e.target.value as Solicitud['familia'] })}>
                  <option value="viviendas">Edificios de viviendas</option>
                  <option value="otros">Otros usos</option>
                  <option value="urbanizacion">Urbanización</option>
                </select>
              </div>
              <div style={P.fg}><label style={P.lbl}>Plantilla honorarios</label>
                <select style={P.inp} value={sol.plantilla} onChange={e => upd({ plantilla: e.target.value as Solicitud['plantilla'] })}>
                  <option value="nueva">Obra nueva</option>
                  <option value="reforma">Rehabilitación / Reforma</option>
                </select>
              </div>
            </div>
            <div style={P.row3}>
              <div style={P.fg}><label style={P.lbl}>Localización (Fl)</label>
                <select style={P.inp} value={sol.flKey} onChange={e => upd({ flKey: e.target.value as 'A' | 'B' })}>
                  {FL_OPTS.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
                </select>
              </div>
              <div style={P.fg}><label style={P.lbl}>Tipología (Ft)</label>
                <select style={P.inp} value={sol.ftKey} onChange={e => upd({ ftKey: e.target.value as Solicitud['ftKey'] })}>
                  {FT_VIV.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
                </select>
              </div>
              <div style={P.fg}><label style={P.lbl}>Calidad (Fc)</label>
                <select style={P.inp} value={sol.fcKey} onChange={e => upd({ fcKey: e.target.value as Solicitud['fcKey'] })}>
                  {FC_VIV.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
                </select>
                {m2UtilViv > 0 && sol.fcKey !== fcSugg && (
                  <div style={{ ...P.hint, color: '#b07a1e', display: 'flex', alignItems: 'center', gap: 5 }}>
                    Sugerida: {fcSugg}
                    <button
                      type="button"
                      onClick={() => upd({ fcKey: fcSugg })}
                      style={{ height: 17, padding: '0 5px', borderRadius: 3, fontSize: 10, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#6b6a66' }}
                    >↺</button>
                  </div>
                )}
              </div>
            </div>
            {sol.familia === 'otros' && (
              <div style={P.fg}><label style={P.lbl}>Uso (COAG)</label>
                <select style={P.inp} value={sol.usoKey} onChange={e => upd({ usoKey: e.target.value })}>
                  <option value="">— Selecciona uso —</option>
                  {USOS_OTROS.map(g => (
                    <optgroup key={g.g} label={g.g}>
                      {g.items.map(it => <option key={it[0]} value={it[0]}>{it[1]} (×{it[2]})</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}
            <div style={P.row2}>
              <div style={P.fg}><label style={P.lbl}>Mo (€/m²)</label>
                <input type="number" step="1" style={P.inp} value={sol.mo} onChange={e => upd({ mo: +e.target.value || MO_DEF })} />
              </div>
              <div style={P.fg}><label style={P.lbl}>Complejidad k</label>
                <input type="number" step="0.05" style={P.inp} value={sol.complejidadK} onChange={e => upd({ complejidadK: +e.target.value || 1 })} />
              </div>
            </div>
          </div>

        </div>

        {/* ── COLUMNA DERECHA (sticky) ───────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 64, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}>
          <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '16px' }}>

            {/* Resumen cliente */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 2 }}>{sol.nombre || '—'}</div>
              <div style={{ fontSize: 11, color: '#6b6a66' }}>{sol.tipo_proyecto}</div>
              <div style={{ fontSize: 11, color: '#a09e99' }}>{sol.municipio_provincia}</div>
            </div>

            {/* Estado */}
            <div style={{ marginBottom: 14 }}>
              <label style={P.lbl}>Estado</label>
              <select
                style={{ ...P.inp, height: 32 }}
                value={sol.estado}
                onChange={e => upd({ estado: e.target.value as Solicitud['estado'] })}
              >
                <option value="nueva">Nueva</option>
                <option value="revisada">Revisada</option>
                <option value="convertida">Convertida</option>
                <option value="descartada">Descartada</option>
              </select>
            </div>

            {/* Totales rápidos */}
            <div style={{ background: '#f5f4f0', borderRadius: 5, padding: '10px 10px', marginBottom: 14, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: '#a09e99', fontSize: 11 }}>m² útiles total</span>
                <b>{fmt2(m2UtilTotal)} m²</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ color: '#a09e99', fontSize: 11 }}>m² construidos (×1,25)</span>
                <b>{fmt2(m2ConstrTotal)} m²</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#a09e99', fontSize: 11 }}>m² vivienda construidos</span>
                <b>{fmt2(m2UtilViv * 1.25)} m²</b>
              </div>
              {sol.presupuesto_cliente > 0 && (
                <div style={{ borderTop: '1px solid #e0ddd5', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#a09e99', fontSize: 11 }}>Presupuesto cliente</span>
                  <b style={{ color: '#b07a1e' }}>{sol.presupuesto_cliente.toLocaleString('es-ES')} €</b>
                </div>
              )}
            </div>

            {/* Botón guardar */}
            <button
              onClick={handleSave}
              disabled={isPending}
              style={{
                width: '100%', height: 36, borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
                cursor: isPending ? 'default' : 'pointer', border: '1px solid #c8c4bc',
                background: savedOk ? '#5f8a6e' : '#fff', color: savedOk ? '#fff' : '#333',
                marginBottom: 8, transition: 'background .2s',
              }}
            >
              {isPending ? 'Guardando…' : savedOk ? '✓ Guardado' : 'Guardar cambios'}
            </button>

            {/* Botón generar presupuesto */}
            {!yaConvertida ? (
              <button
                onClick={handleGenerar}
                disabled={isPending}
                style={{
                  width: '100%', height: 38, borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
                  cursor: isPending ? 'default' : 'pointer', border: 'none',
                  background: isPending ? '#999' : '#333', color: '#fff', fontWeight: 600,
                }}
              >
                {isPending ? 'Generando…' : 'Generar presupuesto →'}
              </button>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#5f8a6e', fontWeight: 600, marginBottom: 6 }}>
                  ✓ Presupuesto generado
                </div>
                {sol.presupuestoId && (
                  <button
                    onClick={() => router.push(`/presupuestos?id=${sol.presupuestoId}`)}
                    style={{ width: '100%', height: 34, borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}
                  >
                    Ver presupuesto →
                  </button>
                )}
              </div>
            )}

            {/* Ayuda */}
            <div style={{ marginTop: 14, fontSize: 10, color: '#c8c4bc', lineHeight: 1.5 }}>
              Los m² útiles se convierten a construidos (×1,25) al generar.<br />
              Los campos en blanco (DNI, dirección) se rellenan manualmente en el editor de presupuesto.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
