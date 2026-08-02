import {
  clearAuthSession,
  readAuthSession,
  saveAuthSession,
  type AuthSession,
} from '@/shared/auth';

const DEFAULT_API_BASE_URL = 'http://localhost:4000/api/v1';
const REQUEST_TIMEOUT_MS = 15_000;

export type ApiRequestOptions = RequestInit & {
  authenticated?: boolean;
  retryOnUnauthorized?: boolean;
  /** Override the normal request timeout for long-running operations such as AI replies. */
  timeoutMs?: number;
};

type ErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    authenticated = false,
    retryOnUnauthorized = true,
    timeoutMs = REQUEST_TIMEOUT_MS,
    ...requestOptions
  } = options;
  const session = authenticated ? await readAuthSession() : null;
  if (authenticated && !session) {
    throw new ApiError(401, 'AUTH_SESSION_MISSING', 'Please sign in again.');
  }

  return executeRequest<T>(path, requestOptions, session, retryOnUnauthorized, timeoutMs);
}

async function executeRequest<T>(
  path: string,
  options: RequestInit,
  session: AuthSession | null,
  retryOnUnauthorized: boolean,
  timeoutMs: number,
): Promise<T> {
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
  const signal = combineSignals(options.signal, timeoutController.signal);
  const baseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');
  if (session) headers.set('Authorization', `${session.tokenType} ${session.accessToken}`);

  try {
    const response = await fetch(baseUrl + (path.startsWith('/') ? path : '/' + path), {
      ...options,
      headers,
      signal,
    });

    const body = (await response.json().catch(() => ({}))) as T & ErrorEnvelope;
    if (response.status === 401 && session && retryOnUnauthorized) {
      const refreshed = await refreshAuthSession(session);
      return executeRequest<T>(path, options, refreshed, false, timeoutMs);
    }
    if (!response.ok) {
      throw new ApiError(
        response.status,
        body.error?.code ?? 'REQUEST_FAILED',
        body.error?.message ?? body.message ?? 'The request could not be completed.',
      );
    }
    return body;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError' && options.signal?.aborted) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, 'REQUEST_TIMEOUT', 'The request timed out.');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not connect to the server.');
  } finally {
    clearTimeout(timeout);
  }
}

function combineSignals(first: AbortSignal | null | undefined, second: AbortSignal): AbortSignal {
  if (!first) return second;
  if (first.aborted) return first;
  const controller = new AbortController();
  const abort = () => controller.abort();
  first.addEventListener('abort', abort, { once: true });
  second.addEventListener('abort', abort, { once: true });
  return controller.signal;
}

let refreshPromise: Promise<AuthSession> | null = null;

async function refreshAuthSession(session: AuthSession): Promise<AuthSession> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshed = await apiRequest<AuthSession>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refreshToken: session.refreshToken,
          sessionToken: session.sessionToken,
        }),
        retryOnUnauthorized: false,
      });
      await saveAuthSession(refreshed);
      return refreshed;
    } catch (error) {
      // A temporary network outage or 5xx must not turn into a logout. Only an
      // explicit refresh rejection proves that the persisted session is no
      // longer valid.
      if (error instanceof ApiError && error.status === 401) {
        await clearAuthSession();
      }
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
