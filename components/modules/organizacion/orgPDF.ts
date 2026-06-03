import type { jsPDF as jsPDFType } from 'jspdf';
import type { Proyecto, Obra, Author } from '@/lib/types';
import {
  PHASE_DEFS, OBRA_PHASE_DEFS, MONTH_NAMES,
  getMondayOfWeek, addWeeks, weeksBetween, fmtDate,
} from '@/lib/utils/gantt';

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function drawPageHeader(
  doc: jsPDFType,
  pageW: number, pageH: number,
  weeks: Date[],
  mL: number, mT: number, labelW: number, cellW: number,
): void {
  const mGroups: { month: number; year: number; x: number; count: number }[] = [];
  let curM = -1;
  weeks.forEach((w, i) => {
    const m = w.getMonth();
    if (m !== curM) { mGroups.push({ month: m, year: w.getFullYear(), x: mL + labelW + i * cellW, count: 0 }); curM = m; }
    mGroups[mGroups.length - 1].count++;
  });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  mGroups.forEach(mg => {
    const mw = mg.count * cellW;
    doc.setFillColor(230, 228, 220);
    doc.rect(mg.x, mT, mw, 5, 'F');
    doc.setDrawColor(200);
    doc.rect(mg.x, mT, mw, 5, 'D');
    doc.setTextColor(60, 60, 60);
    const lbl = `${MONTH_NAMES[mg.month]} '${String(mg.year).slice(2)}`;
    if (mw > 8) doc.text(lbl, mg.x + mw / 2, mT + 3.5, { align: 'center' });
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  weeks.forEach((w, i) => {
    const x = mL + labelW + i * cellW;
    doc.setDrawColor(210);
    doc.line(x, mT + 5, x, pageH - 10);
    doc.setTextColor(150, 150, 150);
    doc.text(String(w.getDate()), x + cellW / 2, mT + 8.5, { align: 'center' });
  });

  const today = getMondayOfWeek(new Date());
  const ti = weeks.findIndex(w => w.getTime() === today.getTime());
  if (ti >= 0) {
    const tx = mL + labelW + ti * cellW;
    doc.setDrawColor(220, 50, 50);
    doc.setLineWidth(0.5);
    doc.line(tx, mT, tx, pageH - 10);
    doc.setLineWidth(0.2);
  }
}

function addPageWithHeader(
  doc: jsPDFType,
  pageW: number, pageH: number,
  weeks: Date[],
  mL: number, mT: number, labelW: number, cellW: number,
  title: string,
): number {
  doc.addPage();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(51, 51, 51);
  doc.text(title, mL, 10);
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120);
  doc.text(`Generado: ${fmtDate(new Date())}`, pageW - 60, 10);
  drawPageHeader(doc, pageW, pageH, weeks, mL, mT, labelW, cellW);
  return mT + 12;
}

interface DrawableRow {
  code?: string;
  name?: string;
  startDate: string;
  authorId?: string | null;
  phases: Array<{ key: string; weeks: number; label?: string; abbr?: string; color?: string; authorIds?: string[] }>;
}

function drawGanttRow(
  doc: jsPDFType,
  item: DrawableRow,
  authors: Author[],
  weeks: Date[],
  mL: number, y: number, labelW: number, availW: number, cellW: number, rowH: number,
  useObraDefs: boolean,
): void {
  const pa = authors.find(a => a.id === item.authorId);
  const [ar, ag, ab] = pa ? hexToRgb(pa.color) : [80, 80, 80];

  doc.setFillColor(248, 247, 244);
  doc.rect(mL, y, labelW, rowH, 'F');
  doc.setDrawColor(200);
  doc.rect(mL, y, labelW, rowH, 'D');
  doc.setFillColor(ar, ag, ab);
  doc.rect(mL, y, 1.5, rowH, 'F');

  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(40, 40, 40);
  doc.text(item.code ?? '', mL + 3, y + 3.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(80, 80, 80);
  doc.text((item.name ?? '').slice(0, 24), mL + 3, y + 7);

  let cur = new Date(item.startDate);
  item.phases.forEach(ph => {
    if (!ph.weeks) return;
    const defs = useObraDefs ? OBRA_PHASE_DEFS : PHASE_DEFS;
    const def = defs.find(d => d.key === ph.key);
    const abbr = ph.abbr ?? def?.abbr ?? ph.key.slice(0, 2).toUpperCase();

    const si = weeksBetween(weeks[0], cur);
    const bx = mL + labelW + si * cellW;
    const bw = ph.weeks * cellW - 0.5;
    const maxX = mL + labelW + availW;
    const cbx = Math.max(bx, mL + labelW);
    const cr = Math.min(bx + bw, maxX);
    if (cr <= mL + labelW) { cur = addWeeks(cur, ph.weeks); return; }
    const cbw = cr - cbx;

    const ids = (ph.authorIds?.length) ? ph.authorIds : (item.authorId ? [item.authorId] : []);
    const authorColors = ids.map(id => authors.find(a => a.id === id)?.color ?? '#888');
    const nSegs = authorColors.length || 1;
    const segH = (rowH - 3) / nSegs;

    authorColors.forEach((ac, ai) => {
      const [r, g, b] = hexToRgb(ac);
      doc.setFillColor(r, g, b);
      doc.rect(cbx, y + 1.5 + ai * segH, cbw, segH, 'F');
    });
    if (cbw > 6) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(255, 255, 255);
      doc.text(abbr, cbx + cbw / 2, y + rowH / 2 + 1, { align: 'center' });
    }
    cur = addWeeks(cur, ph.weeks);
  });
}

function drawAuthorLegend(doc: jsPDFType, authors: Author[], pageW: number, pageH: number, mL: number): void {
  let lx = mL;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
  authors.forEach(a => {
    const [r, g, b] = hexToRgb(a.color);
    doc.setFillColor(r, g, b);
    doc.circle(lx + 2, pageH - 5.5, 2, 'F');
    doc.setTextColor(60, 60, 60);
    doc.text(a.name, lx + 5, pageH - 5);
    lx += 5 + doc.getTextWidth(a.name) + 6;
  });
}

// ── Public PDF exports ────────────────────────────────────────────────────────

export async function exportGeneralProyectosPDF(
  projects: Proyecto[],
  authors: Author[],
  weeks: Date[],
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mL = 8, mT = 16, labelW = 45, mR = 10;
  const availW = pageW - mL - labelW - mR;
  const cellW = availW / Math.min(weeks.length, 53);
  const rowH = 9;
  const title = 'ÁCRONO ARQUITECTURA · ORGANIZACIÓN PROYECTOS';

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(51, 51, 51);
  doc.text(title, mL, 10);
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120);
  doc.text(`Generado: ${fmtDate(new Date())}`, pageW - 60, 10);
  drawPageHeader(doc, pageW, pageH, weeks, mL, mT, labelW, cellW);

  let y = mT + 12;
  projects.forEach(proj => {
    if (y > pageH - 16) { y = addPageWithHeader(doc, pageW, pageH, weeks, mL, mT, labelW, cellW, title); }
    drawGanttRow(doc, proj, authors, weeks, mL, y, labelW, availW, cellW, rowH, false);
    y += rowH + 1;
  });

  drawAuthorLegend(doc, authors, pageW, pageH, mL);
  doc.save(`Cronograma_Proyectos_${new Date().getFullYear()}.pdf`);
}

export async function exportGeneralObrasPDF(
  obras: Obra[],
  authors: Author[],
  weeks: Date[],
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mL = 8, mT = 16, labelW = 45, mR = 10;
  const availW = pageW - mL - labelW - mR;
  const cellW = availW / Math.min(weeks.length, 53);
  const rowH = 9;
  const title = 'ÁCRONO ARQUITECTURA · ORGANIZACIÓN OBRAS';

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(51, 51, 51);
  doc.text(title, mL, 10);
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120);
  doc.text(`Generado: ${fmtDate(new Date())}`, pageW - 60, 10);
  drawPageHeader(doc, pageW, pageH, weeks, mL, mT, labelW, cellW);

  let y = mT + 12;
  obras.forEach(obra => {
    if (y > pageH - 16) { y = addPageWithHeader(doc, pageW, pageH, weeks, mL, mT, labelW, cellW, title); }
    drawGanttRow(doc, obra, authors, weeks, mL, y, labelW, availW, cellW, rowH, true);
    y += rowH + 1;
  });

  drawAuthorLegend(doc, authors, pageW, pageH, mL);
  doc.save(`Cronograma_Obras_${new Date().getFullYear()}.pdf`);
}

export async function exportSingleProyectoPDF(
  proyecto: Proyecto,
  authors: Author[],
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const totalWeeks = proyecto.phases.reduce((s, ph) => s + ph.weeks, 0);
  const projStart = new Date(proyecto.startDate);
  const projEnd = addWeeks(projStart, totalWeeks);

  const weeks: Date[] = [];
  let d = new Date(projStart);
  while (d <= projEnd) { weeks.push(new Date(d)); d = addWeeks(d, 1); }

  const mL = 10, mT = 20;
  const availW = pageW - mL * 2;
  const cellW = weeks.length > 0 ? availW / weeks.length : 1;

  const pa = authors.find(a => a.id === proyecto.authorId);

  // Dark header bar
  doc.setFillColor(51, 51, 51);
  doc.rect(0, 0, pageW, 13, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text(`${proyecto.code ?? ''}  ·  ${proyecto.name ?? ''}`, mL, 9);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 200, 200);
  doc.text(pa ? pa.name : '', pageW - mL - 40, 9);

  // Subtitle
  doc.setFontSize(8); doc.setTextColor(150, 150, 150);
  doc.text(
    `Inicio: ${fmtDate(projStart)}   ·   Fin previsto: ${fmtDate(projEnd)}   ·   Total: ${totalWeeks} semanas`,
    mL, mT - 2,
  );

  // Month headers
  const mGroups: { month: number; year: number; x: number; count: number }[] = [];
  let curM = -1;
  weeks.forEach((w, i) => {
    const m = w.getMonth();
    if (m !== curM) { mGroups.push({ month: m, year: w.getFullYear(), x: mL + i * cellW, count: 0 }); curM = m; }
    mGroups[mGroups.length - 1].count++;
  });
  doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  mGroups.forEach(mg => {
    const mw = mg.count * cellW;
    doc.setFillColor(230, 228, 220);
    doc.rect(mg.x, mT, mw, 5, 'F');
    doc.setDrawColor(200);
    doc.rect(mg.x, mT, mw, 5, 'D');
    doc.setTextColor(60, 60, 60);
    doc.text(`${MONTH_NAMES[mg.month]} ${mg.year}`, mg.x + mw / 2, mT + 3.5, { align: 'center' });
  });

  // Week day numbers
  doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5);
  weeks.forEach((w, i) => {
    const x = mL + i * cellW;
    doc.setDrawColor(210);
    doc.line(x, mT + 5, x, pageH - 20);
    doc.setTextColor(140, 140, 140);
    doc.text(String(w.getDate()), x + cellW / 2, mT + 8.5, { align: 'center' });
  });

  // Build week → phase map and meeting map
  const weekPhaseMap: Record<number, { phaseLabel: string; color: string }> = {};
  let wCursor = 1;
  proyecto.phases.forEach(ph => {
    const phDef = PHASE_DEFS.find(d => d.key === ph.key);
    const phaseLabel = ph.label ?? phDef?.label ?? ph.key;
    const color = ph.color ?? phDef?.color ?? '#eee';
    for (let w = 0; w < ph.weeks; w++) {
      weekPhaseMap[wCursor + w] = { phaseLabel, color };
    }
    wCursor += ph.weeks;
  });
  if (weekPhaseMap[1]) weekPhaseMap[1].phaseLabel = 'Formalización de contrato';

  const meetingMap: Record<number, { num: number; label: string }> = {};
  (proyecto.meetings ?? []).forEach(m => { meetingMap[m.relWeek] = m; });

  // Weekly calendar grid (5 columns per row)
  const COLS = 5;
  const gridW = pageW - mL * 2;
  const cellCalW = gridW / COLS;
  const cellCalH = 17;
  const rows = Math.ceil(totalWeeks / COLS);

  for (let row = 0; row < rows; row++) {
    const rowY = mT + row * (cellCalH + 1.5);
    if (rowY + cellCalH > pageH - 12) {
      doc.addPage();
      doc.setFillColor(51, 51, 51);
      doc.rect(0, 0, pageW, 13, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
      doc.text(`${proyecto.code ?? ''}  ·  ${proyecto.name ?? ''} (cont.)`, mL, 9);
    }
    for (let col = 0; col < COLS; col++) {
      const weekNum = row * COLS + col + 1;
      if (weekNum > totalWeeks) break;
      const cellX = mL + col * cellCalW;
      const cy = rowY > pageH - 12 ? mT : rowY;

      const wp = weekPhaseMap[weekNum];
      const meeting = meetingMap[weekNum];

      if (wp) {
        const [r, g, b] = hexToRgb(wp.color);
        doc.setFillColor(
          Math.round(r + (255 - r) * 0.3),
          Math.round(g + (255 - g) * 0.3),
          Math.round(b + (255 - b) * 0.3),
        );
      } else {
        doc.setFillColor(245, 245, 242);
      }
      doc.rect(cellX, cy, cellCalW - 1, cellCalH, 'F');
      doc.setDrawColor(200, 198, 192);
      doc.rect(cellX, cy, cellCalW - 1, cellCalH, 'D');

      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(90, 90, 90);
      doc.text(`Semana ${weekNum}`, cellX + 2, cy + 4.5);
      const wkDate = addWeeks(projStart, weekNum - 1);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(140, 140, 140);
      doc.text(fmtDate(wkDate), cellX + cellCalW - 3, cy + 4.5, { align: 'right' });

      if (wp) {
        doc.setFont('helvetica', weekNum === 1 ? 'bold' : 'normal');
        doc.setFontSize(7); doc.setTextColor(50, 50, 50);
        doc.text(wp.phaseLabel, cellX + 2, cy + 10, { maxWidth: cellCalW - 4 });
      }
      if (meeting) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(40, 40, 40);
        doc.text(meeting.label || `${meeting.num}ª Reunión`, cellX + 2, cy + 14.5, { maxWidth: cellCalW - 4 });
      }
    }
  }

  // Legend
  const legY = pageH - 6;
  let lx = mL;
  doc.setFontSize(5.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80);
  doc.text('LEYENDA:', lx, legY);
  lx += 16;
  proyecto.phases.filter(ph => ph.weeks > 0).forEach(ph => {
    const def = PHASE_DEFS.find(d => d.key === ph.key);
    const lbl = ph.label ?? def?.label ?? ph.key;
    const col = ph.color ?? def?.color ?? '#ccc';
    const [r, g, b] = hexToRgb(col);
    doc.setFillColor(
      Math.round(r + (255 - r) * 0.35),
      Math.round(g + (255 - g) * 0.35),
      Math.round(b + (255 - b) * 0.35),
    );
    doc.rect(lx, legY - 3.5, 4, 3.5, 'F');
    doc.setTextColor(60, 60, 60); doc.setFont('helvetica', 'normal');
    doc.text(lbl, lx + 5, legY);
    lx += 5 + doc.getTextWidth(lbl) + 5;
    if (lx > pageW - 60) lx = mL;
  });
  doc.setTextColor(160, 160, 160);
  doc.text('Ácrono Arquitectura S.C.P.', pageW - mL, legY, { align: 'right' });

  doc.save(`${proyecto.code ?? 'proyecto'}_cronograma.pdf`);
}
