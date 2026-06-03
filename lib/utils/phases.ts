import type { Proyecto } from '@/lib/types';

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

export function getCurrentPhase(proyecto: Proyecto): string {
  const now = new Date();
  const start = new Date(proyecto.startDate);
  if (now < start) return 'En Espera';
  let cursor = new Date(start);
  for (const phase of proyecto.phases) {
    const end = addWeeks(cursor, phase.weeks);
    if (now >= cursor && now < end) return phase.label;
    cursor = end;
  }
  return 'Finalizado';
}

export function getPhaseProgress(proyecto: Proyecto): number {
  const now = new Date();
  const start = new Date(proyecto.startDate);
  if (now < start) return 0;
  const totalWeeks = proyecto.phases.reduce((s, p) => s + p.weeks, 0);
  if (!totalWeeks) return 0;
  const elapsed = Math.max(0, now.getTime() - start.getTime());
  return Math.min(100, Math.round((elapsed / (totalWeeks * 7 * 24 * 3600 * 1000)) * 100));
}
