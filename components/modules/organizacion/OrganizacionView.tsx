'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import type { Proyecto, Obra, Author, Cliente } from '@/lib/types';
import type { OrgData } from '@/lib/data/organizacion';
import { getWindowWeeks, computeCellW, getMondayOfWeek } from '@/lib/utils/gantt';
import GanttProyectos, { type TooltipState } from './GanttProyectos';
import GanttObras from './GanttObras';
import GanttOrg from './GanttOrg';
import ProyectoModal from './ProyectoModal';
import ObraModal from './ObraModal';
import AuthorModal from './AuthorModal';
import {
  upsertProyecto, deleteProyecto, reorderProyectos,
  upsertObra, deleteObra, reorderObras,
  updateAuthors,
} from '@/lib/actions/organizacion';
import {
  exportGeneralProyectosPDF,
  exportGeneralObrasPDF,
} from './orgPDF';

type Tab = 'org' | 'proyectos' | 'obras';

interface Props {
  initialOrg: OrgData;
  clientes: Cliente[];
  initialProyectoId?: string;
}

const btnStyle: React.CSSProperties = {
  height: 28, padding: '0 12px', border: '1px solid #c8c4bc', borderRadius: 4,
  fontSize: 11, cursor: 'pointer', background: '#fff', color: '#333', fontFamily: 'inherit',
};
const btnDark: React.CSSProperties = {
  ...btnStyle, background: '#333', color: '#fff', border: '1px solid #333', fontWeight: 600,
};

export default function OrganizacionView({ initialOrg, clientes, initialProyectoId }: Props) {
  const [tab, setTab] = useState<Tab>('proyectos');
  const [projects, setProjects] = useState<Proyecto[]>(initialOrg.projects);
  const [obras, setObras] = useState<Obra[]>(initialOrg.obras);
  const [authors, setAuthors] = useState<Author[]>(initialOrg.authors);
  const [filterAuthorId, setFilterAuthorId] = useState('');
  const [extraWeeks, setExtraWeeks] = useState(0);
  const [cellW, setCellW] = useState(24);
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  // Modal state: null = closed, 'new' = new, id = edit
  const [editProyectoId, setEditProyectoId] = useState<string | null>(null);
  const [editObraId, setEditObraId] = useState<string | null>(null);
  const [showAuthors, setShowAuthors] = useState(false);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (initialProyectoId) {
      const p = initialOrg.projects.find(x => x.id === initialProyectoId);
      if (p) { setTab('proyectos'); setEditProyectoId(p.id); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weeks = getWindowWeeks(extraWeeks);
  const today = getMondayOfWeek(new Date());
  const todayIdx = weeks.findIndex(w => w.getTime() === today.getTime());

  useEffect(() => {
    const calc = () => setCellW(computeCellW(weeks.length));
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [weeks.length]);

  const applyOrg = useCallback((org: OrgData) => {
    setProjects(org.projects);
    setObras(org.obras);
    setAuthors(org.authors);
  }, []);

  const handleSaveProyecto = useCallback((p: Proyecto) => {
    startTransition(async () => { applyOrg(await upsertProyecto(p)); setEditProyectoId(null); });
  }, [applyOrg]);

  const handleDeleteProyecto = useCallback((id: string) => {
    startTransition(async () => { applyOrg(await deleteProyecto(id)); setEditProyectoId(null); });
  }, [applyOrg]);

  const handleReorderProyectos = useCallback((ids: string[]) => {
    setProjects(prev => { const m = new Map(prev.map(p => [p.id, p])); return ids.map(id => m.get(id)!).filter(Boolean); });
    startTransition(async () => { applyOrg(await reorderProyectos(ids)); });
  }, [applyOrg]);

  const handleSaveObra = useCallback((o: Obra) => {
    startTransition(async () => { applyOrg(await upsertObra(o)); setEditObraId(null); });
  }, [applyOrg]);

  const handleDeleteObra = useCallback((id: string) => {
    startTransition(async () => { applyOrg(await deleteObra(id)); setEditObraId(null); });
  }, [applyOrg]);

  const handleReorderObras = useCallback((ids: string[]) => {
    setObras(prev => { const m = new Map(prev.map(o => [o.id, o])); return ids.map(id => m.get(id)!).filter(Boolean); });
    startTransition(async () => { applyOrg(await reorderObras(ids)); });
  }, [applyOrg]);

  const handleSaveAuthors = useCallback((a: Author[]) => {
    startTransition(async () => { applyOrg(await updateAuthors(a)); setShowAuthors(false); });
  }, [applyOrg]);

  const handleExportPDF = useCallback(async () => {
    if (tab === 'proyectos') await exportGeneralProyectosPDF(projects, authors, weeks);
    else if (tab === 'obras') await exportGeneralObrasPDF(obras, authors, weeks);
  }, [tab, projects, obras, authors, weeks]);

  const fmtOpt: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
  const windowLabel = `${weeks[0].toLocaleDateString('es-ES', fmtOpt)} → ${weeks[weeks.length - 1].toLocaleDateString('es-ES', fmtOpt)}`;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'org',       label: 'Organización' },
    { id: 'proyectos', label: 'Organización Proyectos' },
    { id: 'obras',     label: 'Organización Obras' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 50px)' }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #e0ddd5', padding: '0 20px' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setExtraWeeks(0); setFilterAuthorId(''); }}
            style={{
              height: 38, padding: '0 16px', fontSize: 11, fontWeight: tab === t.id ? 600 : 400,
              cursor: 'pointer', background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t.id ? '#333' : 'transparent'}`,
              color: tab === t.id ? '#333' : '#a09e99', transition: 'all .15s', fontFamily: 'inherit',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Controls bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '6px 20px',
        background: '#fff', borderBottom: '1px solid #e0ddd5', fontSize: 11, flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 500, color: '#6b6a66', fontSize: 10 }}>{windowLabel}</span>
        <span style={{ color: '#a09e99', marginLeft: 8, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>Filtrar autor:</span>
        <select value={filterAuthorId} onChange={e => setFilterAuthorId(e.target.value)}
          style={{ height: 24, border: '1px solid #c8c4bc', borderRadius: 4, padding: '0 6px', fontSize: 11, color: '#333', background: '#fff', fontFamily: 'inherit' }}>
          <option value="">Todos</option>
          {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {filterAuthorId && (
          <button onClick={() => setFilterAuthorId('')}
            style={{ height: 24, padding: '0 8px', border: '1px solid #c8c4bc', borderRadius: 4, fontSize: 10, cursor: 'pointer', background: '#fff', fontFamily: 'inherit' }}>
            ✕
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowAuthors(true)} style={btnStyle}>Autores</button>
        <button onClick={() => setExtraWeeks(ew => ew + 26)} style={btnStyle}>+ 6 meses →</button>
        {extraWeeks > 0 && <button onClick={() => setExtraWeeks(0)} style={btnStyle}>↺ Vista</button>}
        {(tab === 'proyectos' || tab === 'obras') && (
          <button onClick={handleExportPDF} style={btnStyle} disabled={isPending}>↓ PDF</button>
        )}
        {tab === 'proyectos' && (
          <button onClick={() => setEditProyectoId('new')} style={btnDark}>+ Proyecto</button>
        )}
        {tab === 'obras' && (
          <button onClick={() => setEditObraId('new')} style={btnDark}>+ Obra</button>
        )}
      </div>

      {/* Gantt scroll area */}
      <div style={{ flex: 1, overflow: 'auto', background: '#f5f4f0', minHeight: 0 }}>
        {tab === 'proyectos' && (
          <GanttProyectos
            projects={projects} authors={authors}
            weeks={weeks} cellW={cellW} todayIdx={todayIdx}
            filterAuthorId={filterAuthorId}
            onEdit={id => setEditProyectoId(id)}
            onReorder={handleReorderProyectos}
            setTooltip={setTooltip}
          />
        )}
        {tab === 'obras' && (
          <GanttObras
            obras={obras} authors={authors}
            weeks={weeks} cellW={cellW} todayIdx={todayIdx}
            filterAuthorId={filterAuthorId}
            onEdit={id => setEditObraId(id)}
            onReorder={handleReorderObras}
            setTooltip={setTooltip}
          />
        )}
        {tab === 'org' && (
          <GanttOrg
            projects={projects} obras={obras} authors={authors}
            weeks={weeks} cellW={cellW} todayIdx={todayIdx}
            filterAuthorId={filterAuthorId}
            onEditProject={id => setEditProyectoId(id)}
            onEditObra={id => setEditObraId(id)}
            setTooltip={setTooltip}
          />
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 14, top: tooltip.y - 10, zIndex: 999,
          background: '#333', color: '#fff', padding: '6px 10px', borderRadius: 5,
          fontSize: 10, lineHeight: 1.5, whiteSpace: 'pre', pointerEvents: 'none',
          maxWidth: 260, fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(0,0,0,.3)',
        }}>
          {tooltip.text}
        </div>
      )}

      {/* Modals */}
      {editProyectoId !== null && (
        <ProyectoModal
          proyecto={editProyectoId === 'new' ? null : (projects.find(p => p.id === editProyectoId) ?? null)}
          authors={authors}
          clientes={clientes}
          onSave={handleSaveProyecto}
          onDelete={handleDeleteProyecto}
          onClose={() => setEditProyectoId(null)}
          isPending={isPending}
        />
      )}
      {editObraId !== null && (
        <ObraModal
          obra={editObraId === 'new' ? null : (obras.find(o => o.id === editObraId) ?? null)}
          authors={authors}
          onSave={handleSaveObra}
          onDelete={handleDeleteObra}
          onClose={() => setEditObraId(null)}
          isPending={isPending}
        />
      )}
      {showAuthors && (
        <AuthorModal
          authors={authors}
          onSave={handleSaveAuthors}
          onClose={() => setShowAuthors(false)}
          isPending={isPending}
        />
      )}
    </div>
  );
}
