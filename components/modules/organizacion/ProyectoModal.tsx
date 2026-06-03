'use client';

import { useState, useCallback } from 'react';
import type { Proyecto, Author, Phase, Meeting } from '@/lib/types';
import {
  PHASE_DEFS, DEFAULT_MEETING_TEMPLATE, getMondayOfWeek, addWeeks, dateToInput,
} from '@/lib/utils/gantt';

interface PhaseEdit {
  key: string;
  label: string;
  abbr: string;
  color: string;
  weeks: number;
  authorIds: string[];
}

interface MeetingEdit {
  num: number;
  relWeek: number;
  label: string;
}

interface Props {
  proyecto: Proyecto | null;
  authors: Author[];
  onSave: (p: Proyecto) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  isPending: boolean;
}

function getDefaultMeetings(startDateStr: string): MeetingEdit[] {
  return DEFAULT_MEETING_TEMPLATE.map(t => ({ num: t.num, relWeek: t.relWeek, label: t.label }));
}

function buildDefaultPhases(): PhaseEdit[] {
  return PHASE_DEFS.map(d => ({ key: d.key, label: d.label, abbr: d.abbr, color: d.color, weeks: d.defaultWeeks, authorIds: [] }));
}

function buildPhasesFromProject(phases: Phase[]): PhaseEdit[] {
  return phases.map(ph => {
    const def = PHASE_DEFS.find(d => d.key === ph.key);
    return {
      key: ph.key,
      label: ph.label ?? def?.label ?? ph.key,
      abbr: ph.abbr ?? def?.abbr ?? ph.key.slice(0, 2).toUpperCase(),
      color: ph.color ?? def?.color ?? '#ccc',
      weeks: ph.weeks ?? def?.defaultWeeks ?? 1,
      authorIds: ph.authorIds ?? [],
    };
  });
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

export default function ProyectoModal({ proyecto, authors, onSave, onDelete, onClose, isPending }: Props) {
  const isNew = !proyecto;
  const defaultStart = dateToInput(getMondayOfWeek(new Date()));

  const [code, setCode] = useState(proyecto?.code ?? '');
  const [name, setName] = useState(proyecto?.name ?? '');
  const [startDate, setStartDate] = useState(proyecto ? dateToInput(new Date(proyecto.startDate)) : defaultStart);
  const [authorId, setAuthorId] = useState<string | null>(proyecto?.authorId ?? null);
  const [phases, setPhases] = useState<PhaseEdit[]>(
    proyecto ? buildPhasesFromProject(proyecto.phases) : buildDefaultPhases()
  );
  const [meetings, setMeetings] = useState<MeetingEdit[]>(
    proyecto?.meetings?.map(m => ({ num: m.num, relWeek: m.relWeek, label: m.label }))
    ?? getDefaultMeetings(defaultStart)
  );
  const [dragPhaseIdx, setDragPhaseIdx] = useState<number | null>(null);

  // ── Phase editor helpers ──────────────────────────────────────────────────

  const updatePhase = (idx: number, patch: Partial<PhaseEdit>) =>
    setPhases(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));

  const togglePhaseAuthor = (phIdx: number, aId: string) => {
    setPhases(prev => prev.map((p, i) => {
      if (i !== phIdx) return p;
      const has = p.authorIds.includes(aId);
      if (!has && p.authorIds.length >= 3) return p;
      return { ...p, authorIds: has ? p.authorIds.filter(x => x !== aId) : [...p.authorIds, aId] };
    }));
  };

  const removePhase = (idx: number) => setPhases(prev => prev.filter((_, i) => i !== idx));

  const addPhase = () => setPhases(prev => [...prev, {
    key: 'ph_' + Date.now(), label: 'Nueva fase',
    abbr: 'NF', color: '#d0d0d0', weeks: 2, authorIds: [],
  }]);

  // Drag-to-reorder phases (HTML5 drag API)
  const onPhaseDragStart = (idx: number) => setDragPhaseIdx(idx);
  const onPhaseDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragPhaseIdx === null || dragPhaseIdx === idx) return;
    setPhases(prev => {
      const arr = [...prev];
      const [item] = arr.splice(dragPhaseIdx, 1);
      arr.splice(idx, 0, item);
      return arr;
    });
    setDragPhaseIdx(idx);
  }, [dragPhaseIdx]);

  // ── Meetings helpers ──────────────────────────────────────────────────────

  const updateMeeting = (idx: number, patch: Partial<MeetingEdit>) =>
    setMeetings(prev => {
      const next = prev.map((m, i) => i === idx ? { ...m, ...patch } : m);
      if ('relWeek' in patch) return [...next].sort((a, b) => a.relWeek - b.relWeek).map((m, i) => ({ ...m, num: i + 1 }));
      return next;
    });

  const addMeeting = () => setMeetings(prev => {
    const maxWeek = prev.length ? Math.max(...prev.map(m => m.relWeek)) : 0;
    return [...prev, { num: prev.length + 1, relWeek: maxWeek + 3, label: '' }];
  });

  const removeMeeting = (idx: number) =>
    setMeetings(prev => prev.filter((_, i) => i !== idx).map((m, i) => ({ ...m, num: i + 1 })));

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!startDate) { alert('Introduce una fecha de inicio'); return; }
    const start = new Date(startDate + 'T00:00:00');
    const outPhases: Phase[] = phases.map(ph => ({
      key: ph.key, label: ph.label, abbr: ph.abbr, color: ph.color,
      weeks: ph.weeks, authorIds: ph.authorIds,
    }));
    const outMeetings: Meeting[] = meetings.map(m => ({
      num: m.num, relWeek: m.relWeek, label: m.label,
      date: dateToInput(addWeeks(start, m.relWeek - 1)),
    }));
    const proj: Proyecto = {
      id: proyecto?.id ?? ('p' + Date.now()),
      code, name,
      startDate: start.toISOString(),
      authorId: authorId ?? '',
      phases: outPhases,
      meetings: outMeetings,
    };
    onSave(proj);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 10, width: 680, maxHeight: '90vh', overflowY: 'auto', padding: 26, boxShadow: '0 20px 60px rgba(0,0,0,.2)', fontFamily: 'inherit' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{isNew ? 'Nuevo proyecto' : 'Editar proyecto'}</h2>

        {/* Datos básicos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>Código</label><input style={inputStyle} value={code} onChange={e => setCode(e.target.value)} placeholder="VU.121" /></div>
          <div><label style={labelStyle}>Nombre / descripción</label><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Vivienda unifamiliar" /></div>
          <div><label style={labelStyle}>Fecha inicio (lunes)</label><input type="date" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
        </div>

        {/* Autor principal */}
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

        {/* Fases */}
        <div style={sectionLabel}>Fases — semanas y autores</div>
        <div style={{ fontSize: 10, color: '#a09e99', marginBottom: 8 }}>Hasta 3 autores por fase. Arrastra para reordenar.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {phases.map((ph, idx) => (
            <div
              key={ph.key}
              draggable
              onDragStart={() => onPhaseDragStart(idx)}
              onDragOver={e => onPhaseDragOver(e, idx)}
              onDragEnd={() => setDragPhaseIdx(null)}
              style={{
                display: 'grid', gridTemplateColumns: '18px 1fr 52px 18px 28px 1fr 22px',
                gap: 6, alignItems: 'center', padding: '5px 8px',
                background: '#f5f4f0', borderRadius: 5,
                opacity: dragPhaseIdx === idx ? 0.4 : 1,
              }}
            >
              <span style={{ cursor: 'grab', color: '#a09e99', fontSize: 13, lineHeight: 1.8, userSelect: 'none' }}>⠿</span>
              <input
                value={ph.label} onChange={e => updatePhase(idx, { label: e.target.value })}
                style={{ height: 28, border: '1px solid #c8c4bc', borderRadius: 4, padding: '0 6px', fontSize: 11, fontFamily: 'inherit', color: '#333', background: '#fff' }}
              />
              <input
                type="number" min={0} max={99} value={ph.weeks}
                onChange={e => updatePhase(idx, { weeks: parseInt(e.target.value) || 0 })}
                style={{ height: 28, textAlign: 'center', border: '1px solid #c8c4bc', borderRadius: 4, fontFamily: 'inherit', fontSize: 12, background: '#fff', color: '#333' }}
              />
              <span style={{ fontSize: 9, color: '#6b6a66' }}>sem</span>
              <input
                type="color" value={ph.color} onChange={e => updatePhase(idx, { color: e.target.value })}
                style={{ width: 28, height: 28, border: '1px solid #c8c4bc', borderRadius: 4, cursor: 'pointer', padding: 1 }}
              />
              {/* Author dots */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                {authors.map(a => {
                  const sel = ph.authorIds.includes(a.id);
                  const maxed = !sel && ph.authorIds.length >= 3;
                  return (
                    <div key={a.id} title={a.name}
                      onClick={() => !maxed && togglePhaseAuthor(idx, a.id)}
                      style={{
                        width: 20, height: 20, borderRadius: '50%', background: a.color,
                        cursor: maxed ? 'not-allowed' : 'pointer',
                        border: `2px solid ${sel ? '#333' : 'transparent'}`,
                        opacity: maxed ? 0.2 : 1, transition: 'border-color .12s, opacity .12s',
                        flexShrink: 0,
                      }} />
                  );
                })}
              </div>
              <button onClick={() => removePhase(idx)}
                style={{ width: 22, height: 22, border: 'none', background: 'none', cursor: 'pointer', color: '#a09e99', fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
            </div>
          ))}
        </div>
        <button onClick={addPhase} style={{ ...btnStyle, marginTop: 6, fontSize: 11 }}>+ Fase</button>

        {/* Reuniones */}
        <div style={sectionLabel}>Reuniones</div>
        <div style={{ fontSize: 10, color: '#a09e99', marginBottom: 8 }}>Semana relativa al inicio del proyecto (1 = primera semana).</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {meetings.map((m, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#6b6a66', minWidth: 22, textAlign: 'right' }}>{m.num}ª</span>
              <input
                type="number" min={1} max={200} value={m.relWeek}
                onChange={e => updateMeeting(idx, { relWeek: parseInt(e.target.value) || 1 })}
                style={{ width: 52, height: 30, border: '1px solid #c8c4bc', borderRadius: 4, padding: '0 6px', fontSize: 11, fontFamily: 'inherit', textAlign: 'center', color: '#333' }}
              />
              <span style={{ fontSize: 10, color: '#a09e99' }}>sem</span>
              <input
                value={m.label} onChange={e => updateMeeting(idx, { label: e.target.value })}
                placeholder="Descripción" style={{ flex: 1, height: 30, border: '1px solid #c8c4bc', borderRadius: 4, padding: '0 8px', fontSize: 11, fontFamily: 'inherit', color: '#333' }}
              />
              <button onClick={() => removeMeeting(idx)}
                style={{ width: 24, height: 26, border: '1px solid #e0b0ab', background: 'transparent', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: '#c0392b' }}>✕</button>
            </div>
          ))}
        </div>
        <button onClick={addMeeting} style={{ ...btnStyle, marginTop: 6, fontSize: 11 }}>+ Reunión</button>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18, paddingTop: 14, borderTop: '1px solid #e0ddd5' }}>
          {!isNew && (
            <button onClick={() => { if (confirm('¿Eliminar proyecto?')) onDelete(proyecto!.id); }}
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
