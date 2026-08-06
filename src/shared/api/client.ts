import {
  invalidateAuthSession,
  readAuthSession,
  saveAuthSession,
  type AuthSession,
} from '@/shared/auth';

import { resolveApiBaseUrl } from './baseUrl';

const REQUEST_TIMEOUT_MS = 15_000;

/*
 * Statuses that mean "try again" rather than "the request is permanently bad".
 * 0 is the network-error sentinel thrown by apiRequest when fetch can't reach
 * the server; 408 is the explicit timeout; 502 is Fastify relaying an upstream
 * provider failure. Used by the chat flow's send-message retry and the
 * post-reply conversation refresh — same list, one definition.
 */
export const TRANSIENT_NETWORK_STATUSES = [0, 408, 502] as const;

export function isTransientNetworkError(error: unknown): boolean {
  return error instanceof ApiError && (TRANSIENT_NETWORK_STATUSES as readonly number[]).includes(error.status);
}

export function apiUrl(path: string): string {
  return resolveApiBaseUrl() + (path.startsWith('/') ? path : '/' + path);
}

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
    await invalidateAuthSession();
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
  const method = (options.method ?? 'GET').toUpperCase();
  const url = apiUrl(path);
  const requestStartedAt = Date.now();

  logRequest(method, url);

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
  const signal = combineSignals(options.signal, timeoutController.signal);
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  // Fastify rejects an empty request as invalid JSON when a bodyless request
  // (notably DELETE) advertises application/json. Only describe a payload when
  // one is actually present; callers can still provide an explicit content type.
  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (session) headers.set('Authorization', `${session.tokenType} ${session.accessToken}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal,
    });

    const body = (await response.json().catch(() => ({}))) as T & ErrorEnvelope;
    const elapsedMs = Date.now() - requestStartedAt;
    logResponse(method, url, response.status, elapsedMs);

    if (response.status === 401 && session && retryOnUnauthorized) {
      const refreshed = await refreshAuthSession(session);
      return executeRequest<T>(path, options, refreshed, false, timeoutMs);
    }
    if (!response.ok) {
      logError(method, url, response.status, body);
      throw new ApiError(
        response.status,
        body.error?.code ?? 'REQUEST_FAILED',
        body.error?.message ?? body.message ?? 'The request could not be completed.',
      );
    }
    return body;
  } catch (error) {
    const elapsedMs = Date.now() - requestStartedAt;
    if (error instanceof ApiError) {
      logError(method, url, error.status, { message: error.message, code: error.code }, elapsedMs);
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError' && options.signal?.aborted) {
      logError(method, url, 'aborted', { message: 'cancelled by caller' }, elapsedMs);
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      logError(method, url, 408, { message: 'request timed out' }, elapsedMs);
      throw new ApiError(408, 'REQUEST_TIMEOUT', 'The request timed out.');
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    logError(method, url, 0, { message: `network error: ${message}` }, elapsedMs);
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not connect to the server.');
  } finally {
    clearTimeout(timeout);
  }
}

/*
 * Console logging for the API client. Gated on `__DEV__` so production
 * bundles stay quiet — Expo's Metro sets `__DEV__` to true for dev builds
 * and false for `expo export` / EAS production profiles.
 *
 * `[api]` tag makes the lines easy to filter in the Expo/React Native
 * console (Metro, LogBox, `npx react-native log-ios` / `log-android`,
 * the device console).
 */
function logRequest(method: string, url: string): void {
  if (!__DEV__) return;
  console.log(`[api] → ${method} ${url}`);
}

function logResponse(method: string, url: string, status: number, elapsedMs: number): void {
  if (!__DEV__) return;
  console.log(`[api] ← ${method} ${url} ${status} (${elapsedMs}ms)`);
}

function logError(
  method: string,
  url: string,
  status: number | string,
  body: unknown,
  elapsedMs?: number,
): void {
  if (!__DEV__) return;
  const suffix = elapsedMs === undefined ? '' : ` (${elapsedMs}ms)`;
  console.warn(`[api] ✗ ${method} ${url} ${status}${suffix}`, body);
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

/** Force validation and rotation of the refresh token stored for this device. */
export async function refreshCurrentAuthSession(): Promise<AuthSession> {
  const session = await readAuthSession();
  if (!session) {
    await invalidateAuthSession();
    throw new ApiError(401, 'AUTH_SESSION_MISSING', 'Please sign in again.');
  }
  return refreshAuthSession(session);
}

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
        await invalidateAuthSession();
      }
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
