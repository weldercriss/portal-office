# Prioridades de cobertura de teste

Estado real do projeto hoje, para calibrar expectativa: backend e frontend
já têm cobertura considerável (backend com specs em quase todo módulo de
domínio, incluindo guards e workers; frontend cobrindo páginas
administrativas, componentes de UI e o `httpClient`). A lacuna conhecida é
**patrimônio no frontend** — o módulo ainda não tem páginas, então também
não tem teste de frontend; ao implementá-lo (ver `AI/TASKS.md`), a cobertura
entra junto, não depois.

## Onde priorizar teste novo

1. **Regra de negócio com estado** (transição de status, validação de
   sobreposição de horário, cálculo de disponibilidade) — ex.:
   `disponibilidade.util.spec.ts`, `horarios.test.ts`. Barato de testar,
   maior retorno.
2. **Guard e permissão** (`roles.guard.spec.ts`) — regressão aqui vaza dado
   ou ação para quem não deveria ter acesso; prioridade alta mesmo sem
   cobertura ampla no resto do módulo.
3. **Fluxo de estado com efeito colateral** (aprovação/rejeição de
   solicitação, entrega/devolução de patrimônio, desligamento disparando
   devolução) — o efeito colateral é fácil de quebrar silenciosamente numa
   refatoração.
4. **Página administrativa com CRUD** — segue o padrão já em
   `SolicitacoesAdminPage.test.tsx`/`DepartamentosAdminPage.test.tsx`.

## O que não precisa de teste automatizado

- Integração externa real (Telegram, Agenda Google, e-mail): teste a lógica
  que decide *quando* disparar, mockando o cliente — não dispare
  mensagem/evento de verdade num teste.
- Estilo visual pixel-a-pixel: validação visual é manual, rodando a tela no
  navegador.
- Prisma Client gerado e tipos gerados: não é código seu.

## Checklist

- [ ] Teste novo cobre regra de negócio, guard/permissão ou fluxo com efeito
      colateral — não um detalhe de baixo retorno?
- [ ] Integração externa está mockada, não disparada de verdade no teste?
