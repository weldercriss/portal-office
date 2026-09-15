import { API_BASE_URL } from '../config/env';

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        accessToken = data.accessToken as string;
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function doAuthenticatedFetch(path: string, options: RequestOptions): Promise<Response> {
  const isFormData = options.body instanceof FormData;
  const doFetch = () =>
    fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
      body: isFormData ? (options.body as FormData) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

  let response = await doFetch();
  if (response.status === 401 && accessToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) response = await doFetch();
  }
  return response;
}

export async function httpClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await doAuthenticatedFetch(path, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new HttpError(response.status, body.message ?? `Erro ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function httpClientBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const response = await doAuthenticatedFetch(path, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new HttpError(response.status, body.message ?? `Erro ${response.status}`);
  }
  return response.blob();
}
