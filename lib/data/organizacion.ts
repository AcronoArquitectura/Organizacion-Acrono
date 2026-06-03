import { readAllData, writeAllData } from './storage';
import type { Proyecto, Obra, Author } from '@/lib/types';

export type OrgData = { projects: Proyecto[]; obras: Obra[]; authors: Author[] };

export async function getOrg(): Promise<OrgData> {
  return (await readAllData()).org;
}

export async function saveOrg(org: OrgData): Promise<void> {
  const data = await readAllData();
  await writeAllData({ ...data, org });
}
