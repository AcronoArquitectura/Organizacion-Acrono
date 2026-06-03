import { getOrg } from '@/lib/data/organizacion';
import OrganizacionView from '@/components/modules/organizacion/OrganizacionView';

export default async function OrganizacionPage() {
  const org = await getOrg();
  return <OrganizacionView initialOrg={org} />;
}
