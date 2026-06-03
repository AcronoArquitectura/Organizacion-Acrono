export interface PhaseDef {
  key: string;
  label: string;
  abbr: string;
  color: string;
  defaultWeeks: number;
}

export const PHASE_DEFS: PhaseDef[] = [
  { key: 'previos',       label: 'Trabajos previos',   abbr: 'TP', color: '#f0efed', defaultWeeks: 3  },
  { key: 'anteproyecto',  label: 'Anteproyecto',       abbr: 'AN', color: '#d9a8a8', defaultWeeks: 7  },
  { key: 'infografia',    label: 'Infografía 3D',      abbr: '3D', color: '#f0b87a', defaultWeeks: 5  },
  { key: 'premediciones', label: 'Premediciones',      abbr: 'PM', color: '#f5f0c8', defaultWeeks: 2  },
  { key: 'ejecucion',     label: 'Proyecto ejecución', abbr: 'PE', color: '#c8d48a', defaultWeeks: 17 },
  { key: 'visado',        label: 'Visado',             abbr: 'V',  color: '#b8c8d8', defaultWeeks: 1  },
];

export const OBRA_PHASE_DEFS: PhaseDef[] = [
  { key: 'aio', label: 'Acta Inicio Obra',     abbr: 'AIO', color: '#e0ddd5', defaultWeeks: 2  },
  { key: 'do',  label: 'Dirección de Obra',    abbr: 'DO',  color: '#e0ddd5', defaultWeeks: 52 },
  { key: 'cfo', label: 'Certificado Fin Obra', abbr: 'CFO', color: '#e0ddd5', defaultWeeks: 2  },
];

export const MONTH_NAMES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

export const DEFAULT_MEETING_TEMPLATE = [
  { num: 1, relWeek: 5,  label: '1ª Reunión anteproyecto' },
  { num: 2, relWeek: 7,  label: '2ª Reunión anteproyecto' },
  { num: 3, relWeek: 9,  label: '3ª Reunión anteproyecto' },
  { num: 4, relWeek: 10, label: '4ª Reunión anteproyecto' },
  { num: 5, relWeek: 15, label: 'Entrega infografía 3D' },
  { num: 6, relWeek: 18, label: 'Entrega premedición' },
  { num: 7, relWeek: 22, label: '7ª Reunión proyecto' },
];

export interface MonthGroup {
  month: number;
  year: number;
  startIdx: number;
  count: number;
}

export function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addWeeks(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n * 7);
  return date;
}

export function weeksBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (7 * 24 * 3600 * 1000));
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function dateToInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getWindowWeeks(extraWeeks = 0): Date[] {
  const today = new Date();
  const anchor = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const ws = getMondayOfWeek(anchor);
  const we = addWeeks(ws, 53 + extraWeeks);
  const weeks: Date[] = [];
  let d = new Date(ws);
  while (d <= we) { weeks.push(new Date(d)); d = addWeeks(d, 1); }
  return weeks;
}

export function clipBar(startPx: number, totalPx: number, maxPx: number) {
  const cl = Math.max(startPx, 0);
  const cr = Math.min(startPx + totalPx, maxPx);
  if (cr <= 0 || cl >= maxPx) return null;
  return { left: cl, width: cr - cl, innerOffset: cl - startPx };
}

export function computeCellW(nWeeks: number): number {
  if (typeof window === 'undefined') return 24;
  const avail = window.innerWidth - 200 - 44;
  return Math.max(16, Math.min(30, Math.floor(avail / Math.min(nWeeks, 53))));
}

export function buildMonthGroups(weeks: Date[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let curM = -1;
  weeks.forEach((w, i) => {
    const m = w.getMonth();
    if (m !== curM) { groups.push({ month: m, year: w.getFullYear(), startIdx: i, count: 0 }); curM = m; }
    groups[groups.length - 1].count++;
  });
  return groups;
}
