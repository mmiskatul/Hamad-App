import { apiRequest } from '@/shared/api/client';
import { clearAuthSession, readAuthSession } from '@/shared/auth';
import { useMemoryStore } from '@/shared/memory';
import { useModelStore } from '@/shared/models';
import { DEFAULT_PLAN, usePlanStore } from '@/shared/plan';
import { useProfileStore } from '@/shared/profile';
import { useUsageStore } from '@/shared/usage';
import { useAuthFlowStore } from '@/features/auth';
import { DEFAULT_MODEL, useChatStore } from '@/features/chat';
import { useProjectStore } from '@/features/projects';

/**
 * Revoke the current backend session and remove every account-specific cache.
 * Language and appearance are intentionally preserved as device preferences.
 */
export async function logoutCurrentSession(): Promise<void> {
  const session = await readAuthSession();

  try {
    if (session) {
      await apiRequest<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ sessionToken: session.sessionToken }),
        retryOnUnauthorized: false,
      });
    }
  } finally {
    await clearAuthSession();
    clearAccountCaches();
  }
}

function clearAccountCaches(): void {
  useAuthFlowStore.getState().clearFlow();
  useProfileStore.getState().replaceProfile({ name: '', email: '', phone: '', avatarUri: null });
  usePlanStore.getState().setPlan(DEFAULT_PLAN);
  useUsageStore.getState().reset(startOfMonth());
  useMemoryStore.getState().replaceMemory({
    enabled: false,
    nickname: '',
    occupation: '',
    about: '',
    summary: '',
    summaryUpdatedAt: null,
  });
  useModelStore.getState().reset();
  useChatStore.setState({
    conversations: [],
    activeId: null,
    model: DEFAULT_MODEL,
    promptCount: 0,
    upsellSeen: false,
    thinkingFor: null,
    streamingId: null,
    pendingProject: null,
  });
  useProjectStore.setState({
    projects: [],
    editingId: null,
    filter: 'all',
    isRefreshing: false,
    error: null,
  });
}

function startOfMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}