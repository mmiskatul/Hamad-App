import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/*
 * Projects: named workspaces that group chats, files and instructions.
 *
 * The backend is now the source of truth for project records. This store keeps
 * the cached list plus the local flow state (`editingId`, filter chips, loading
 * and error flags) that the project screens need to coordinate with each other.
 */
export const PROJECT_STORAGE_KEY = 'oneai.projects';
export const PROJECT_STORAGE_VERSION = 1;

export type ProjectScope = 'default' | 'project-only';

export type ProjectSource = {
  id: string;
  name: string;
  at: number;
  uri: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  scope: ProjectScope;
  pinned: boolean;
  shared: boolean;
  sources: ProjectSource[];
  updatedAt: number;
};

export const PROJECT_FILTERS = ['all', 'mine', 'shared'] as const;
export type ProjectFilter = (typeof PROJECT_FILTERS)[number];

export type ProjectState = {
  projects: Project[];
  editingId: string | null;
  filter: ProjectFilter;
  hasHydrated: boolean;
  isRefreshing: boolean;
  error: string | null;

  createProject: (input: { name: string; scope: ProjectScope }) => string;
  renameProject: (id: string, name: string) => void;
  setInstructions: (id: string, instructions: string) => void;
  togglePinned: (id: string) => void;
  deleteProject: (id: string) => void;
  addSource: (id: string, source: { name: string; uri?: string }) => void;
  removeSource: (id: string, sourceId: string) => void;
  replaceProjects: (projects: Project[]) => void;
  upsertProject: (project: Project) => void;
  removeProjectRecord: (id: string) => void;
  setRefreshing: (isRefreshing: boolean) => void;
  setError: (error: string | null) => void;
  setFilter: (filter: ProjectFilter) => void;
  setEditingId: (id: string | null) => void;
};

function newId(prefix = 'p'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function migrateProjectState(persisted: unknown, version: number): unknown {
  const state = persisted as { projects?: Partial<Project>[] } | undefined;
  if (!state?.projects || version >= PROJECT_STORAGE_VERSION) return state;

  return {
    ...state,
    projects: state.projects.map((project) => ({ ...project, sources: project.sources ?? [] })),
  };
}

function mergeProject(projects: readonly Project[], project: Project): Project[] {
  return [project, ...projects.filter((existing) => existing.id !== project.id)];
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      editingId: null,
      filter: 'all',
      hasHydrated: false,
      isRefreshing: false,
      error: null,

      createProject: ({ name, scope }) => {
        const project: Project = {
          id: newId(),
          name: name.trim(),
          description: '',
          instructions: '',
          scope,
          pinned: false,
          shared: false,
          sources: [],
          updatedAt: Date.now(),
        };
        set({ projects: [project, ...get().projects], error: null });
        return project.id;
      },

      renameProject: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set({
          projects: get().projects.map((project) =>
            project.id === id ? { ...project, name: trimmed, updatedAt: Date.now() } : project,
          ),
          error: null,
        });
      },

      setInstructions: (id, instructions) =>
        set({
          projects: get().projects.map((project) =>
            project.id === id ? { ...project, instructions, updatedAt: Date.now() } : project,
          ),
          error: null,
        }),

      togglePinned: (id) =>
        set({
          projects: get().projects.map((project) =>
            project.id === id ? { ...project, pinned: !project.pinned } : project,
          ),
          error: null,
        }),

      deleteProject: (id) =>
        set({
          projects: get().projects.filter((project) => project.id !== id),
          editingId: get().editingId === id ? null : get().editingId,
          error: null,
        }),

      addSource: (id, { name, uri = '' }) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        const source: ProjectSource = { id: newId('s'), name: trimmed, at: Date.now(), uri };
        set({
          projects: get().projects.map((project) =>
            project.id === id
              ? { ...project, sources: [source, ...project.sources], updatedAt: Date.now() }
              : project,
          ),
          error: null,
        });
      },

      removeSource: (id, sourceId) =>
        set({
          projects: get().projects.map((project) =>
            project.id === id
              ? {
                  ...project,
                  sources: project.sources.filter((source) => source.id !== sourceId),
                  updatedAt: Date.now(),
                }
              : project,
          ),
          error: null,
        }),

      replaceProjects: (projects) => set({ projects: [...projects], error: null }),
      upsertProject: (project) => set({ projects: mergeProject(get().projects, project), error: null }),
      removeProjectRecord: (id) =>
        set({
          projects: get().projects.filter((project) => project.id !== id),
          editingId: get().editingId === id ? null : get().editingId,
          error: null,
        }),
      setRefreshing: (isRefreshing) => set({ isRefreshing }),
      setError: (error) => set({ error }),
      setFilter: (filter) => set({ filter }),
      setEditingId: (editingId) => set({ editingId }),
    }),
    {
      name: PROJECT_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ projects }) => ({ projects }),
      version: PROJECT_STORAGE_VERSION,
      migrate: migrateProjectState,
      onRehydrateStorage: () => (state, error) => {
        if (error && __DEV__) {
          console.warn('[projectStore] rehydrate failed:', error);
        }
        useProjectStore.setState({ hasHydrated: true });
      },
    },
  ),
);

export function visibleProjects(
  projects: readonly Project[],
  filter: ProjectFilter,
  query = '',
): Project[] {
  const needle = query.trim().toLowerCase();

  return projects
    .filter((project) => {
      if (filter === 'mine' && project.shared) return false;
      if (filter === 'shared' && !project.shared) return false;
      if (!needle) return true;
      return (
        project.name.toLowerCase().includes(needle) ||
        project.description.toLowerCase().includes(needle)
      );
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
}

export default useProjectStore;