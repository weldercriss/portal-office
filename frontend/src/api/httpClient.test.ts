import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient, setAccessToken } from './httpClient';

describe('httpClient', () => {
  beforeEach(() => {
    setAccessToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the Authorization header when an access token is set', async () => {
    setAccessToken('token-123');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await httpClient('/users');

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
  });

  it('retries once after a 401 by refreshing the access token', async () => {
    setAccessToken('expired-token');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'novo-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await httpClient<{ ok: boolean }>('/users');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const lastCallInit = fetchMock.mock.calls[2][1];
    expect((lastCallInit.headers as Record<string, string>).Authorization).toBe('Bearer novo-token');
  });

  it('throws with the server message when the response is not ok', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ message: 'Credenciais inválidas' }), { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      httpClient('/auth/login', { method: 'POST', body: { email: 'x', senha: 'y' } }),
    ).rejects.toThrow('Credenciais inválidas');
  });
});
