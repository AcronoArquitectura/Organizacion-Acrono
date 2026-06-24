import { readSolicitudesUI } from '@/lib/data/solicitudes-storage';
import SolicitudesView from '@/components/modules/solicitudes/SolicitudesView';
import type { Solicitud } from '@/lib/types';

export default async function SolicitudesPage() {
  let solicitudes: Solicitud[] = [];
  try {
    solicitudes = await readSolicitudesUI();
  } catch {
    // Sin autenticación o sin solicitudes aún — muestra vista vacía
  }
  return <SolicitudesView initialSolicitudes={solicitudes} />;
}
