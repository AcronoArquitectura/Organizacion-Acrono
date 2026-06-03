import React from 'react';
import { MONTH_NAMES, type MonthGroup } from '@/lib/utils/gantt';

const LABEL_W = 200;

interface Props {
  weeks: Date[];
  cellW: number;
  todayIdx: number;
  monthGroups: MonthGroup[];
  children: React.ReactNode;
}

export default function GanttContainer({ weeks, cellW, todayIdx, monthGroups, children }: Props) {
  return (
    <div style={{ padding: '0 20px 20px', minWidth: 'max-content' }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f5f4f0', paddingBottom: 2, display: 'flex' }}>
        <div style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0 }} />
        <div style={{ display: 'flex' }}>
          {monthGroups.map((mg, mi) => (
            <div key={mi} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{
                width: mg.count * cellW, fontSize: 9, color: '#6b6a66', textAlign: 'center',
                borderLeft: '1px solid #c8c4bc', padding: '0 4px 2px',
                fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
              }}>
                {MONTH_NAMES[mg.month]}{mg.count * cellW > 32 ? ` '${String(mg.year).slice(2)}` : ''}
              </div>
              <div style={{ display: 'flex' }}>
                {Array.from({ length: mg.count }, (_, i) => {
                  const w = weeks[mg.startIdx + i];
                  const isToday = (mg.startIdx + i) === todayIdx;
                  return (
                    <div key={i} style={{
                      width: cellW, minWidth: cellW, fontSize: 8,
                      color: isToday ? '#c0392b' : '#a09e99', textAlign: 'center', lineHeight: 1,
                      borderLeft: `${w.getDate() <= 7 ? 2 : 1}px solid #c8c4bc`,
                      paddingTop: 2, fontWeight: isToday ? 600 : 400,
                      background: isToday ? '#fff3f3' : 'transparent',
                    }}>
                      {w.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}

export const LABEL_WIDTH = LABEL_W;
