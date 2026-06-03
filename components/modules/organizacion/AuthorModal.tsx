'use client';

import { useState } from 'react';
import type { Author } from '@/lib/types';

interface Props {
  authors: Author[];
  onSave: (authors: Author[]) => void;
  onClose: () => void;
  isPending: boolean;
}

const btnStyle: React.CSSProperties = {
  height: 30, padding: '0 12px', border: '1px solid #c8c4bc', borderRadius: 6,
  fontSize: 11, cursor: 'pointer', background: '#fff', color: '#333',
};
const btnDark: React.CSSProperties = { ...btnStyle, background: '#333', color: '#fff', border: '1px solid #333', fontWeight: 600 };

export default function AuthorModal({ authors: initialAuthors, onSave, onClose, isPending }: Props) {
  const [authors, setAuthors] = useState<Author[]>(initialAuthors);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#4a90d9');

  const updateField = (id: string, field: keyof Author, value: string) =>
    setAuthors(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));

  const removeAuthor = (id: string) => {
    if (authors.length <= 1) { alert('Debe haber al menos un autor'); return; }
    if (!confirm('¿Eliminar autor?')) return;
    setAuthors(prev => prev.filter(a => a.id !== id));
  };

  const addAuthor = () => {
    const n = newName.trim();
    if (!n) return;
    setAuthors(prev => [...prev, { id: 'a' + Date.now(), name: n, color: newColor }]);
    setNewName('');
  };

  const inputStyle: React.CSSProperties = {
    height: 32, border: '1px solid #c8c4bc', borderRadius: 4,
    padding: '0 8px', fontSize: 12, fontFamily: 'inherit', color: '#333', background: '#fff',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 10, width: 440, maxHeight: '90vh', overflowY: 'auto', padding: 26, boxShadow: '0 20px 60px rgba(0,0,0,.2)', fontFamily: 'inherit' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>Autores</h2>

        {/* Author list */}
        <div>
          {authors.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #e0ddd5' }}>
              <input type="color" value={a.color} onChange={e => updateField(a.id, 'color', e.target.value)}
                style={{ width: 32, height: 32, border: '1px solid #c8c4bc', borderRadius: 4, cursor: 'pointer', flexShrink: 0 }} />
              <input value={a.name} onChange={e => updateField(a.id, 'name', e.target.value)}
                style={{ ...inputStyle, flex: 1 }} />
              <button onClick={() => removeAuthor(a.id)}
                style={{ height: 28, padding: '0 10px', border: '1px solid #e0b0ab', background: 'transparent', borderRadius: 4, cursor: 'pointer', fontSize: 11, color: '#c0392b' }}>
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Add new */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid #e0ddd5' }}>
          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addAuthor()}
            placeholder="Nombre del autor"
            style={{ ...inputStyle, flex: 1 }}
          />
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
            style={{ width: 40, height: 32, border: '1px solid #c8c4bc', borderRadius: 4, cursor: 'pointer' }} />
          <button onClick={addAuthor} style={btnDark}>+ Añadir</button>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18, paddingTop: 14, borderTop: '1px solid #e0ddd5' }}>
          <button onClick={onClose} style={btnStyle}>Cancelar</button>
          <button onClick={() => onSave(authors)} style={btnDark} disabled={isPending}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
