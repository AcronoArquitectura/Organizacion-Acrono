import { readAllData } from '@/lib/data/storage';
import OrganizacionView from '@/components/modules/organizacion/OrganizacionView';

export default async function OrganizacionPage() {
  const data = await readAllData();
  return <OrganizacionView initialOrg={data.org} clientes={data.clientes} />;
}
