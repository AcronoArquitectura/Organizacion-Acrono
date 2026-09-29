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
import ListaArchivados from './ListaArchivados';
import {
  upsertProyecto, deleteProyecto, reorderProyectos,
  upsertObra, deleteObra, reorderObras,
  updateAuthors,
} from '@/lib/actions/organizacion';
import {
  exportGeneralProyectosPDF,
  exportGeneralObrasPDF,
} from './orgPDF';

type Tab = 'org' | 'proyectos' | 'obras' | 'archivados';

/**
 * Los Gantt solo ven y reordenan los elementos activos, pero reorderProyectos/reorderObras
 * sustituyen la lista entera por los ids recibidos. Para no borrar los archivados del JSON,
 * se reconstruye la lista completa: cada archivado conserva su posición y los huecos de los
 * activos se rellenan con el nuevo orden.
 */
function mergeActiveOrder(all: { id: string; archivadoEn?: string | null }[], activeIds: string[]): string[] {
  const queue = [...activeIds];
  const ids = all.map(x => x.archivadoEn ? x.id : queue.shift()).filter((id): id is string => !!id);
  ids.push(...queue);
  return ids;
}

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

  // Un único array de proyectos y otro de obras; las vistas de trabajo (Gantts y PDF) solo ven los no archivados
  const activeProjects = projects.filter(p => !p.archivadoEn);
  const archivedProjects = projects.filter(p => p.archivadoEn);
  const activeObras = obras.filter(o => !o.archivadoEn);
  const archivedObras = obras.filter(o => o.archivadoEn);

  useEffect(() => {
    if (initialProyectoId) {
      const p = initialOrg.projects.find(x => x.id === initialProyectoId);
      if (p) { setTab(p.archivadoEn ? 'archivados' : 'proyectos'); setEditProyectoId(p.id); }
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

  const handleArchivarProyecto = useCallback((id: string) => {
    const p = projects.find(x => x.id === id);
    if (!p) return;
    startTransition(async () => { applyOrg(await upsertProyecto({ ...p, archivadoEn: new Date().toISOString() })); setEditProyectoId(null); });
  }, [applyOrg, projects]);

  const handleReactivarProyecto = useCallback((id: string) => {
    const p = projects.find(x => x.id === id);
    if (!p) return;
    startTransition(async () => { applyOrg(await upsertProyecto({ ...p, archivadoEn: null })); setEditProyectoId(null); });
  }, [applyOrg, projects]);

  const handleReorderProyectos = useCallback((activeIds: string[]) => {
    const ids = mergeActiveOrder(projects, activeIds);
    setProjects(prev => { const m = new Map(prev.map(p => [p.id, p])); return ids.map(id => m.get(id)!).filter(Boolean); });
    startTransition(async () => { applyOrg(await reorderProyectos(ids)); });
  }, [applyOrg, projects]);

  const handleSaveObra = useCallback((o: Obra) => {
    startTransition(async () => { applyOrg(await upsertObra(o)); setEditObraId(null); });
  }, [applyOrg]);

  const handleDeleteObra = useCallback((id: string) => {
    startTransition(async () => { applyOrg(await deleteObra(id)); setEditObraId(null); });
  }, [applyOrg]);

  const handleArchivarObra = useCallback((id: string) => {
    const o = obras.find(x => x.id === id);
    if (!o) return;
    startTransition(async () => { applyOrg(await upsertObra({ ...o, archivadoEn: new Date().toISOString() })); setEditObraId(null); });
  }, [applyOrg, obras]);

  const handleReactivarObra = useCallback((id: string) => {
    const o = obras.find(x => x.id === id);
    if (!o) return;
    startTransition(async () => { applyOrg(await upsertObra({ ...o, archivadoEn: null })); setEditObraId(null); });
  }, [applyOrg, obras]);

  const handleReorderObras = useCallback((activeIds: string[]) => {
    const ids = mergeActiveOrder(obras, activeIds);
    setObras(prev => { const m = new Map(prev.map(o => [o.id, o])); return ids.map(id => m.get(id)!).filter(Boolean); });
    startTransition(async () => { applyOrg(await reorderObras(ids)); });
  }, [applyOrg, obras]);

  const handleSaveAuthors = useCallback((a: Author[]) => {
    startTransition(async () => { applyOrg(await updateAuthors(a)); setShowAuthors(false); });
  }, [applyOrg]);

  const handleExportPDF = useCallback(async () => {
    if (tab === 'proyectos') await exportGeneralProyectosPDF(activeProjects, authors, weeks);
    else if (tab === 'obras') await exportGeneralObrasPDF(activeObras, authors, weeks);
  }, [tab, activeProjects, activeObras, authors, weeks]);

  const fmtOpt: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
  const windowLabel = `${weeks[0].toLocaleDateString('es-ES', fmtOpt)} → ${weeks[weeks.length - 1].toLocaleDateString('es-ES', fmtOpt)}`;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'org',       label: 'Organización' },
    { id: 'proyectos', label: 'Organización Proyectos' },
    { id: 'obras',     label: 'Organización Obras' },
    { id: 'archivados', label: `Archivados${archivedProjects.length + archivedObras.length ? ` (${archivedProjects.length + archivedObras.length})` : ''}` },
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

      {/* Controls bar (solo vistas Gantt) */}
      {tab !== 'archivados' && <div style={{
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
      </div>}

      {/* Gantt scroll area */}
      <div style={{ flex: 1, overflow: 'auto', background: '#f5f4f0', minHeight: 0 }}>
        {tab === 'proyectos' && (
          <GanttProyectos
            projects={activeProjects} authors={authors}
            weeks={weeks} cellW={cellW} todayIdx={todayIdx}
            filterAuthorId={filterAuthorId}
            onEdit={id => setEditProyectoId(id)}
            onReorder={handleReorderProyectos}
            setTooltip={setTooltip}
          />
        )}
        {tab === 'obras' && (
          <GanttObras
            obras={activeObras} authors={authors}
            weeks={weeks} cellW={cellW} todayIdx={todayIdx}
            filterAuthorId={filterAuthorId}
            onEdit={id => setEditObraId(id)}
            onReorder={handleReorderObras}
            setTooltip={setTooltip}
          />
        )}
        {tab === 'org' && (
          <GanttOrg
            projects={activeProjects} obras={activeObras} authors={authors}
            weeks={weeks} cellW={cellW} todayIdx={todayIdx}
            filterAuthorId={filterAuthorId}
            onEditProject={id => setEditProyectoId(id)}
            onEditObra={id => setEditObraId(id)}
            setTooltip={setTooltip}
          />
        )}
        {tab === 'archivados' && (
          <>
            <ListaArchivados
              titulo="Proyectos" items={archivedProjects} vacio="No hay proyectos archivados."
              authors={authors}
              onEdit={id => setEditProyectoId(id)}
              onReactivar={handleReactivarProyecto}
              isPending={isPending}
            />
            <ListaArchivados
              titulo="Obras" items={archivedObras} vacio="No hay obras archivadas."
              authors={authors}
              onEdit={id => setEditObraId(id)}
              onReactivar={handleReactivarObra}
              isPending={isPending}
            />
          </>
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
          onArchivar={handleArchivarProyecto}
          onReactivar={handleReactivarProyecto}
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
          onArchivar={handleArchivarObra}
          onReactivar={handleReactivarObra}
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
