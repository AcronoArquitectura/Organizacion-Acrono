'use client';

import type { Presupuesto } from '@/lib/types';
import { honorariosExtrasTotal, pemTotal } from '@/lib/utils/coag';

const fmt = (n: number) =>
  (Math.round((+n || 0) * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

interface Props {
  p: Presupuesto;
  isNew: boolean;
  onSave: () => void;
  onPDF: () => void;
  onDelete: () => void;
  onUpd: (patch: Partial<Presupuesto>) => void;
  isPending: boolean;
}

const panel: React.CSSProperties = { background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: '14px 16px', marginBottom: 12 };
const kv: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', fontSize: 12.5, borderBottom: '1px solid #f4f2ed', gap: 12 };
const k: React.CSSProperties = { color: '#a09e99', fontSize: 11 };
const v: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

export default function PresupuestoSummary({ p, isNew, onSave, onPDF, onDelete, onUpd, isPending }: Props) {
  const fijoPartidas  = p.partidas.filter(r => r.tipo === 'fijo'    && Math.abs(+(r.importe ?? 0)) > 0.005);
  const mensualPartidas = p.partidas.filter(r => r.tipo === 'mensual');
  const extrasTotal   = honorariosExtrasTotal(p);
  const basePartidas  = fijoPartidas.reduce((s, r) => s + +(r.importe ?? 0), 0)
                      + mensualPartidas.reduce((s, r) => s + +(r.importe ?? 0) * +(r.meses ?? 0), 0);
  const base = basePartidas + extrasTotal;
  const pem  = pemTotal(p);

  const inpSt: React.CSSProperties = {
    height: 30, padding: '0 8px', border: '1px solid #c8c4bc', borderRadius: 6,
    fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#333', width: '100%',
  };
  const lbl: React.CSSProperties = { display: 'block', fontSize: 10, letterSpacing: '.05em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 4 };
  const btn = (dark = false, danger = false): React.CSSProperties => ({
    height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit',
    cursor: isPending ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center',
    border: danger ? '1px solid #e3b4ae' : '1px solid',
    background: dark ? '#333' : danger ? 'transparent' : '#fff',
    color: dark ? '#fff' : danger ? '#c0392b' : '#333',
    borderColor: dark ? '#333' : danger ? '#e3b4ae' : '#c8c4bc',
    opacity: isPending ? 0.6 : 1,
  });

  return (
    <>
      {/* Panel 1: Resumen de honorarios */}
      <div style={panel}>
        <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 10, fontWeight: 500 }}>
          Resumen de honorarios
        </div>

        {fijoPartidas.map((r, i) => (
          <div key={i} style={kv}>
            <span style={k}>{r.concepto || `Partida ${i + 1}`}</span>
            <span style={v}>{fmt(+(r.importe ?? 0))}</span>
          </div>
        ))}

        {mensualPartidas.map((r, i) => +(r.importe ?? 0) > 0 && (
          <div key={`m${i}`} style={kv}>
            <span style={k}>{r.concepto || 'Dirección de obra'}</span>
            <span style={v}>{fmt(+(r.importe ?? 0))}/mes × {r.meses ?? 0} = {fmt(+(r.importe ?? 0) * +(r.meses ?? 0))}</span>
          </div>
        ))}

        {extrasTotal > 0 && (
          <div style={kv}>
            <span style={k}>Honorarios extra</span>
            <span style={v}>{fmt(extrasTotal)}</span>
          </div>
        )}

        {p.partidas.length === 0 && extrasTotal === 0 && (
          <div style={{ fontSize: 11, color: '#a09e99', padding: '6px 0' }}>Sin partidas. Pulsa "↺ Recalcular" o añade líneas manualmente.</div>
        )}

        <div style={{ ...kv, borderTop: '1px solid #e0ddd5', borderBottom: 'none', marginTop: 4, paddingTop: 8, fontWeight: 600 }}>
          <span style={k}>Total honorarios (s/IVA)</span>
          <span style={v}>{fmt(base)}</span>
        </div>
        <div style={{ ...kv, borderBottom: 'none' }}>
          <span style={k}>IVA 21%</span>
          <span style={v}>{fmt(base * 0.21)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, fontWeight: 700 }}>
          <span style={k}>TOTAL con IVA</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 16 }}>{fmt(base * 1.21)}</span>
        </div>
        <div style={{ fontSize: 10, color: '#a09e99', marginTop: 4 }}>
          PEM {fmt(pem)} · ratio honorarios/PEM {pem ? (base / pem * 100).toFixed(2) : '0'}%
        </div>
      </div>

      {/* Panel 2: Estado + Botones */}
      <div style={panel}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={lbl}>Estado</label>
            <select style={inpSt} value={p.estado} onChange={e => onUpd({ estado: e.target.value as Presupuesto['estado'] })}>
              <option value="borrador">Borrador</option>
              <option value="enviado">Enviado</option>
              <option value="aceptado">Aceptado</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Ajuste/descuento %</label>
            <input type="number" step="0.5" style={inpSt} value={p.ajustePct}
              onChange={e => onUpd({ ajustePct: +e.target.value })} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={onSave} disabled={isPending} style={btn()}>Guardar</button>
          <button onClick={onPDF} style={btn()}>Vista previa PDF</button>
          <button onClick={() => alert('Módulo Clientes — próximamente se conectará.')} style={btn(true)}>Convertir en cliente</button>
        </div>
        {!isNew && (
          <button onClick={onDelete} disabled={isPending} style={{ ...btn(false, true), height: 26, padding: '0 9px', fontSize: 11, marginTop: 8 }}>
            Eliminar presupuesto
          </button>
        )}
      </div>
    </>
  );
}
