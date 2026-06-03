'use server';

import { readAllData, writeAllData } from '@/lib/data/storage';
import type { Proyecto, Obra, Author } from '@/lib/types';
import type { OrgData } from '@/lib/data/organizacion';

export async function upsertProyecto(proyecto: Proyecto): Promise<OrgData> {
  const data = await readAllData();
  const idx = data.org.projects.findIndex((p) => p.id === proyecto.id);
  if (idx >= 0) data.org.projects[idx] = proyecto;
  else data.org.projects.push(proyecto);
  await writeAllData(data);
  return data.org;
}

export async function deleteProyecto(id: string): Promise<OrgData> {
  const data = await readAllData();
  data.org.projects = data.org.projects.filter((p) => p.id !== id);
  await writeAllData(data);
  return data.org;
}

export async function reorderProyectos(ids: string[]): Promise<OrgData> {
  const data = await readAllData();
  const map = new Map(data.org.projects.map((p) => [p.id, p]));
  data.org.projects = ids.map((id) => map.get(id)!).filter(Boolean);
  await writeAllData(data);
  return data.org;
}

export async function upsertObra(obra: Obra): Promise<OrgData> {
  const data = await readAllData();
  const idx = data.org.obras.findIndex((o) => o.id === obra.id);
  if (idx >= 0) data.org.obras[idx] = obra;
  else data.org.obras.push(obra);
  await writeAllData(data);
  return data.org;
}

export async function deleteObra(id: string): Promise<OrgData> {
  const data = await readAllData();
  data.org.obras = data.org.obras.filter((o) => o.id !== id);
  await writeAllData(data);
  return data.org;
}

export async function reorderObras(ids: string[]): Promise<OrgData> {
  const data = await readAllData();
  const map = new Map(data.org.obras.map((o) => [o.id, o]));
  data.org.obras = ids.map((id) => map.get(id)!).filter(Boolean);
  await writeAllData(data);
  return data.org;
}

export async function updateAuthors(authors: Author[]): Promise<OrgData> {
  const data = await readAllData();
  data.org.authors = authors;
  await writeAllData(data);
  return data.org;
}
