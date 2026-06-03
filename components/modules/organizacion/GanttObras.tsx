'use client';

import { useRef, useCallback, useState } from 'react';
import type { Obra, Author } from '@/lib/types';
import { OBRA_PHASE_DEFS, weeksBetween, addWeeks, fmtDate, clipBar, buildMonthGroups } from '@/lib/utils/gantt';
import GanttContainer from './GanttContainer';
import type { TooltipState } from './GanttProyectos';

interface Props {
  obras: Obra[];
  authors: Author[];
  weeks: Date[];
  cellW: number;
  todayIdx: number;
  filterAuthorId: string;
  onEdit: (id: string) => void;
  onReorder: (ids: string[]) => void;
  setTooltip: (t: TooltipState) => void;
}

const LABEL_W = 200;
const ROW_H = 48;

export default function GanttObras({
  obras, authors, weeks, cellW, todayIdx,
  filterAuthorId, onEdit, onReorder, setTooltip,
}: Props) {
  const draggingId = useRef<string | null>(null);
  const obrasRef = useRef(obras);
  obrasRef.current = obras;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const monthGroups = buildMonthGroups(weeks);
  const totalW = weeks.length * cellW;

  const filtered = filterAuthorId
    ? obras.filter(o => o.authorId === filterAuthorId
        || (o.phases ?? []).some(ph => (ph.authorIds ?? []).includes(filterAuthorId)))
    : obras;

  const startDrag = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    draggingId.current = id;
    document.addEventListener('mouseup', () => { draggingId.current = null; }, { once: true });
  }, []);

  const onRowMouseEnter = useCallback((targetId: string) => {
    setHoveredId(targetId);
    const fromId = draggingId.current;
    if (!fromId || fromId === targetId) return;
    const list = obrasRef.current;
    const fi = list.findIndex(o => o.id === fromId);
    const ti = list.findIndex(o => o.id === targetId);
    if (fi < 0 || ti < 0) return;
    const ids = list.map(o => o.id);
    const [m] = ids.splice(fi, 1);
    ids.splice(ti, 0, m);
    onReorder(ids);
  }, [onReorder]);

  return (
    <GanttContainer weeks={weeks} cellW={cellW} todayIdx={todayIdx} monthGroups={monthGroups}>
      {!filtered.length ? (
        <div style={{ padding: '80px 0 80px 220px', textAlign: 'center', color: '#6b6a66' }}>
          <div style={{ fontSize: 15, marginBottom: 8, fontWeight: 600, color: '#333' }}>Sin obras</div>
          <div>Pulsa &quot;+ Obra&quot; para añadir la primera.</div>
        </div>
      ) : filtered.map(obra => {
        const obraAuthor = authors.find(a => a.id === obra.authorId);
        const accentColor = obraAuthor?.color ?? '#888';

        const bars: React.ReactNode[] = [];
        let cursor = new Date(obra.startDate);
        (obra.phases ?? []).forEach((ph, pi) => {
          if (!ph.weeks) return;
          const phDef = OBRA_PHASE_DEFS.find(d => d.key === ph.key);
          const phStart = new Date(cursor);
          const startPx = weeksBetween(weeks[0], phStart) * cellW;
          const totalPx = Math.max(ph.weeks * cellW - 1, 2);
          const barH = Math.min(cellW - 2, 26);
          const phAuthorIds = ph.authorIds?.length ? ph.authorIds : obra.authorId ? [obra.authorId] : [];
          const authorColors = phAuthorIds.map(id => authors.find(a => a.id === id)?.color ?? '#888');
          const abbr = phDef?.abbr ?? ph.key.toUpperCase();
          const phEnd = addWeeks(phStart, ph.weeks);
          const tip = `${phDef?.label ?? ph.key}: ${ph.weeks} sem\n${fmtDate(phStart)} → ${fmtDate(phEnd)}`;
          const clip = clipBar(startPx, totalPx, totalW);
          cursor = addWeeks(cursor, ph.weeks);
          if (!clip) return;
          const dotSize = Math.min(barH - 4, 20);
          const dotLeft = totalPx / 2 - dotSize / 2 - clip.innerOffset;
          const dotVisible = dotLeft >= 0 && dotLeft + dotSize <= clip.width;
          const nStripes = authorColors.length || 1;
          const stripeH = barH / nStripes;
          bars.push(
            <div
              key={pi}
              style={{
                position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                left: clip.left, width: clip.width, height: barH,
                cursor: 'pointer', borderRadius: 4, overflow: 'hidden',
              }}
              onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, text: tip })}
              onMouseLeave={() => setTooltip(null)}
              onMouseMove={e => setTooltip({ x: e.clientX, y: e.clientY, text: tip })}
              onClick={() => onEdit(obra.id)}
            >
              {authorColors.map((ac, si) => (
                <div key={si} style={{
                  position: 'absolute', left: 0, right: 0,
                  top: si * stripeH, height: stripeH, background: ac, opacity: 0.85,
                }} />
              ))}
              {dotVisible && (
                <div style={{
                  position: 'absolute', left: dotLeft, top: '50%', transform: 'translateY(-50%)',
                  width: dotSize, height: dotSize, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', zIndex: 2,
                }}>
                  <span style={{ fontSize: dotSize < 16 ? 6 : 7, fontWeight: 700, color: '#fff' }}>{abbr}</span>
                </div>
              )}
            </div>
          );
        });

        const isHovered = hoveredId === obra.id;
        return (
          <div
            key={obra.id}
            onMouseEnter={() => onRowMouseEnter(obra.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              display: 'flex', alignItems: 'stretch',
              borderBottom: '1px solid #e0ddd5', minHeight: ROW_H,
              background: isHovered ? '#fafaf8' : '#fff', transition: 'background .1s',
            }}
          >
            <div
              onClick={() => onEdit(obra.id)}
              style={{
                width: LABEL_W, minWidth: LABEL_W,
                padding: '6px 10px 6px 22px', display: 'flex', flexDirection: 'column',
                justifyContent: 'center', gap: 2, borderRight: '1px solid #e0ddd5',
                cursor: 'pointer', position: 'sticky', left: 0, background: 'inherit', zIndex: 5,
                borderLeft: `3px solid ${accentColor}`,
              }}
            >
              <div
                onMouseDown={e => startDrag(e, obra.id)}
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'grab', color: '#a09e99', fontSize: 11,
                  opacity: isHovered ? 1 : 0, transition: 'opacity .15s',
                }}
              >⠿</div>
              <span style={{ fontSize: 9, color: '#6b6a66', fontFamily: 'monospace' }}>{obra.code ?? ''}</span>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{obra.name ?? ''}</span>
              <span style={{ fontSize: 9, color: '#a09e99' }}>{obraAuthor?.name ?? ''}</span>
            </div>
            <div style={{ position: 'relative', width: totalW, height: ROW_H, flexShrink: 0 }}>
              {weeks.map((w, i) => (
                <div key={i} style={{
                  position: 'absolute', top: 0, bottom: 0, left: i * cellW,
                  width: i === todayIdx ? 2 : 1,
                  background: i === todayIdx ? '#e74c3c' : w.getDate() <= 7 ? '#c8c4bc' : '#e0ddd5',
                  opacity: i === todayIdx ? 0.6 : 1, pointerEvents: 'none',
                }} />
              ))}
              {bars}
            </div>
          </div>
        );
      })}
    </GanttContainer>
  );
}
