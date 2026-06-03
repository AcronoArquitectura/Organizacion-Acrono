'use client';

import { useState, useEffect } from 'react';
import type { Factura, FacturaLine } from '@/lib/types';
import { fmt, addOneMonth, genFacturaNumero, trimOf } from './calculos';
import { IVA_OPTS, IRPF_OPTS, PIE_LEGAL_DEFAULT, TAGS } from './constants';
import { openFacturaPDF } from './facturaPDF';

interface Props {
  factura: Factura | null;
  facturas: Factura[];
  onSave: (f: Factura) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  isPending: boolean;
}

interface Line { base: string; iva: number; irpf: number; desc: string; }

const today = () => new Date().toISOString().slice(0, 10);

const INP: React.CSSProperties = {
  width: '100%', height: 34, padding: '0 8px', border: '1px solid #c8c4bc', borderRadius: 6,
  fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#333',
};
const INP_AUTO: React.CSSProperties = { ...INP, background: '#f5f4f0', color: '#6b6a66' };
const LBL: React.CSSProperties = { display: 'block', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 5 };
const FG: React.CSSProperties = { marginBottom: 14 };
const SEC: React.CSSProperties = { fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99', margin: '6px 0 10px', fontWeight: 500, borderTop: '1px solid #e0ddd5', paddingTop: 13 };

function toLines(f: Factura | null): Line[] {
  if (!f?.lines?.length) return [{ base: '', iva: 0.21, irpf: 0, desc: '' }];
  return f.lines.map(l => ({ base: String(l.base), iva: +l.iva, irpf: +l.irpf, desc: l.desc ?? '' }));
}

export default function FacturaModal({ factura, facturas, onSave, onDelete, onClose, isPending }: Props) {
  const isNew = !factura;
  const hoy = today();

  const [fecha, setFecha] = useState(factura?.fecha ?? hoy);
  const [numero, setNumero] = useState(factura?.numero ?? genFacturaNumero(hoy, facturas));
  const [venc, setVenc] = useState(factura?.vencimiento ?? addOneMonth(hoy));
  const [cliente, setCliente] = useState(factura?.cliente === '—' ? '' : (factura?.cliente ?? ''));
  const [nif, setNif] = useState(factura?.clienteNif ?? '');
  const [dir, setDir] = useState(factura?.clienteDir ?? '');
  const [ref, setRef] = useState(factura?.refPresupuesto ?? '');
  const [pie, setPie] = useState(factura?.pieTexto ?? PIE_LEGAL_DEFAULT);
  const [concepto, setConcepto] = useState(factura?.concepto ?? '');
  const [estado, setEstado] = useState<Factura['estado']>(factura?.estado ?? 'pendiente');
  const [nota, setNota] = useState(factura?.nota ?? '');
  const [tags, setTags] = useState<string[]>(factura?.tags ?? []);
  const [lines, setLines] = useState<Line[]>(toLines(factura));

  function onFechaChange(v: string) {
    setFecha(v);
    setVenc(addOneMonth(v));
    if (isNew) setNumero(genFacturaNumero(v, facturas));
  }

  function addLine() { setLines(prev => [...prev, { base: '', iva: 0.21, irpf: 0, desc: '' }]); }
  function setLine(i: number, patch: Partial<Line>) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }
  function delLine(i: number) {
    if (lines.length <= 1) return;
    setLines(prev => prev.filter((_, idx) => idx !== i));
  }

  function toggleTag(id: string) {
    setTags(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const total = lines.reduce((s, l) => {
    const b = parseFloat(l.base) || 0;
    return s + b + b * l.iva - b * l.irpf;
  }, 0);

  function buildFactura(): Factura {
    const parsedLines: FacturaLine[] = lines
      .map(l => ({ base: parseFloat(l.base) || 0, iva: l.iva, irpf: l.irpf, desc: l.desc }))
      .filter(l => l.base !== 0);
    return {
      id: factura?.id ?? 'f_' + Date.now(),
      numero, fecha, vencimiento: venc,
      cliente: cliente.trim() || '—', clienteNif: nif.trim(),
      clienteDir: dir.trim(), refPresupuesto: ref.trim(), pieTexto: pie.trim(),
      concepto: concepto.trim(), estado, nota: nota.trim(), tags,
      lines: parsedLines,
    };
  }

  function handleSave() {
    const parsedLines = lines.map(l => ({ base: parseFloat(l.base) || 0, iva: l.iva, irpf: l.irpf, desc: l.desc })).filter(l => l.base !== 0);
    if (!numero.trim()) return alert('Indica el nº de factura');
    if (!fecha) return alert('Indica la fecha');
    if (!parsedLines.length) return alert('Añade al menos una línea con base');
    onSave(buildFactura());
  }

  function handlePDF() {
    openFacturaPDF(buildFactura());
  }

  const row2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '50px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 10, width: 600, maxHeight: '86vh', overflowY: 'auto', boxShadow: '0 16px 50px rgba(0,0,0,.22)' }}>

        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #e0ddd5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>{isNew ? 'Nueva factura' : 'Editar factura'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#a09e99', lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 22px' }}>
          <div style={{ ...row2, marginBottom: 14 }}>
            <div style={FG}><label style={LBL}>Fecha de emisión</label>
              <input type="date" style={INP} value={fecha} onChange={e => onFechaChange(e.target.value)} />
            </div>
            <div style={FG}><label style={LBL}>Fecha de vencimiento</label>
              <input type="date" style={INP_AUTO} value={venc} readOnly />
            </div>
          </div>

          <div style={{ ...FG }}>
            <label style={LBL}>Nº factura</label>
            <input style={isNew ? INP_AUTO : INP} value={numero} readOnly={isNew} onChange={e => setNumero(e.target.value)} />
          </div>

          <div style={SEC}>Datos del destinatario (para el PDF)</div>

          <div style={FG}><label style={LBL}>Cliente / Razón social</label>
            <input style={INP} value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre o razón social" />
          </div>
          <div style={{ ...row2, marginBottom: 14 }}>
            <div style={FG}><label style={LBL}>NIF / CIF</label>
              <input style={INP} value={nif} onChange={e => setNif(e.target.value)} placeholder="43816991J" />
            </div>
            <div style={FG}><label style={LBL}>Ref. presupuesto</label>
              <input style={INP} value={ref} onChange={e => setRef(e.target.value)} placeholder="VU.115_25-06 · Vivienda…" />
            </div>
          </div>
          <div style={FG}><label style={LBL}>Dirección</label>
            <textarea style={{ width: '100%', minHeight: 54, padding: '8px 10px', border: '1px solid #c8c4bc', borderRadius: 6, fontFamily: 'inherit', fontSize: 12, color: '#333', resize: 'vertical', outline: 'none' }}
              value={dir} onChange={e => setDir(e.target.value)} placeholder="C/ San Francisco, 56, 5B&#10;38001 Santa Cruz de Tenerife" />
          </div>

          <div style={SEC}>Conceptos facturables</div>

          <div style={FG}><label style={LBL}>Concepto / Proyecto (resumen interno)</label>
            <input style={INP} value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="vu114 · D.Obra certif. 3" />
          </div>

          {/* Lines header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 88px 64px 78px 24px', gap: 8, alignItems: 'center', marginBottom: 5, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: '#a09e99' }}>
            <span>Descripción</span><span>Base (€)</span><span>IVA</span><span>Retención</span><span></span>
          </div>

          {lines.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 88px 64px 78px 24px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <input style={{ ...INP, height: 32 }} value={l.desc} onChange={e => setLine(i, { desc: e.target.value })} placeholder="Descripción del concepto" />
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

          <button onClick={addLine} style={{ height: 26, padding: '0 9px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}>+ Línea</button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e0ddd5', fontSize: 12 }}>
            <span style={{ color: '#a09e99' }}>Total factura</span>
            <strong style={{ fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</strong>
          </div>

          <div style={{ ...FG, marginTop: 14 }}><label style={LBL}>Texto adicional (pie del PDF)</label>
            <textarea style={{ width: '100%', minHeight: 54, padding: '8px 10px', border: '1px solid #c8c4bc', borderRadius: 6, fontFamily: 'inherit', fontSize: 12, color: '#333', resize: 'vertical', outline: 'none' }}
              value={pie} onChange={e => setPie(e.target.value)} />
          </div>

          <div style={{ ...row2, marginBottom: 14 }}>
            <div style={FG}><label style={LBL}>Estado</label>
              <select style={INP} value={estado} onChange={e => setEstado(e.target.value as Factura['estado'])}>
                <option value="pendiente">Pendiente</option>
                <option value="cobrada">Cobrada</option>
              </select>
            </div>
            <div style={FG}><label style={LBL}>Trimestre</label>
              <input style={INP_AUTO} value={fecha ? trimOf(fecha) : ''} readOnly />
            </div>
          </div>

          <div style={FG}><label style={LBL}>Etiquetas</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TAGS.map(t => {
                const sel = tags.includes(t.id);
                return <span key={t.id} onClick={() => toggleTag(t.id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: `1.5px solid ${sel ? '#333' : '#e0ddd5'}`, background: sel ? t.color + '1a' : '#f5f4f0', fontWeight: sel ? 500 : 400, userSelect: 'none' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.color }} />{t.label}
                </span>;
              })}
            </div>
          </div>

          <div style={FG}><label style={LBL}>Nota</label>
            <textarea style={{ width: '100%', minHeight: 54, padding: '8px 10px', border: '1px solid #c8c4bc', borderRadius: 6, fontFamily: 'inherit', fontSize: 12, color: '#333', resize: 'vertical', outline: 'none' }}
              value={nota} onChange={e => setNota(e.target.value)} placeholder="Observaciones…" />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid #e0ddd5', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {!isNew && <button onClick={() => { if (confirm('¿Eliminar esta factura?')) onDelete(factura!.id); }}
            style={{ height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #e3b4ae', background: 'transparent', color: '#c0392b', marginRight: 'auto' }}>
            Eliminar
          </button>}
          <button onClick={handlePDF}
            style={{ height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}>
            🖨 Imprimir / PDF
          </button>
          <button onClick={onClose}
            style={{ height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isPending}
            style={{ height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: isPending ? 'wait' : 'pointer', border: 'none', background: '#333', color: '#fff', opacity: isPending ? 0.6 : 1 }}>
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
