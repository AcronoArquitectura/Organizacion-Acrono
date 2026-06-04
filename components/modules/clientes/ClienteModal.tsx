'use client';

import { useState } from 'react';
import type { Cliente, ProyectoCliente, Proyecto } from '@/lib/types';

interface Props {
  cliente: Cliente | null;
  existingClientes: Cliente[];
  orgProyectos: Proyecto[];
  onSave: (c: Cliente) => void;
  onClose: () => void;
  isPending: boolean;
}

const EMPTY: Omit<Cliente, 'id'> = {
  nombre: '', tipo: 'Particular', estado: 'activo', desde: '',
  nif: '', tel: '', email: '', direccionCalle: '', direccionCPCiudad: '', direccionProvincia: '', nota: '', proyectos: [],
};

const INP: React.CSSProperties = {
  width: '100%', height: 34, padding: '0 8px', border: '1px solid #c8c4bc',
  borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#333',
};
const LBL: React.CSSProperties = {
  display: 'block', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase',
  color: '#a09e99', marginBottom: 5,
};
const FG: React.CSSProperties = { marginBottom: 14 };

export default function ClienteModal({ cliente, existingClientes, orgProyectos, onSave, onClose, isPending }: Props) {
  const [form, setForm] = useState<Omit<Cliente, 'id'>>(
    cliente ? { ...cliente } : { ...EMPTY },
  );
  const [nifError, setNifError] = useState('');

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nif = form.nif.trim();
    if (nif) {
      const dup = existingClientes.find(c => c.nif.trim() === nif && c.id !== cliente?.id);
      if (dup) { setNifError(`Ya existe un cliente con este NIF: ${dup.nombre}`); return; }
    }
    setNifError('');
    onSave({ id: cliente?.id ?? `c_${Date.now()}`, ...form });
  }

  function addPj() {
    set('proyectos', [...form.proyectos, { ref: '', presup: 0, fact: 0, cobr: 0 }]);
  }

  function updatePj(i: number, pj: ProyectoCliente) {
    const arr = [...form.proyectos];
    arr[i] = pj;
    set('proyectos', arr);
  }

  function removePj(i: number) {
    set('proyectos', form.proyectos.filter((_, idx) => idx !== i));
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '42px 16px', overflowY: 'auto' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 10, width: 620, maxWidth: '100%', boxShadow: '0 16px 50px rgba(0,0,0,.22)', marginBottom: 42 }}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #e0ddd5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>{cliente ? 'Editar cliente' : 'Nuevo cliente'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#a09e99', lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '18px 22px' }}>
            {/* Nombre */}
            <div style={FG}>
              <label style={LBL}>Nombre / Razón social *</label>
              <input required style={INP} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
            </div>

            {/* Tipo + Estado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={LBL}>Tipo</label>
                <select style={INP} value={form.tipo} onChange={(e) => set('tipo', e.target.value as Cliente['tipo'])}>
                  <option value="Particular">Particular</option>
                  <option value="Empresa">Empresa</option>
                </select>
              </div>
              <div>
                <label style={LBL}>Estado</label>
                <select style={INP} value={form.estado} onChange={(e) => set('estado', e.target.value as Cliente['estado'])}>
                  <option value="activo">Activo</option>
                  <option value="potencial">Potencial</option>
                  <option value="finalizado">Finalizado</option>
                </select>
              </div>
            </div>

            {/* NIF + Desde */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={LBL}>NIF / CIF</label>
                <input style={{ ...INP, ...(nifError ? { borderColor: '#c0392b' } : {}) }}
                  value={form.nif} onChange={(e) => { set('nif', e.target.value); setNifError(''); }} />
                {nifError && <span style={{ fontSize: 11, color: '#c0392b', marginTop: 4, display: 'block' }}>{nifError}</span>}
              </div>
              <div>
                <label style={LBL}>Cliente desde</label>
                <input type="month" style={INP} value={form.desde} onChange={(e) => set('desde', e.target.value)} />
              </div>
            </div>

            {/* Tel + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={LBL}>Teléfono</label>
                <input style={INP} value={form.tel} onChange={(e) => set('tel', e.target.value)} />
              </div>
              <div>
                <label style={LBL}>Email</label>
                <input type="email" style={INP} value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
            </div>

            {/* Dirección */}
            <div style={FG}>
              <label style={LBL}>Dirección</label>
              <input placeholder="Calle y número" style={{ ...INP, marginBottom: 6 }} value={form.direccionCalle}      onChange={(e) => set('direccionCalle', e.target.value)} />
              <input placeholder="CP y ciudad"    style={{ ...INP, marginBottom: 6 }} value={form.direccionCPCiudad}  onChange={(e) => set('direccionCPCiudad', e.target.value)} />
              <input placeholder="Provincia"       style={INP}                         value={form.direccionProvincia}  onChange={(e) => set('direccionProvincia', e.target.value)} />
            </div>

            {/* Proyectos vinculados */}
            <div style={{ borderTop: '1px solid #e0ddd5', paddingTop: 13, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99', fontWeight: 500 }}>
                  Proyectos vinculados
                </span>
                <button type="button" onClick={addPj}
                  style={{ height: 24, padding: '0 10px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', borderRadius: 6, background: '#fff', color: '#6b6a66' }}>
                  + Añadir
                </button>
              </div>

              {form.proyectos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 26px', gap: 6, marginBottom: 6 }}>
                  {['Código proyecto', 'Presupuestado', 'Facturado', 'Cobrado', ''].map((h, i) => (
                    <span key={i} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.04em', color: '#a09e99' }}>{h}</span>
                  ))}
                </div>
              )}

              {form.proyectos.map((pj, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 26px', gap: 6, marginBottom: 6 }}>
                  <select
                    style={{ ...INP, height: 32 }}
                    value={pj.ref}
                    onChange={(e) => updatePj(i, { ...pj, ref: e.target.value })}
                  >
                    <option value="">— Seleccionar —</option>
                    {orgProyectos.map((p) => (
                      <option key={p.code} value={p.code}>{p.code}</option>
                    ))}
                  </select>
                  {(['presup', 'fact', 'cobr'] as const).map((field) => (
                    <input
                      key={field}
                      type="number"
                      min="0"
                      placeholder="0"
                      style={{ ...INP, height: 32, textAlign: 'right' }}
                      value={pj[field] || ''}
                      onChange={(e) => updatePj(i, { ...pj, [field]: parseFloat(e.target.value) || 0 })}
                    />
                  ))}
                  <button type="button" onClick={() => removePj(i)}
                    style={{ width: 26, height: 32, border: 'none', background: 'none', cursor: 'pointer', color: '#a09e99', fontSize: 16, padding: 0 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Nota */}
            <div>
              <label style={LBL}>Nota interna</label>
              <textarea
                style={{ width: '100%', minHeight: 60, padding: '8px 10px', border: '1px solid #c8c4bc', borderRadius: 6, fontFamily: 'inherit', fontSize: 12, color: '#333', resize: 'vertical', outline: 'none' }}
                value={form.nota}
                onChange={(e) => set('nota', e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 22px', borderTop: '1px solid #e0ddd5', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={onClose}
              style={{ height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #c8c4bc', background: '#fff', color: '#333' }}>
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              style={{ height: 30, padding: '0 16px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: isPending ? 'wait' : 'pointer', border: 'none', background: '#333', color: '#fff', opacity: isPending ? 0.6 : 1 }}>
              {isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
