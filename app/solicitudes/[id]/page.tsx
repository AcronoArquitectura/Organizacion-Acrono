import { readSolicitudesUI } from '@/lib/data/solicitudes-storage';
import SolicitudEditorView from '@/components/modules/solicitudes/SolicitudEditorView';
import { notFound } from 'next/navigation';

export default async function SolicitudPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const solicitudes = await readSolicitudesUI();
  const sol = solicitudes.find(s => s.id === id);
  if (!sol) notFound();
  return <SolicitudEditorView solicitud={sol} />;
}
