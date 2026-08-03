import { screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

const mockRestoreAuthSession = jest.fn<Promise<unknown>, []>();

/*
 * Route-tree contract test. Exercises the REAL src/app directory through
 * expo-router's testing renderer, so it fails if a route file is renamed, a
 * group is restructured, or the splash hand-off breaks.
 *
 * Requirement under test (user, 2026-07-20): the app opens on the splash and
 * moves to onboarding immediately after.
 */

// The onboarding screen pulls in SVG/PNG assets and a shimmer animation; this
// suite is about ROUTING, so the screen is stubbed down to a testID marker.
// Its own rendering is covered by the auth feature's tests.
jest.mock('@/features/auth', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    AUTH_CANVAS: '#1F1F20',
    // Injected into useAppBootstrap by the splash route — must be a function
    // here or boot throws. Resolves immediately: storage behaviour has its own
    // suite (authFlowStore.test.ts).
    whenAuthFlowHydrated: () => Promise.resolve(),
    restoreAuthSession: mockRestoreAuthSession,
    SplashScreen: () => React.createElement(View, { testID: 'splash-screen' }),
    OnboardingScreen: () => React.createElement(View, { testID: 'onboarding-screen' }),
    OnboardingScreenSkeleton: () => React.createElement(View, { testID: 'onboarding-skeleton' }),
    LoginScreen: () => React.createElement(View, { testID: 'login-screen' }),
    PasswordScreen: () => React.createElement(View, { testID: 'password-screen' }),
    VerifyEmailScreen: () => React.createElement(View, { testID: 'verify-email-screen' }),
    SignupScreen: () => React.createElement(View, { testID: 'signup-screen' }),
    NewPasswordScreen: () => React.createElement(View, { testID: 'new-password-screen' }),
    // Auth-owned but routed under (app) — it is entered from the profile.
    ChangePasswordScreen: () => React.createElement(View, { testID: 'change-password-screen' }),
  };
});

// Same treatment for the chat feature: this suite is about the route tree, and
// the home screen's own rendering is covered by features/chat's tests.
jest.mock('@/features/chat', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ChatHomeScreen: () => React.createElement(View, { testID: 'chat-home-screen' }),
    ConversationScreen: () => React.createElement(View, { testID: 'conversation-screen' }),
    UpgradePlanScreen: () => React.createElement(View, { testID: 'upgrade-screen' }),
    ChatHistoryScreen: () => React.createElement(View, { testID: 'chat-history-screen' }),
    ChatFilesScreen: () => React.createElement(View, { testID: 'chat-files-screen' }),
    refreshConversations: () => Promise.resolve(),
    // The /projects route is a composition root: it reads the chat store so a
    // project row can start a chat scoped to that project. A mocked feature
    // must still supply everything a ROUTE pulls from it, not just its screens.
    useChatStore: (selector: (state: unknown) => unknown) =>
      selector({ startProjectChat: jest.fn() }),
  };
});

// And the settings feature: eight routes, all of them thin bindings.
jest.mock('@/features/settings', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ProfileScreen: () => React.createElement(View, { testID: 'profile-screen' }),
    EditProfileScreen: () => React.createElement(View, { testID: 'profile-edit-screen' }),
    AboutScreen: () => React.createElement(View, { testID: 'about-screen' }),
    TermsScreen: () => React.createElement(View, { testID: 'terms-screen' }),
    PrivacyScreen: () => React.createElement(View, { testID: 'privacy-screen' }),
    ContactSupportScreen: () => React.createElement(View, { testID: 'support-screen' }),
    MemoryScreen: () => React.createElement(View, { testID: 'memory-screen' }),
    MemorySummaryScreen: () => React.createElement(View, { testID: 'memory-summary-screen' }),
  };
});

// And the projects feature: five routes, all thin bindings.
jest.mock('@/features/projects', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ProjectListScreen: () => React.createElement(View, { testID: 'projects-screen' }),
    NewProjectScreen: () => React.createElement(View, { testID: 'project-new-screen' }),
    RenameProjectScreen: () => React.createElement(View, { testID: 'project-rename-screen' }),
    ProjectInstructionsScreen: () =>
      React.createElement(View, { testID: 'project-instructions-screen' }),
    ProjectSourcesScreen: () => React.createElement(View, { testID: 'project-sources-screen' }),
    refreshProjects: () => Promise.resolve(),
  };
});

// And the dashboard feature: one route.
jest.mock('@/features/dashboard', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    UsageDashboardScreen: () => React.createElement(View, { testID: 'usage-screen' }),
  };
});

describe('app routing', () => {
  beforeEach(() => {
    mockRestoreAuthSession.mockReset();
    mockRestoreAuthSession.mockResolvedValue({ user: { id: 'user-1' } });
  });
  /*
   * REAL timers on purpose — do NOT add jest.useFakeTimers() here.
   *
   * These cases drive expo-router navigation through renderRouter + waitFor,
   * which settles by polling. Under fake timers that only works if RNTL's
   * waitFor auto-advances them, and that behaviour proved environment-dependent:
   * reliable on dev machines, deadlocking on Linux CI where renderRouter never
   * settled — every case timed out with `screen.getPathname is not a function`
   * and the stalled suite corrupted its worker. Real timers poll actual
   * wall-clock and behave identically everywhere. The only cost is that the
   * splash test below waits out the real ~2s boot floor.
   */

  it('opens on the splash route and lands on /onboarding once booted', async () => {
    mockRestoreAuthSession.mockResolvedValue(null);
    renderRouter('src/app', { initialUrl: '/' });

    // Splash holds while bootstrap runs — no onboarding yet.
    expect(screen.getByTestId('splash-screen')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-screen')).toBeNull();

    // booted flips once the SPLASH_MIN_DURATION_MS floor (2s real) elapses AND
    // bootstrap settles; index.tsx then redirects to /onboarding. Give the real
    // floor headroom to pass.
    await waitFor(() => expect(screen.getByTestId('onboarding-screen')).toBeTruthy(), {
      timeout: 6000,
    });
    expect(screen).toHavePathname('/onboarding');
  }, 20000);

  it('restores a persisted session and lands directly on /home', async () => {
    renderRouter('src/app', { initialUrl: '/' });

    expect(screen.getByTestId('splash-screen')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('chat-home-screen')).toBeTruthy(), {
      timeout: 6000,
    });
    expect(screen).toHavePathname('/home');
  }, 20000);

  it('resolves /login in the (auth) group to the login screen', async () => {
    renderRouter('src/app', { initialUrl: '/login' });

    await waitFor(() => expect(screen.getByTestId('login-screen')).toBeTruthy());
    expect(screen).toHavePathname('/login');
  });

  it('resolves /password in the (auth) group to the password screen', async () => {
    renderRouter('src/app', { initialUrl: '/password' });

    await waitFor(() => expect(screen.getByTestId('password-screen')).toBeTruthy());
    expect(screen).toHavePathname('/password');
  });

  it('resolves /verify-email in the (auth) group to the verify-email screen', async () => {
    renderRouter('src/app', { initialUrl: '/verify-email' });

    await waitFor(() => expect(screen.getByTestId('verify-email-screen')).toBeTruthy());
    expect(screen).toHavePathname('/verify-email');
  });

  it('resolves /new-password in the (auth) group to the new-password screen', async () => {
    renderRouter('src/app', { initialUrl: '/new-password' });

    await waitFor(() => expect(screen.getByTestId('new-password-screen')).toBeTruthy());
    expect(screen).toHavePathname('/new-password');
  });

  it('resolves /signup in the (auth) group to the finish-signing-up screen', async () => {
    renderRouter('src/app', { initialUrl: '/signup' });

    await waitFor(() => expect(screen.getByTestId('signup-screen')).toBeTruthy());
    expect(screen).toHavePathname('/signup');
  });

  /*
   * Auth-owned screen, (app) route: it is entered from the profile, so it lives
   * in the app group even though it paints the fixed brand canvas.
   */
  it('resolves /change-password in the (app) group to the change-password screen', async () => {
    renderRouter('src/app', { initialUrl: '/change-password' });

    await waitFor(() => expect(screen.getByTestId('change-password-screen')).toBeTruthy());
    expect(screen).toHavePathname('/change-password');
  });

  it('resolves /home in the (app) group to the chat home screen', async () => {
    renderRouter('src/app', { initialUrl: '/home' });

    await waitFor(() => expect(screen.getByTestId('chat-home-screen')).toBeTruthy());
    // The (app) group is parenthesised, so it adds no URL segment.
    expect(screen).toHavePathname('/home');
  });

  it('redirects a protected route to login when no session exists', async () => {
    mockRestoreAuthSession.mockResolvedValue(null);
    renderRouter('src/app', { initialUrl: '/home' });

    await waitFor(() => expect(screen.getByTestId('login-screen')).toBeTruthy());
    expect(screen.queryByTestId('chat-home-screen')).toBeNull();
    expect(screen).toHavePathname('/login');
  });

  it('resolves /upgrade in the (app) group to the plan screen', async () => {
    renderRouter('src/app', { initialUrl: '/upgrade' });

    await waitFor(() => expect(screen.getByTestId('upgrade-screen')).toBeTruthy());
    expect(screen).toHavePathname('/upgrade');
  });

  /*
   * The settings cluster is six sibling routes in the (app) group. They are
   * listed one per case rather than looped so a failure names the broken route.
   */
  it.each([
    ['/profile', 'profile-screen'],
    ['/profile-edit', 'profile-edit-screen'],
    ['/about', 'about-screen'],
    ['/terms', 'terms-screen'],
    ['/privacy', 'privacy-screen'],
    ['/support', 'support-screen'],
    ['/chat-history', 'chat-history-screen'],
    ['/chat-files', 'chat-files-screen'],
    ['/projects', 'projects-screen'],
    ['/project-new', 'project-new-screen'],
    ['/project-rename', 'project-rename-screen'],
    ['/project-instructions', 'project-instructions-screen'],
    ['/project-sources', 'project-sources-screen'],
    ['/memory', 'memory-screen'],
    ['/memory-summary', 'memory-summary-screen'],
    ['/usage', 'usage-screen'],
    ['/conversation', 'conversation-screen'],
  ])('resolves %s in the (app) group', async (path, testID) => {
    renderRouter('src/app', { initialUrl: path });

    await waitFor(() => expect(screen.getByTestId(testID)).toBeTruthy());
    expect(screen).toHavePathname(path);
  });

  it('sends unmatched deep links back to the splash route rather than a dead end', async () => {
    renderRouter('src/app', { initialUrl: '/does-not-exist' });

    await waitFor(() => expect(screen.getByTestId('splash-screen')).toBeTruthy());
    expect(screen).toHavePathname('/');
  });
});
