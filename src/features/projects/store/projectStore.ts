import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/*
 * Projects: named workspaces that group chats, files and instructions (Figma
 * Project 142:1070 / 151:1742, New project 144:1229, Rename 152:1914,
 * Instructions 152:1951).
 *
 * `editingId` is the FLOW STATE for the rename and instructions screens, and it
 * lives here rather than in route params on purpose (mobile/CLAUDE.md): params
 * duplicate the source of truth and let a deep link open /project-rename with
 * nothing to rename. Those screens gate on it and redirect when it is null.
 *
 * TODO(backend): projects belong to the server once the module exists; this
 * store then caches them through TanStack Query. `shared` is display-only until
 * there is a sharing endpoint — nothing in the app can set it yet.
 */
export const PROJECT_STORAGE_KEY = 'oneai.projects';
/* Bump with every shape change to Project, and add a migrate branch. */
export const PROJECT_STORAGE_VERSION = 1;

/** Whether a project's memory is walled off from the rest of the app. */
export type ProjectScope = 'default' | 'project-only';

/** A document, link or file added as project context (Figma 170:2091). */
export type ProjectSource = {
  id: string;
  /** File name as shown in the list, e.g. "name.md". */
  name: string;
  /** Epoch ms it was added — the row's "9:48 PM • DEC 7, 2026" meta. */
  at: number;
  /** Local or remote location. Empty until the picker and upload land. */
  uri: string;
};

export type Project = {
  id: string;
  name: string;
  /** One-line summary under the name in the list. */
  description: string;
  /** Persona / tone instructions for the model (Figma 152:1951). */
  instructions: string;
  scope: ProjectScope;
  pinned: boolean;
  /** Shared with the user by someone else, rather than created by them. */
  shared: boolean;
  /** Context documents (Figma 168:2002 empty / 170:2091 list). */
  sources: ProjectSource[];
  updatedAt: number;
};

/** List filter chips (Figma 142:1198). */
export const PROJECT_FILTERS = ['all', 'mine', 'shared'] as const;
export type ProjectFilter = (typeof PROJECT_FILTERS)[number];

export type ProjectState = {
  projects: Project[];
  /** The project the rename / instructions screens are acting on. */
  editingId: string | null;
  filter: ProjectFilter;
  hasHydrated: boolean;

  createProject: (input: { name: string; scope: ProjectScope }) => string;
  renameProject: (id: string, name: string) => void;
  setInstructions: (id: string, instructions: string) => void;
  togglePinned: (id: string) => void;
  deleteProject: (id: string) => void;
  addSource: (id: string, source: { name: string; uri?: string }) => void;
  removeSource: (id: string, sourceId: string) => void;
  setFilter: (filter: ProjectFilter) => void;
  setEditingId: (id: string | null) => void;
};

function newId(prefix = 'p'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/*
 * v1 added `sources` to Project. Anything already on disk predates it and
 * rehydrates without the array, so the sources screen's first `.map` would
 * throw on undefined. Backfill in ONE place rather than defending at every read
 * site — the shape is honest afterwards. Same pattern, and the same reasoning,
 * as migrateChatState.
 *
 * Exported so the migration is testable without going through AsyncStorage.
 */
export function migrateProjectState(persisted: unknown, version: number): unknown {
  const state = persisted as { projects?: Partial<Project>[] } | undefined;
  if (!state?.projects || version >= PROJECT_STORAGE_VERSION) return state;

  return {
    ...state,
    projects: state.projects.map((project) => ({ ...project, sources: project.sources ?? [] })),
  };
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      editingId: null,
      filter: 'all',
      hasHydrated: false,

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
        set({ projects: [project, ...get().projects] });
        return project.id;
      },

      renameProject: (id, name) => {
        const trimmed = name.trim();
        // A nameless project is an untappable row — reject instead of storing it.
        if (!trimmed) return;
        set({
          projects: get().projects.map((project) =>
            project.id === id ? { ...project, name: trimmed, updatedAt: Date.now() } : project,
          ),
        });
      },

      setInstructions: (id, instructions) =>
        set({
          projects: get().projects.map((project) =>
            project.id === id ? { ...project, instructions, updatedAt: Date.now() } : project,
          ),
        }),

      togglePinned: (id) =>
        set({
          projects: get().projects.map((project) =>
            project.id === id ? { ...project, pinned: !project.pinned } : project,
          ),
        }),

      deleteProject: (id) =>
        set({
          projects: get().projects.filter((project) => project.id !== id),
          // Drop the pointer with the record, or the rename screen opens on a
          // project that no longer exists.
          editingId: get().editingId === id ? null : get().editingId,
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
        }),

      setFilter: (filter) => set({ filter }),
      setEditingId: (editingId) => set({ editingId }),
    }),
    {
      name: PROJECT_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      // `editingId` and `filter` are per-session view state, not data.
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

/*
 * Filter + order for the list: pinned first, then most recently updated.
 * Derived on read so pinning and filtering cannot desynchronise from storage.
 */
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
