'use client';

import { useState } from 'react';
import type { Obra, Author, ObraPhase } from '@/lib/types';
import { OBRA_PHASE_DEFS, getMondayOfWeek, dateToInput } from '@/lib/utils/gantt';

interface Props {
  obra: Obra | null;
  authors: Author[];
  onSave: (o: Obra) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  isPending: boolean;
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 34, border: '1px solid #c8c4bc', borderRadius: 6,
  padding: '0 10px', fontSize: 12, fontFamily: 'inherit', background: '#fff', color: '#333',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10, color: '#6b6a66', marginBottom: 3,
  textTransform: 'uppercase', letterSpacing: '.05em',
};
const btnStyle: React.CSSProperties = {
  height: 30, padding: '0 12px', border: '1px solid #c8c4bc', borderRadius: 6,
  fontSize: 11, cursor: 'pointer', background: '#fff', color: '#333',
};
const btnDark: React.CSSProperties = { ...btnStyle, background: '#333', color: '#fff', border: '1px solid #333', fontWeight: 600 };
const btnDanger: React.CSSProperties = { ...btnStyle, color: '#c0392b', borderColor: '#e0b0ab', background: 'transparent' };
const sectionLabel: React.CSSProperties = {
  fontSize: 10, color: '#6b6a66', textTransform: 'uppercase', letterSpacing: '.07em',
  fontWeight: 600, margin: '16px 0 6px',
};

export default function ObraModal({ obra, authors, onSave, onDelete, onClose, isPending }: Props) {
  const isNew = !obra;
  const defaultStart = dateToInput(getMondayOfWeek(new Date()));

  const [code, setCode] = useState(obra?.code ?? '');
  const [name, setName] = useState(obra?.name ?? '');
  const [startDate, setStartDate] = useState(obra ? dateToInput(new Date(obra.startDate)) : defaultStart);
  const [authorId, setAuthorId] = useState<string | null>(obra?.authorId ?? null);

  // Phases: always 3 fixed. Weeks and authorIds editable.
  const initPhaseWeeks = (key: string) => {
    const ex = obra?.phases?.find(p => p.key === key);
    return ex?.weeks ?? OBRA_PHASE_DEFS.find(d => d.key === key)?.defaultWeeks ?? 0;
  };
  const initPhaseAuthorIds = (key: string) => obra?.phases?.find(p => p.key === key)?.authorIds ?? [];

  const [phaseWeeks, setPhaseWeeks] = useState<Record<string, number>>({
    aio: initPhaseWeeks('aio'), do: initPhaseWeeks('do'), cfo: initPhaseWeeks('cfo'),
  });
  const [phaseAuthorIds, setPhaseAuthorIds] = useState<Record<string, string[]>>({
    aio: initPhaseAuthorIds('aio'), do: initPhaseAuthorIds('do'), cfo: initPhaseAuthorIds('cfo'),
  });

  const togglePhaseAuthor = (phKey: string, aId: string) => {
    setPhaseAuthorIds(prev => {
      const arr = prev[phKey] ?? [];
      const has = arr.includes(aId);
      if (!has && arr.length >= 3) return prev;
      return { ...prev, [phKey]: has ? arr.filter(x => x !== aId) : [...arr, aId] };
    });
  };

  const handleSave = () => {
    if (!startDate) { alert('Introduce una fecha de inicio'); return; }
    const phases: ObraPhase[] = OBRA_PHASE_DEFS.map(def => ({
      key: def.key as 'aio' | 'do' | 'cfo',
      weeks: phaseWeeks[def.key] ?? def.defaultWeeks,
      authorIds: phaseAuthorIds[def.key] ?? [],
    }));
    const o: Obra = {
      id: obra?.id ?? ('ob' + Date.now()),
      code, name,
      startDate: new Date(startDate + 'T00:00:00').toISOString(),
      authorId: authorId ?? '',
      phases,
    };
    onSave(o);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 10, width: 580, maxHeight: '90vh', overflowY: 'auto', padding: 26, boxShadow: '0 20px 60px rgba(0,0,0,.2)', fontFamily: 'inherit' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>{isNew ? 'Nueva obra' : 'Editar obra'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#a09e99', lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Código</label><input style={inputStyle} value={code} onChange={e => setCode(e.target.value)} placeholder="OB.001" /></div>
          <div><label style={labelStyle}>Nombre / descripción</label><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Nombre de la obra" /></div>
          <div><label style={labelStyle}>Fecha inicio (lunes)</label><input type="date" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        </div>

        <div style={sectionLabel}>Autor principal</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {authors.map(a => {
            const sel = authorId === a.id;
            return (
              <button key={a.id} type="button" onClick={() => setAuthorId(sel ? null : a.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 11px',
                  borderRadius: 20, fontSize: 11, cursor: 'pointer',
                  border: `2px solid ${sel ? '#333' : 'transparent'}`,
                  background: sel ? a.color + '22' : '#f5f4f0',
                  fontWeight: sel ? 600 : 400,
                }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                {a.name}
              </button>
            );
          })}
        </div>

        <div style={sectionLabel}>Fases — semanas y autores</div>
        <div style={{ fontSize: 10, color: '#a09e99', marginBottom: 8 }}>Hasta 3 autores por fase.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {OBRA_PHASE_DEFS.map(def => (
            <div key={def.key} style={{ display: 'grid', gridTemplateColumns: '1fr 52px 18px 1fr', gap: 8, alignItems: 'center', padding: '5px 8px', background: '#f5f4f0', borderRadius: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 500 }}>{def.label}</span>
              <input
                type="number" min={0} max={999} value={phaseWeeks[def.key]}
                onChange={e => setPhaseWeeks(prev => ({ ...prev, [def.key]: parseInt(e.target.value) || 0 }))}
                style={{ height: 28, textAlign: 'center', border: '1px solid #c8c4bc', borderRadius: 4, fontFamily: 'inherit', fontSize: 12, background: '#fff', color: '#333' }}
              />
              <span style={{ fontSize: 9, color: '#6b6a66' }}>sem</span>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                {authors.map(a => {
                  const sel = (phaseAuthorIds[def.key] ?? []).includes(a.id);
                  const maxed = !sel && (phaseAuthorIds[def.key] ?? []).length >= 3;
                  return (
                    <div key={a.id} title={a.name}
                      onClick={() => !maxed && togglePhaseAuthor(def.key, a.id)}
                      style={{
                        width: 20, height: 20, borderRadius: '50%', background: a.color,
                        cursor: maxed ? 'not-allowed' : 'pointer',
                        border: `2px solid ${sel ? '#333' : 'transparent'}`,
                        opacity: maxed ? 0.2 : 1, flexShrink: 0,
                      }} />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18, paddingTop: 14, borderTop: '1px solid #e0ddd5' }}>
          {!isNew && (
            <button onClick={() => { if (confirm('¿Eliminar obra?')) onDelete(obra!.id); }}
              style={{ ...btnDanger, marginRight: 'auto' }} disabled={isPending}>
              Eliminar
            </button>
          )}
          <button onClick={onClose} style={btnStyle}>Cancelar</button>
          <button onClick={handleSave} style={btnDark} disabled={isPending}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
