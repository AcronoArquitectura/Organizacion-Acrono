'use client';

import type { Proyecto, Obra, Author } from '@/lib/types';
import { weeksBetween, addWeeks, fmtDate, clipBar, buildMonthGroups } from '@/lib/utils/gantt';
import GanttContainer from './GanttContainer';
import type { TooltipState } from './GanttProyectos';

interface Props {
  projects: Proyecto[];
  obras: Obra[];
  authors: Author[];
  weeks: Date[];
  cellW: number;
  todayIdx: number;
  filterAuthorId: string;
  onEditProject: (id: string) => void;
  onEditObra: (id: string) => void;
  setTooltip: (t: TooltipState) => void;
}

const LABEL_W = 200;
const ROW_H = 22;
const BAR_H = 14;

export default function GanttOrg({
  projects, obras, authors, weeks, cellW, todayIdx,
  filterAuthorId, onEditProject, onEditObra, setTooltip,
}: Props) {
  const monthGroups = buildMonthGroups(weeks);
  const totalW = weeks.length * cellW;

  type Item = (Proyecto & { _type: 'project' }) | (Obra & { _type: 'obra' });
  const items: Item[] = [];
  (filterAuthorId
    ? projects.filter(p => p.authorId === filterAuthorId)
    : projects
  ).forEach(p => items.push({ ...p, _type: 'project' }));
  (filterAuthorId
    ? obras.filter(o => o.authorId === filterAuthorId)
    : obras
  ).forEach(o => items.push({ ...o, _type: 'obra' }));
  items.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return (
    <GanttContainer weeks={weeks} cellW={cellW} todayIdx={todayIdx} monthGroups={monthGroups}>
      {!items.length ? (
        <div style={{ padding: '80px 0 80px 220px', textAlign: 'center', color: '#6b6a66' }}>
          <div style={{ fontSize: 15, marginBottom: 8, fontWeight: 600, color: '#333' }}>Sin datos</div>
          <div>Añade proyectos u obras desde las otras pestañas.</div>
        </div>
      ) : items.map(item => {
        const isProject = item._type === 'project';
        const author = authors.find(a => a.id === item.authorId);
        const authorColor = author?.color ?? '#888';
        const totalWeeks = (item.phases ?? []).reduce((s, ph) => s + (ph.weeks || 0), 0);
        const itemStart = new Date(item.startDate);
        const tipEnd = addWeeks(itemStart, totalWeeks);
        const tip = `${item.code ?? ''} · ${item.name ?? ''}\n${isProject ? 'Proyecto' : 'Obra'} · ${totalWeeks} sem\n${fmtDate(itemStart)} → ${fmtDate(tipEnd)}\n${author?.name ?? ''}`;
        const opacity = isProject ? 1 : 0.5;
        const onEdit = () => isProject ? onEditProject(item.id) : onEditObra(item.id);

        const bars: React.ReactNode[] = [];
        let cursor = new Date(itemStart);
        (item.phases ?? []).forEach((ph, pi) => {
          if (!ph.weeks) return;
          const phAuthorIds = ph.authorIds?.length ? ph.authorIds : item.authorId ? [item.authorId] : [];
          const phColors = phAuthorIds.map(id => authors.find(a => a.id === id)?.color ?? '#888');
          const phStart = new Date(cursor);
          const startPx = weeksBetween(weeks[0], phStart) * cellW;
          const totalPx = Math.max(ph.weeks * cellW - 1, 2);
          const clip = clipBar(startPx, totalPx, totalW);
          cursor = addWeeks(cursor, ph.weeks);
          if (!clip) return;
          const nS = phColors.length || 1;
          const sH = BAR_H / nS;
          bars.push(
            <div
              key={pi}
              style={{
                position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                left: clip.left, width: clip.width, height: BAR_H,
                borderRadius: 3, overflow: 'hidden', opacity, cursor: 'pointer',
              }}
              onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, text: tip })}
              onMouseLeave={() => setTooltip(null)}
              onMouseMove={e => setTooltip({ x: e.clientX, y: e.clientY, text: tip })}
              onClick={onEdit}
            >
              {phColors.map((ac, si) => (
                <div key={si} style={{
                  position: 'absolute', left: 0, right: 0, top: si * sH, height: sH, background: ac,
                }} />
              ))}
            </div>
          );
        });

        return (
          <div
            key={item.id}
            style={{
              display: 'flex', alignItems: 'stretch',
              borderBottom: '1px solid #e0ddd5', minHeight: ROW_H, background: '#fff',
            }}
          >
            <div
              onClick={onEdit}
              style={{
                width: LABEL_W, minWidth: LABEL_W, padding: '2px 6px',
                display: 'flex', alignItems: 'center',
                borderRight: '1px solid #e0ddd5', cursor: 'pointer',
                position: 'sticky', left: 0, background: 'inherit', zIndex: 5,
                borderLeft: `3px solid ${authorColor}`,
              }}
            >
              <span style={{
                fontSize: 9, fontWeight: 600,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                color: isProject ? '#333' : '#6b6a66',
              }}>
                {item.code ?? ''}
              </span>
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
