'use client';

import { useState } from 'react';
import type { Gasto, GastoLine, Proveedor } from '@/lib/types';
import { fmt, guessCategoria } from './calculos';
import { IVA_OPTS, IRPF_OPTS, CATEGORIAS_GASTO } from './constants';

interface Props {
  gasto: Gasto | null;
  proveedores: Proveedor[];
  onSave: (g: Gasto, nif: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  isPending: boolean;
}

interface Line { base: string; iva: number; irpf: number; }

const today = () => new Date().toISOString().slice(0, 10);

const INP: React.CSSProperties = {
  width: '100%', height: 34, padding: '0 8px', border: '1px solid #c8c4bc', borderRadius: 6,
  fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#333',
};
const LBL: React.CSSProperties = { display: 'block', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 5 };
const FG: React.CSSProperties = { marginBottom: 14 };

function toLines(g: Gasto | null): Line[] {
  if (!g?.lines?.length) return [{ base: '', iva: 0, irpf: 0 }];
  return g.lines.map(l => ({ base: String(l.base), iva: +l.iva, irpf: +l.irpf }));
}

export default function GastoModal({ gasto, proveedores, onSave, onDelete, onClose, isPending }: Props) {
  const isNew = !gasto;

  const [numero, setNumero] = useState(gasto?.numero ?? '');
  const [fecha, setFecha]   = useState(gasto?.fecha ?? today());
  const [proveedor, setProveedor] = useState(gasto?.proveedor ?? '');
  const [proveedorNif, setProveedorNif] = useState(() => {
    if (!gasto?.proveedor) return '';
    return proveedores.find(p => p.nombre.trim().toLowerCase() === (gasto.proveedor ?? '').trim().toLowerCase())?.nif ?? '';
  });
  const [concepto, setConcepto]   = useState(gasto?.concepto ?? '');
  const [estado, setEstado] = useState<Gasto['estado']>(gasto?.estado ?? 'pagada');
  const [categoria, setCategoria] = useState(gasto?.categoria ?? '');
  const [nota, setNota]     = useState(gasto?.nota ?? '');
  const [lines, setLines]   = useState<Line[]>(toLines(gasto));

  function onProveedorChange(v: string) {
    setProveedor(v);
    const p = proveedores.find(x => x.nombre.trim().toLowerCase() === v.trim().toLowerCase());
    if (p) {
      setProveedorNif(p.nif ?? '');
      if (!categoria && p.categoria) setCategoria(p.categoria);
    } else {
      setProveedorNif('');
      if (!categoria && v) setCategoria(guessCategoria(concepto, v));
    }
  }

  function addLine() { setLines(prev => [...prev, { base: '', iva: 0, irpf: 0 }]); }
  function setLine(i: number, patch: Partial<Line>) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }
  function delLine(i: number) {
    if (lines.length <= 1) return;
    setLines(prev => prev.filter((_, idx) => idx !== i));
  }

  const total = lines.reduce((s, l) => {
    const b = parseFloat(l.base) || 0;
    return s + b + b * l.iva - b * l.irpf;
  }, 0);

  function handleSave() {
    const parsedLines: GastoLine[] = lines
      .map(l => ({ base: parseFloat(l.base) || 0, iva: l.iva, irpf: l.irpf }))
      .filter(l => l.base !== 0);
    if (!parsedLines.length) return alert('Añade al menos una línea con base');
    if (!fecha) return alert('Indica la fecha');
    onSave({
      id: gasto?.id ?? 'g_' + Date.now(),
      numero: numero.trim(), fecha,
      concepto: concepto.trim(),
      proveedor: proveedor.trim() || '—',
      estado, categoria: categoria.trim(), nota: nota.trim(),
      tags: gasto?.tags ?? [],
      lines: parsedLines,
    }, proveedorNif.trim());
  }

  const row2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '50px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 10, width: 600, maxHeight: '86vh', overflowY: 'auto', boxShadow: '0 16px 50px rgba(0,0,0,.22)' }}>

        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #e0ddd5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>{isNew ? 'Nuevo gasto' : 'Editar gasto'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#a09e99', lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ padding: '18px 22px' }}>
          <div style={{ ...row2, marginBottom: 14 }}>
            <div style={FG}><label style={LBL}>Nº factura / recibo</label>
              <input style={INP} value={numero} onChange={e => setNumero(e.target.value)} placeholder="FA2604-001" />
            </div>
            <div style={FG}><label style={LBL}>Fecha</label>
              <input type="date" style={INP} value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
          </div>

          <div style={{ ...row2, marginBottom: 14 }}>
            <div style={FG}><label style={LBL}>Proveedor</label>
              <input style={INP} list="prov-datalist" value={proveedor}
                onChange={e => onProveedorChange(e.target.value)}
                placeholder="Selecciona o escribe uno nuevo" autoComplete="off" />
              <datalist id="prov-datalist">
                {[...new Set(proveedores.map(p => p.nombre))].sort().map(n => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <div style={FG}><label style={LBL}>NIF / CIF proveedor</label>
              <input style={INP} value={proveedorNif}
                onChange={e => setProveedorNif(e.target.value)}
                placeholder="A12345678" autoComplete="off" />
            </div>
          </div>

          <div style={FG}><label style={LBL}>Concepto</label>
            <input style={INP} value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Retribución Marisol mayo" />
          </div>

          {/* Lines */}
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: '#a09e99', marginBottom: 5, display: 'grid', gridTemplateColumns: '1fr 86px 96px 30px', gap: 8 }}>
            <span>Base imponible (€)</span><span>IVA</span><span>IRPF</span><span></span>
          </div>
          {lines.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 86px 96px 30px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <input type="number" step="0.01" style={{ ...INP, height: 32, textAlign: 'right' }} value={l.base} placeholder="0,00" onChange={e => setLine(i, { base: e.target.value })} />
              <select style={{ ...INP, height: 32 }} value={l.iva} onChange={e => setLine(i, { iva: +e.target.value })}>
                {IVA_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
              <select style={{ ...INP, height: 32 }} value={l.irpf} onChange={e => setLine(i, { irpf: +e.target.value })}>
                {IRPF_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
              <button onClick={() => delLine(i)} style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', color: '#a09e99', fontSize: 16 }}>×</button>
            </div>
          ))}
          <button onClick={addLine} style={{ height: 26, padding: '0 9px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}>+ Línea (otro IVA)</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e0ddd5', fontSize: 12 }}>
            <span style={{ color: '#a09e99' }}>Total gasto</span>
            <strong style={{ fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</strong>
          </div>

          <div style={{ ...row2, marginTop: 14, marginBottom: 14 }}>
            <div style={FG}><label style={LBL}>Estado</label>
              <select style={INP} value={estado} onChange={e => setEstado(e.target.value as Gasto['estado'])}>
                <option value="pagada">Pagada</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>
            <div style={FG}><label style={LBL}>Categoría de gasto</label>
              <select style={INP} value={categoria} onChange={e => setCategoria(e.target.value)}>
                <option value="">— Sin categoría —</option>
                {CATEGORIAS_GASTO.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div style={FG}><label style={LBL}>Nota</label>
            <textarea style={{ width: '100%', minHeight: 54, padding: '8px 10px', border: '1px solid #c8c4bc', borderRadius: 6, fontFamily: 'inherit', fontSize: 12, color: '#333', resize: 'vertical', outline: 'none' }}
              value={nota} onChange={e => setNota(e.target.value)} placeholder="Observaciones…" />
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #e0ddd5', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {!isNew && <button onClick={() => { if (confirm('¿Eliminar este gasto?')) onDelete(gasto!.id); }}
            style={{ height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #e3b4ae', background: 'transparent', color: '#c0392b', marginRight: 'auto' }}>
            Eliminar
          </button>}
          <button onClick={onClose} style={{ height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}>Cancelar</button>
          <button onClick={handleSave} disabled={isPending}
            style={{ height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: isPending ? 'wait' : 'pointer', border: 'none', background: '#333', color: '#fff', opacity: isPending ? 0.6 : 1 }}>
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
