const DEFAULT_API_BASE_URL = 'http://localhost:4000/api/v1';
const REQUEST_TIMEOUT_MS = 15_000;

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
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const baseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');

  try {
    const response = await fetch(baseUrl + (path.startsWith('/') ? path : '/' + path), {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });

    const body = (await response.json().catch(() => ({}))) as T & ErrorEnvelope;
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
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, 'REQUEST_TIMEOUT', 'The request timed out.');
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not connect to the server.');
  } finally {
    clearTimeout(timeout);
  }
}
