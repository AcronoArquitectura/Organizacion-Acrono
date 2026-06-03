import { readAllData } from '@/lib/data/storage';
import ClientesView from '@/components/modules/clientes/ClientesView';

export default async function ClientesPage() {
  const data = await readAllData();
  return (
    <ClientesView
      initialClientes={data.clientes}
      orgProyectos={data.org.projects}
      initialFacturas={data.contabilidad.facturas}
    />
  );
}
