'use client';

import { useState } from 'react';
import type { Gasto, Proveedor } from '@/lib/types';
import { catColor } from './calculos';
import { upsertProveedor, deleteProveedor } from './actions';
import { CATEGORIAS_GASTO } from './constants';

interface Props {
  proveedores: Proveedor[];
  gastos: Gasto[];
  onUpdate: (p: Proveedor[]) => void;
  isPending: boolean;
  startTransition: (fn: () => Promise<void>) => void;
}

const INP: React.CSSProperties = { width: '100%', height: 34, padding: '0 8px', border: '1px solid #c8c4bc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#333' };
const LBL: React.CSSProperties = { display: 'block', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99', marginBottom: 5 };
const FG: React.CSSProperties = { marginBottom: 14 };

function gastosDe(nombre: string, gastos: Gasto[]): number {
  const k = nombre.trim().toLowerCase();
  return gastos.filter(g => (g.proveedor ?? '').trim().toLowerCase() === k).length;
}

export default function ProveedoresTab({ proveedores, gastos, onUpdate, isPending, startTransition }: Props) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = proveedores
    .filter(p => !search || (p.nombre + ' ' + (p.nif ?? '') + ' ' + (p.categoria ?? '')).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  function handleSave(p: Proveedor) {
    startTransition(async () => {
      const updated = await upsertProveedor(p);
      onUpdate(updated);
      setModalOpen(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const updated = await deleteProveedor(id);
      onUpdate(updated);
      setModalOpen(false);
    });
  }

  const filterInp: React.CSSProperties = { height: 30, padding: '0 9px', border: '1px solid #c8c4bc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#333', width: 230 };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <input type="text" style={filterInp} placeholder="🔍 Buscar proveedor, NIF…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ flex: 1 }} />
        <button onClick={() => { setEditing(null); setModalOpen(true); }} disabled={isPending}
          style={{ height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', background: '#333', color: '#fff', border: 'none' }}>
          + Nuevo proveedor
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f4f0' }}>
              {['Proveedor','NIF / CIF','Categoría habitual','Nota','Gastos asociados'].map((h, i) => (
                <th key={h} style={{ fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#a09e99', fontWeight: 500, padding: '9px 12px', borderBottom: '1px solid #e0ddd5', textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 50, color: '#a09e99', fontSize: 13 }}>
                Sin proveedores. Pulsa "+ Nuevo proveedor" o crea un gasto con proveedor nuevo.
              </td></tr>
            ) : filtered.map(p => {
              const n = gastosDe(p.nombre, gastos);
              const col = catColor(p.categoria, [...CATEGORIAS_GASTO]);
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f0eee9', cursor: 'pointer' }}
                  onClick={() => { setEditing(p); setModalOpen(true); }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#faf9f6')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 600 }}>{p.nombre}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: '#a09e99' }}>{p.nif || '—'}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12 }}>
                    {p.categoria
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 500, border: `1px solid ${col}`, color: col, background: col + '14' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: col }} />{p.categoria}
                        </span>
                      : <span style={{ color: '#a09e99' }}>—</span>
                    }
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: '#a09e99' }}>{p.nota || '—'}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', color: '#a09e99' }}>{n || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: '9px 12px', fontSize: 11, color: '#6b6a66', background: '#f5f4f0', borderTop: '1px solid #e0ddd5' }}>
          {filtered.length} proveedor{filtered.length !== 1 ? 'es' : ''}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <ProveedorModal
          proveedor={editing}
          gastos={gastos}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModalOpen(false)}
          isPending={isPending}
        />
      )}
    </>
  );
}

function ProveedorModal({ proveedor, gastos, onSave, onDelete, onClose, isPending }: {
  proveedor: Proveedor | null;
  gastos: Gasto[];
  onSave: (p: Proveedor) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const isNew = !proveedor;
  const [nombre, setNombre] = useState(proveedor?.nombre ?? '');
  const [nif, setNif]       = useState(proveedor?.nif ?? '');
  const [cat, setCat]       = useState(proveedor?.categoria ?? '');
  const [nota, setNota]     = useState(proveedor?.nota ?? '');

  const usos = proveedor ? gastosDe(proveedor.nombre, gastos) : 0;

  function handleSave() {
    if (!nombre.trim()) return alert('Indica el nombre del proveedor');
    onSave({ id: proveedor?.id ?? 'p_' + Date.now(), nombre: nombre.trim(), nif: nif.trim(), categoria: cat.trim(), nota: nota.trim() });
  }

  const INP2: React.CSSProperties = { width: '100%', height: 34, padding: '0 8px', border: '1px solid #c8c4bc', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#333' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '50px 16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 10, width: 480, boxShadow: '0 16px 50px rgba(0,0,0,.22)' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #e0ddd5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>{isNew ? 'Nuevo proveedor' : 'Editar proveedor'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#a09e99', lineHeight: 1, padding: 0 }}>×</button>
        </div>
        <div style={{ padding: '18px 22px' }}>
          <div style={FG}><label style={LBL}>Nombre / Razón social</label>
            <input style={INP2} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Gestoría Salas" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={FG}><label style={LBL}>NIF / CIF</label>
              <input style={INP2} value={nif} onChange={e => setNif(e.target.value)} placeholder="Opcional" />
            </div>
            <div style={FG}><label style={LBL}>Categoría habitual</label>
              <select style={INP2} value={cat} onChange={e => setCat(e.target.value)}>
                <option value="">— Sin categoría —</option>
                {CATEGORIAS_GASTO.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div style={FG}><label style={LBL}>Nota</label>
            <textarea style={{ width: '100%', minHeight: 54, padding: '8px 10px', border: '1px solid #c8c4bc', borderRadius: 6, fontFamily: 'inherit', fontSize: 12, color: '#333', resize: 'vertical', outline: 'none' }}
              value={nota} onChange={e => setNota(e.target.value)} placeholder="Opcional…" />
          </div>
          {!isNew && usos > 0 && (
            <p style={{ fontSize: 10, color: '#a09e99', marginTop: -8 }}>
              Este proveedor aparece en {usos} gasto{usos !== 1 ? 's' : ''}. Si cambias el nombre, los gastos existentes no se renombran automáticamente.
            </p>
          )}
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid #e0ddd5', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {!isNew && <button onClick={() => {
            const msg = usos > 0
              ? `Este proveedor está en ${usos} gasto${usos !== 1 ? 's' : ''}. Eliminarlo NO borra esos gastos. ¿Eliminar de la lista?`
              : '¿Eliminar este proveedor?';
            if (confirm(msg)) onDelete(proveedor!.id);
          }} style={{ height: 30, padding: '0 13px', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid #e3b4ae', background: 'transparent', color: '#c0392b', marginRight: 'auto' }}>
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
