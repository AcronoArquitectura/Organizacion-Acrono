import { readAllData } from '@/lib/data/storage';
import PresupuestosView from '@/components/modules/presupuestos/PresupuestosView';

export default async function PresupuestosPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteNif?: string }>;
}) {
  const { clienteNif } = await searchParams;
  const data = await readAllData();
  return (
    <PresupuestosView
      initialPresupuestos={data.presupuestos}
      clientes={data.clientes}
      initialClienteNif={clienteNif}
    />
  );
}
