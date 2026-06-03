'use client';

import { useState, useRef } from 'react';
import type { Factura, Gasto, Proveedor, Cliente } from '@/lib/types';
import { fmt, recBase, recTotal } from './calculos';
import { importarDatos } from './actions';

interface Props {
  onImport: (result: { facturas: Factura[]; gastos: Gasto[]; proveedores: Proveedor[] }) => void;
}

interface Preview {
  facturas: Factura[];
  gastos: Gasto[];
  proveedores: Proveedor[];
  clientes: Cliente[];
}

type Stage = 'idle' | 'previewing' | 'importing' | 'done';
type PreviewTab = 'facturas' | 'gastos' | 'proveedores' | 'clientes';

const thStyle: React.CSSProperties = {
  padding: '6px 10px', textAlign: 'left', fontSize: 10,
  textTransform: 'uppercase', letterSpacing: '.05em',
  color: '#6b6a66', borderBottom: '1px solid #e0ddd5',
  fontWeight: 600, whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '7px 10px', fontSize: 12, borderBottom: '1px solid #f0ede8',
  color: '#333', verticalAlign: 'middle',
};
const btnStyle: React.CSSProperties = {
  height: 32, padding: '0 16px', border: '1px solid #c8c4bc', borderRadius: 6,
  fontSize: 12, cursor: 'pointer', background: '#fff', color: '#333', fontFamily: 'inherit',
};
const btnDark: React.CSSProperties = {
  ...btnStyle, background: '#333', color: '#fff', border: '1px solid #333', fontWeight: 600,
};
const btnDanger: React.CSSProperties = {
  ...btnStyle, color: '#c0392b', borderColor: '#e0b0ab', background: 'transparent',
};
const stab = (active: boolean): React.CSSProperties => ({
  height: 34, padding: '0 14px', fontSize: 12, cursor: 'pointer',
  borderTop: 'none', borderLeft: 'none', borderRight: 'none',
  borderBottom: `2px solid ${active ? '#333' : 'transparent'}`,
  color: active ? '#333' : '#a09e99', fontWeight: active ? 500 : 400,
  background: 'none', fontFamily: 'inherit', transition: 'color .15s',
});

const estadoBadge = (estado: string): React.CSSProperties => ({
  display: 'inline-block', padding: '2px 7px', borderRadius: 10, fontSize: 10, fontWeight: 600,
  background: estado === 'pendiente' ? '#fff3e0' : '#e8f5e9',
  color: estado === 'pendiente' ? '#e65100' : '#2e7d32',
});

export default function ImportarTab({ onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [stage, setStage] = useState<Stage>('idle');
  const [previewTab, setPreviewTab] = useState<PreviewTab>('facturas');
  const [error, setError] = useState('');
  const [added, setAdded] = useState<{ facturas: number; gastos: number; proveedores: number; clientes: number } | null>(null);

  function handleLoad() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Selecciona un archivo .json antes de cargar.'); return; }
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);
        const cont = raw?.contabilidad;
        if (!cont || !Array.isArray(cont.facturas) || !Array.isArray(cont.gastos)) {
          setError('El JSON no tiene el formato esperado: { contabilidad: { facturas: [...], gastos: [...] } }');
          return;
        }
        setPreview({
          facturas:    cont.facturas                          as Factura[],
          gastos:      cont.gastos                            as Gasto[],
          proveedores: (cont.proveedores ?? [])               as Proveedor[],
          clientes:    (Array.isArray(raw.clientes) ? raw.clientes : []) as Cliente[],
        });
        setPreviewTab('facturas');
        setStage('previewing');
      } catch {
        setError('No se pudo leer el archivo. Asegúrate de que es un JSON válido.');
      }
    };
    reader.readAsText(file);
  }

  async function handleConfirm() {
    if (!preview) return;
    setStage('importing');
    setError('');
    try {
      const result = await importarDatos(preview);
      setAdded(result.added);
      onImport({ facturas: result.facturas, gastos: result.gastos, proveedores: result.proveedores });
      setStage('done');
    } catch {
      setError('Error al guardar en Dropbox. Inténtalo de nuevo.');
      setStage('previewing');
    }
  }

  function handleCancel() {
    setPreview(null);
    setStage('idle');
    setError('');
    setAdded(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  // ── Done state ──────────────────────────────────────────────────────────────

  if (stage === 'done' && added) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: 36, maxWidth: 560 }}>
        <div style={{ fontSize: 20, marginBottom: 12 }}>✓</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: '#333' }}>Importación completada</div>
        <div style={{ fontSize: 12, color: '#6b6a66', lineHeight: 1.8 }}>
          <div>Facturas añadidas: <strong>{added.facturas}</strong></div>
          <div>Gastos añadidos: <strong>{added.gastos}</strong></div>
          <div>Proveedores añadidos: <strong>{added.proveedores}</strong></div>
          <div>Clientes añadidos: <strong>{added.clientes}</strong></div>
        </div>
        <button onClick={handleCancel} style={{ ...btnStyle, marginTop: 20 }}>
          Importar otro archivo
        </button>
      </div>
    );
  }

  // ── Idle state ──────────────────────────────────────────────────────────────

  if (stage === 'idle') {
    return (
      <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, padding: 32, maxWidth: 560 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#333' }}>Importar datos históricos</div>
        <div style={{ fontSize: 11, color: '#a09e99', marginBottom: 20, lineHeight: 1.6 }}>
          Selecciona un archivo <code>acrono_app.json</code> para importar facturas, gastos, proveedores y clientes.
          Facturas, gastos y proveedores se deduplicarán por <code>id</code>; clientes por <code>NIF</code>. Nada existente se sobreescribe.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            style={{ fontSize: 12, color: '#333' }}
          />
          <button onClick={handleLoad} style={btnDark}>Cargar y previsualizar</button>
        </div>
        {error && <div style={{ marginTop: 12, fontSize: 12, color: '#c0392b' }}>{error}</div>}
      </div>
    );
  }

  // ── Previewing / importing state ────────────────────────────────────────────

  const isImporting = stage === 'importing';

  return (
    <div style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 6, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid #e0ddd5', flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>Previsualización de importación</div>
          <div style={{ fontSize: 11, color: '#a09e99', marginTop: 2 }}>
            {preview!.facturas.length} facturas · {preview!.gastos.length} gastos · {preview!.proveedores.length} proveedores · {preview!.clientes.length} clientes
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleCancel} style={btnDanger} disabled={isImporting}>Cancelar</button>
          <button onClick={handleConfirm} style={btnDark} disabled={isImporting}>
            {isImporting ? 'Importando…' : 'Confirmar importación'}
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e0ddd5', padding: '0 20px', background: '#faf9f7' }}>
        {(['facturas', 'gastos', 'proveedores', 'clientes'] as PreviewTab[]).map(t => (
          <button key={t} style={stab(previewTab === t)} onClick={() => setPreviewTab(t)} disabled={isImporting}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span style={{ marginLeft: 5, fontSize: 10, color: '#a09e99' }}>
              ({preview![t].length})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', maxHeight: 480, overflowY: 'auto' }}>
        {previewTab === 'facturas' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <tr>
                <th style={thStyle}>Número</th>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Concepto</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Base</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                <th style={thStyle}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {preview!.facturas.length === 0 ? (
                <tr><td colSpan={7} style={{ ...tdStyle, color: '#a09e99', textAlign: 'center', padding: 24 }}>Sin facturas en el archivo</td></tr>
              ) : preview!.facturas.map(f => (
                <tr key={f.id} style={{ background: 'transparent' }}>
                  <td style={tdStyle}>{f.numero || '—'}</td>
                  <td style={tdStyle}>{f.fecha || '—'}</td>
                  <td style={tdStyle}>{f.cliente || '—'}</td>
                  <td style={{ ...tdStyle, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.concepto || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(recBase(f))}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(recTotal(f))}</td>
                  <td style={tdStyle}><span style={estadoBadge(f.estado)}>{f.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {previewTab === 'gastos' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <tr>
                <th style={thStyle}>Número</th>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Proveedor</th>
                <th style={thStyle}>Concepto</th>
                <th style={thStyle}>Categoría</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Base</th>
                <th style={thStyle}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {preview!.gastos.length === 0 ? (
                <tr><td colSpan={7} style={{ ...tdStyle, color: '#a09e99', textAlign: 'center', padding: 24 }}>Sin gastos en el archivo</td></tr>
              ) : preview!.gastos.map(g => (
                <tr key={g.id}>
                  <td style={tdStyle}>{g.numero || '—'}</td>
                  <td style={tdStyle}>{g.fecha || '—'}</td>
                  <td style={tdStyle}>{g.proveedor || '—'}</td>
                  <td style={{ ...tdStyle, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.concepto || '—'}</td>
                  <td style={tdStyle}>{g.categoria || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(recBase(g))}</td>
                  <td style={tdStyle}><span style={estadoBadge(g.estado)}>{g.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {previewTab === 'proveedores' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <tr>
                <th style={thStyle}>Nombre</th>
                <th style={thStyle}>NIF</th>
                <th style={thStyle}>Categoría habitual</th>
                <th style={thStyle}>Nota</th>
              </tr>
            </thead>
            <tbody>
              {preview!.proveedores.length === 0 ? (
                <tr><td colSpan={4} style={{ ...tdStyle, color: '#a09e99', textAlign: 'center', padding: 24 }}>Sin proveedores en el archivo</td></tr>
              ) : preview!.proveedores.map(p => (
                <tr key={p.id}>
                  <td style={tdStyle}>{p.nombre || '—'}</td>
                  <td style={tdStyle}>{p.nif || '—'}</td>
                  <td style={tdStyle}>{p.categoria || '—'}</td>
                  <td style={{ ...tdStyle, color: '#6b6a66' }}>{p.nota || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {previewTab === 'clientes' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <tr>
                <th style={thStyle}>Nombre</th>
                <th style={thStyle}>NIF</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Desde</th>
                <th style={thStyle}>Email</th>
              </tr>
            </thead>
            <tbody>
              {preview!.clientes.length === 0 ? (
                <tr><td colSpan={6} style={{ ...tdStyle, color: '#a09e99', textAlign: 'center', padding: 24 }}>Sin clientes en el archivo</td></tr>
              ) : preview!.clientes.map(c => (
                <tr key={c.id}>
                  <td style={tdStyle}>{c.nombre || '—'}</td>
                  <td style={tdStyle}>{c.nif || '—'}</td>
                  <td style={tdStyle}>{c.tipo || '—'}</td>
                  <td style={tdStyle}><span style={estadoBadge(c.estado)}>{c.estado}</span></td>
                  <td style={tdStyle}>{c.desde || '—'}</td>
                  <td style={tdStyle}>{c.email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {error && (
        <div style={{ padding: '10px 20px', fontSize: 12, color: '#c0392b', borderTop: '1px solid #fde0de', background: '#fff9f9' }}>
          {error}
        </div>
      )}
    </div>
  );
}
