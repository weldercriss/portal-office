# Rodar o frontend localmente

Passo a passo, dentro de `frontend/`, com a API já rodando (ver
[../BACKEND/subir-a-api-localmente.md](../BACKEND/subir-a-api-localmente.md)):

1. `npm.cmd ci`
2. Copiar `.env.example` para `.env` — variáveis relevantes:
   `VITE_API_BASE_URL`, `VITE_SOCKET_URL` e, se o login Google estiver
   habilitado, `VITE_GOOGLE_CLIENT_ID`.
3. `npm.cmd run dev` — aplicação em `http://localhost:5173`.

## Checklist

- [ ] `.env` aponta `VITE_API_BASE_URL`/`VITE_SOCKET_URL` para a API local
      (porta `3333`)?
- [ ] API já está no ar antes de validar um fluxo que depende dela?
