import { apiRequest } from '@/shared/api/client';
import { readAuthSession } from '@/shared/auth';

import { useProjectStore, type Project, type ProjectScope, type ProjectSource } from './store/projectStore';

type ProjectResponse = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  scope: ProjectScope;
  pinned: boolean;
  shared: boolean;
  sources: Array<{
    id: string;
    name: string;
    at: string;
    uri: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

type ProjectsResponse = { projects: ProjectResponse[] };

type CreateProjectInput = {
  name: string;
  scope: ProjectScope;
  description?: string;
  instructions?: string;
};

type UpdateProjectInput = Partial<Pick<Project, 'name' | 'description' | 'instructions' | 'scope' | 'pinned'>>;
type AddProjectSourceInput = { name: string; uri?: string };

function toSource(source: ProjectResponse['sources'][number]): ProjectSource {
  return {
    id: source.id,
    name: source.name,
    at: Date.parse(source.at),
    uri: source.uri,
  };
}

function toProject(project: ProjectResponse): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    instructions: project.instructions,
    scope: project.scope,
    pinned: project.pinned,
    shared: project.shared,
    sources: project.sources.map(toSource),
    updatedAt: Date.parse(project.updatedAt),
  };
}

export function projectErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function listProjects(): Promise<Project[]> {
  const response = await apiRequest<ProjectsResponse>('/projects', { authenticated: true });
  return response.projects.map(toProject);
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  return toProject(await apiRequest<ProjectResponse>('/projects', {
    method: 'POST',
    authenticated: true,
    body: JSON.stringify(input),
  }));
}

export async function updateProject(projectId: string, patch: UpdateProjectInput): Promise<Project> {
  return toProject(await apiRequest<ProjectResponse>(`/projects/${projectId}`, {
    method: 'PATCH',
    authenticated: true,
    body: JSON.stringify(patch),
  }));
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiRequest<void>(`/projects/${projectId}`, {
    method: 'DELETE',
    authenticated: true,
  });
}

export async function addProjectSource(projectId: string, input: AddProjectSourceInput): Promise<Project> {
  return toProject(await apiRequest<ProjectResponse>(`/projects/${projectId}/sources`, {
    method: 'POST',
    authenticated: true,
    body: JSON.stringify(input),
  }));
}

export async function removeProjectSource(projectId: string, sourceId: string): Promise<Project> {
  return toProject(await apiRequest<ProjectResponse>(`/projects/${projectId}/sources/${sourceId}`, {
    method: 'DELETE',
    authenticated: true,
  }));
}

export async function refreshProjects(): Promise<Project[] | null> {
  const session = await readAuthSession();
  if (!session) return null;

  const projects = await listProjects();
  useProjectStore.getState().replaceProjects(projects);
  return projects;
}