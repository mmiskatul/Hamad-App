import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ProjectSourcesScreen from '../screens/ProjectSourcesScreen';
import { migrateProjectState, useProjectStore, type Project } from '../store/projectStore';

import { initI18n } from '@/shared/i18n';
import { ThemeProvider, type ThemeMode } from '@/shared/theme';

/*
 * Project sources (Figma 168:2002 empty / 170:2091 list).
 *
 * Covers the hydration gate (a persisted store reads null on the first frame,
 * and redirecting off that would bounce a user who does have a project), the
 * two states of the single screen, removal, and the v1 persist migration that
 * backfills `sources` on records written before this batch.
 */

const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  }),
  Redirect: (props: { href: string }) => {
    mockRedirect(props.href);
    return null;
  },
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen(mode: ThemeMode | null = 'dark') {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider mode={mode ?? undefined}>
        <ProjectSourcesScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    name: 'Event planning',
    description: '',
    instructions: '',
    scope: 'default',
    pinned: false,
    shared: false,
    sources: [],
    updatedAt: 1000,
    ...overrides,
  };
}

beforeAll(async () => {
  await initI18n();
});

beforeEach(() => {
  mockRedirect.mockClear();
  useProjectStore.setState({
    projects: [project()],
    editingId: 'p1',
    filter: 'all',
    hasHydrated: true,
  });
});

describe('ProjectSourcesScreen', () => {
  it('waits for hydration instead of redirecting off a first-frame null', () => {
    useProjectStore.setState({ projects: [], editingId: null, hasHydrated: false });
    renderScreen();

    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects to the list once hydrated with no project to act on', () => {
    useProjectStore.setState({ editingId: null, hasHydrated: true });
    renderScreen();

    expect(mockRedirect).toHaveBeenCalledWith('/projects');
  });

  it('shows the pitch when the project has no sources', () => {
    renderScreen();

    expect(screen.getByTestId('sources-empty')).toBeTruthy();
    expect(screen.getByTestId('sources-empty-cta')).toBeTruthy();
  });

  it('lists sources and removes one from the store', () => {
    useProjectStore.setState({
      projects: [
        project({
          sources: [
            { id: 's1', name: 'name.md', at: 1000, uri: '' },
            { id: 's2', name: 'IMG_sdfds.jpg', at: 2000, uri: '' },
          ],
        }),
      ],
    });
    renderScreen();

    expect(screen.queryByTestId('sources-empty')).toBeNull();
    expect(screen.getByTestId('source-row-s1')).toBeTruthy();

    fireEvent.press(screen.getByTestId('source-row-s1-remove'));

    const sources = useProjectStore.getState().projects[0].sources;
    expect(sources.map((source) => source.id)).toEqual(['s2']);
  });

  it('adds a source at the head of the list and rejects a blank name', () => {
    useProjectStore.getState().addSource('p1', { name: '  notes.md  ' });
    useProjectStore.getState().addSource('p1', { name: '   ' });

    const sources = useProjectStore.getState().projects[0].sources;
    expect(sources).toHaveLength(1);
    expect(sources[0].name).toBe('notes.md');
  });
});

describe('migrateProjectState', () => {
  it('backfills sources on records written before v1', () => {
    const migrated = migrateProjectState({ projects: [{ id: 'p1', name: 'Old' }] }, 0) as {
      projects: Project[];
    };

    expect(migrated.projects[0].sources).toEqual([]);
  });

  it('leaves current-version state alone', () => {
    const state = { projects: [project({ sources: [{ id: 's1', name: 'a', at: 1, uri: '' }] })] };

    expect(migrateProjectState(state, 1)).toBe(state);
  });
});
