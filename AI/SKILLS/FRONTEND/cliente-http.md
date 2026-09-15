# Toda chamada HTTP passa por `httpClient`

`frontend/src/api/httpClient.ts` é o único ponto de transporte HTTP do
frontend — nenhum módulo chama `fetch` diretamente para a API. Ele resolve:

- Autenticação: injeta o access token e tenta renovar automaticamente após
  um `401`, compartilhando a renovação entre chamadas concorrentes
  (`refreshPromise` evita disparar múltiplos refresh em paralelo).
- Upload: corpo `FormData` é detectado e tratado sem forçar
  `Content-Type: application/json`.
- Download/visualização de arquivo: usar `httpClientBlob`, não `httpClient`
  puro, para respostas binárias.
- Erros HTTP viram `HttpError` (com `status`), não uma rejeição genérica —
  trate esse tipo ao capturar erro de uma chamada.

Ao adicionar uma chamada nova em `api/<dominio>.api.ts`, reaproveite
`httpClient`/`httpClientBlob` existentes; não crie uma instância de `fetch`
ou `axios` paralela para um caso "especial".

## Checklist

- [ ] A chamada nova usa `httpClient`/`httpClientBlob`, não `fetch` direto?
- [ ] Upload usa `FormData` pelo cliente existente, sem `Content-Type`
      manual?
- [ ] Download/visualização de arquivo usa `httpClientBlob`?
- [ ] Erro tratado como `HttpError`, verificando `status` quando relevante?
