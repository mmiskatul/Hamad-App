import { logoutCurrentSession } from '../logout';
import { clearAuthSession, clearAuthSessionMemoryCache, readAuthSession, saveAuthSession, type AuthSession } from '@/shared/auth';
import { useProfileStore } from '@/shared/profile';
import { usePlanStore } from '@/shared/plan';
import { useUsageStore } from '@/shared/usage';
import { useThemeStore } from '@/shared/theme';
import { useMemoryStore } from '@/features/settings';
import { useChatStore } from '@/features/chat';
import { useProjectStore } from '@/features/projects';

const fetchMock = jest.fn();
const session: AuthSession = {
  user: { id: 'user-1', email: 'member@example.com', name: 'Member', createdAt: '2026-08-01T00:00:00.000Z' },
  accessToken: 'access-token',
  refreshToken: 'rt_refresh-token-value',
  sessionToken: 'st_session-token-value',
  tokenType: 'Bearer',
  expiresIn: '15m',
  sessionExpiresAt: '2099-08-31T00:00:00.000Z',
};

beforeEach(async () => {
  global.fetch = fetchMock;
  fetchMock.mockReset().mockResolvedValue({ ok: true, status: 204, json: async () => ({}) } as Response);
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://api.test/api/v1';
  await clearAuthSession();
  clearAuthSessionMemoryCache();
  await saveAuthSession(session);
  useProfileStore.setState({ name: 'Member', email: 'member@example.com', phone: '123', avatarUri: null });
  usePlanStore.setState({ plan: 'pro' });
  useUsageStore.setState({ requests: 5, tokens: 100 });
  useMemoryStore.setState({ enabled: true, nickname: 'Member', summary: 'Saved' });
  useChatStore.setState({ conversations: [{ id: 'chat', title: 'Chat', model: 'gpt', updatedAt: 1, pinned: false, project: null, messages: [], attachments: [] }] });
  useProjectStore.setState({ projects: [{ id: 'project', name: 'Project', description: '', instructions: '', scope: 'default', pinned: false, shared: false, sources: [], updatedAt: 1 }] });
  useThemeStore.setState({ preference: 'dark' });
});

it('revokes the current session, removes credentials and account caches, but keeps device appearance', async () => {
  await logoutCurrentSession();

  expect(fetchMock).toHaveBeenCalledWith(
    'http://api.test/api/v1/auth/logout',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ sessionToken: session.sessionToken }),
    }),
  );
  await expect(readAuthSession()).resolves.toBeNull();
  expect(useProfileStore.getState().email).toBe('');
  expect(usePlanStore.getState().plan).toBe('free');
  expect(useUsageStore.getState().requests).toBe(0);
  expect(useMemoryStore.getState().summary).toBe('');
  expect(useChatStore.getState().conversations).toEqual([]);
  expect(useProjectStore.getState().projects).toEqual([]);
  expect(useThemeStore.getState().preference).toBe('dark');
});
