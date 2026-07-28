import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import NewProjectScreen from '../screens/NewProjectScreen';
import ProjectInstructionsScreen from '../screens/ProjectInstructionsScreen';
import ProjectListScreen from '../screens/ProjectListScreen';
import RenameProjectScreen from '../screens/RenameProjectScreen';
import { useProjectStore, visibleProjects, type Project } from '../store/projectStore';

import { initI18n } from '@/shared/i18n';
import { THEMES, ThemeProvider, type ThemeMode } from '@/shared/theme';

/*
 * Projects (Figma 142:1070 / 151:1742 / 144:1229 / 152:1914 / 152:1951).
 * Covers the promises: filter + search + pin ordering, the create/rename
 * validation rules, the inert scope on rename, and the deep-link gate on the
 * two screens that take their target from the store.
 */

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => {
  // Named MockReact, not React: a factory-local `React` would shadow the
  // module's own import (no-shadow) — jest hoists this above it.
  const MockReact = require('react');
  const { View } = require('react-native');
  return {
    useRouter: () => ({
      push: mockPush,
      back: mockBack,
      replace: mockReplace,
      canGoBack: () => true,
    }),
    // Redirect renders nothing but records where it pointed.
    Redirect: ({ href }: { href: string }) =>
      MockReact.createElement(View, { testID: `redirect-${href}` }),
  };
});

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen(ui: React.ReactElement, mode: ThemeMode = 'dark') {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider mode={mode}>{ui}</ThemeProvider>
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
  mockPush.mockClear();
  mockBack.mockClear();
  mockReplace.mockClear();
  useProjectStore.setState({
    projects: [],
    editingId: null,
    filter: 'all',
    hasHydrated: true,
  });
});

describe('project list', () => {
  it('pitches the feature when there are no projects at all', () => {
    renderScreen(<ProjectListScreen />);

    expect(screen.getByText('Let’s start your project')).toBeTruthy();
    expect(screen.getByTestId('projects-empty-cta')).toBeTruthy();
  });

  it('does not tell a user with projects to start their first one', () => {
    useProjectStore.setState({ projects: [project({ shared: true })], filter: 'mine' });
    renderScreen(<ProjectListScreen />);

    // Filtered to nothing, but the pitch would be wrong here.
    expect(screen.getByText('No projects match')).toBeTruthy();
    expect(screen.queryByTestId('projects-empty-cta')).toBeNull();
  });

  it('filters by ownership', () => {
    useProjectStore.setState({
      projects: [
        project({ id: 'mine', name: 'Mine' }),
        project({ id: 'theirs', name: 'Theirs', shared: true }),
      ],
    });
    renderScreen(<ProjectListScreen />);

    fireEvent.press(screen.getByTestId('projects-filter-shared'));
    expect(screen.getByText('Theirs')).toBeTruthy();
    expect(screen.queryByText('Mine')).toBeNull();

    fireEvent.press(screen.getByTestId('projects-filter-mine'));
    expect(screen.getByText('Mine')).toBeTruthy();
    expect(screen.queryByText('Theirs')).toBeNull();
  });

  it('turns the search pill into a live filter', () => {
    useProjectStore.setState({
      projects: [project({ id: 'a', name: 'Wedding' }), project({ id: 'b', name: 'Taxes' })],
    });
    renderScreen(<ProjectListScreen />);

    fireEvent.press(screen.getByTestId('projects-search'));
    fireEvent.changeText(screen.getByTestId('projects-search-input'), 'wed');

    expect(screen.getByText('Wedding')).toBeTruthy();
    expect(screen.queryByText('Taxes')).toBeNull();
  });

  it('routes the row menu to rename and instructions with the target set', () => {
    useProjectStore.setState({ projects: [project()] });
    renderScreen(<ProjectListScreen />);

    fireEvent(screen.getByTestId('project-row-p1'), 'longPress');
    fireEvent.press(screen.getByTestId('project-menu-instructions'));

    // The target rides in the store, not in the URL.
    expect(useProjectStore.getState().editingId).toBe('p1');
    expect(mockPush).toHaveBeenCalledWith('/project-instructions');
  });

  it('routes the row menu "new project chat" to /project-new', () => {
    useProjectStore.setState({ projects: [project()] });
    renderScreen(<ProjectListScreen />);

    fireEvent(screen.getByTestId('project-row-p1'), 'longPress');
    fireEvent.press(screen.getByTestId('project-menu-newChat'));

    expect(mockPush).toHaveBeenCalledWith('/project-new');
  });

  it('routes the row menu "files in chat" to /chat-files', () => {
    useProjectStore.setState({ projects: [project()] });
    renderScreen(<ProjectListScreen />);

    fireEvent(screen.getByTestId('project-row-p1'), 'longPress');
    fireEvent.press(screen.getByTestId('project-menu-files'));

    expect(mockPush).toHaveBeenCalledWith('/chat-files');
  });

  it('deletes from the row action', () => {
    useProjectStore.setState({ projects: [project()] });
    renderScreen(<ProjectListScreen />);

    fireEvent.press(screen.getByTestId('project-row-p1-delete'));

    expect(useProjectStore.getState().projects).toHaveLength(0);
  });
});

describe('new project', () => {
  it('blocks Create until the project has a name', () => {
    renderScreen(<NewProjectScreen />);

    expect(screen.getByTestId('new-project-create').props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByTestId('new-project-name'), '  ');
    expect(screen.getByTestId('new-project-create').props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByTestId('new-project-name'), 'Wedding');
    expect(screen.getByTestId('new-project-create').props.accessibilityState.disabled).toBe(false);
  });

  it('creates with the chosen memory scope', () => {
    renderScreen(<NewProjectScreen />);

    fireEvent.changeText(screen.getByTestId('new-project-name'), 'Wedding');
    fireEvent.press(screen.getByTestId('new-project-scope-project-only'));
    fireEvent.press(screen.getByTestId('new-project-create'));

    const [created] = useProjectStore.getState().projects;
    expect(created.name).toBe('Wedding');
    expect(created.scope).toBe('project-only');
    expect(mockBack).toHaveBeenCalled();
  });
});

describe('rename project', () => {
  it('redirects a deep link that has no project to act on', () => {
    renderScreen(<RenameProjectScreen />);
    expect(screen.getByTestId('redirect-/projects')).toBeTruthy();
  });

  it('waits for hydration before deciding to redirect', () => {
    // A persisted store reads null on the first frame; redirecting off that
    // would bounce a user who does have a project.
    useProjectStore.setState({ hasHydrated: false, editingId: 'p1' });
    renderScreen(<RenameProjectScreen />);

    expect(screen.queryByTestId('redirect-/projects')).toBeNull();
  });

  it('saves a changed name and leaves the scope inert', () => {
    useProjectStore.setState({ projects: [project()], editingId: 'p1' });
    renderScreen(<RenameProjectScreen />);

    // Unchanged name is not savable.
    expect(screen.getByTestId('rename-project-save').props.accessibilityState.disabled).toBe(true);
    // Scope is shown but cannot be changed — flipping it would retroactively
    // alter what the project's chats could already read.
    expect(screen.getByTestId('rename-project-scope').props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByTestId('rename-project-name'), 'Renamed');
    fireEvent.press(screen.getByTestId('rename-project-save'));

    expect(useProjectStore.getState().projects[0].name).toBe('Renamed');
    expect(useProjectStore.getState().editingId).toBeNull();
  });
});

describe('instructions', () => {
  it('commits only on the ✓, not per keystroke', () => {
    useProjectStore.setState({ projects: [project()], editingId: 'p1' });
    renderScreen(<ProjectInstructionsScreen />);

    fireEvent.changeText(screen.getByTestId('instructions-input'), 'Speak like a lawyer.');
    expect(useProjectStore.getState().projects[0].instructions).toBe('');

    fireEvent.press(screen.getByTestId('instructions-save'));
    expect(useProjectStore.getState().projects[0].instructions).toBe('Speak like a lawyer.');
  });
});

describe('visibleProjects', () => {
  it('puts pinned projects first regardless of recency', () => {
    const projects = [
      project({ id: 'new', updatedAt: 2000 }),
      project({ id: 'old', updatedAt: 1000, pinned: true }),
    ];

    expect(visibleProjects(projects, 'all').map((item) => item.id)).toEqual(['old', 'new']);
  });
});

it('paints projects from the active palette', () => {
  useProjectStore.setState({ projects: [project()] });

  renderScreen(<ProjectListScreen />, 'dark');
  expect(screen.getByText('Event planning').props.style.color).toBe(THEMES.dark.color.textPrimary);
  screen.unmount();

  renderScreen(<ProjectListScreen />, 'light');
  expect(screen.getByText('Event planning').props.style.color).toBe(
    THEMES.light.color.textPrimary,
  );
});
