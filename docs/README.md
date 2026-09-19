# Documentação do Portal BackOffice

## AI/ — estado atual e tarefas pendentes

- [CONTEXT.md](AI/CONTEXT.md) — como o sistema está implementado hoje:
  arquitetura, funcionalidades, integrações e operação.
- [TASKS.md](AI/TASKS.md) — trabalho que falta concluir, consolidado dos
  planos anteriores: bloco de patrimônio na ficha do colaborador e
  validação da entrega em ambiente real.

Agendamento de salas e os itens transversais já estão implementados no
código. Patrimônio possui backend e frontend (cadastro de bens e vínculo com
colaboradores); falta o bloco na ficha do colaborador. A pasta de planos
anteriores foi removida após a consolidação das pendências.

## features/planning/ — planos de funcionalidades ainda não implementadas

- [integracao-portal-operacional.md](features/planning/integracao-portal-operacional.md) —
  plano para trocar dados com o Portal Operacional (cs-dash) via a Public API dele.
  Escopo de dados ainda não decidido.
- [migracao-mongodb.md](features/planning/migracao-mongodb.md) — plano faseado para
  substituir PostgreSQL por MongoDB preservando Prisma, IDs e contratos da API.
- [convites-agenda-por-email.md](features/planning/convites-agenda-por-email.md) —
  plano para criar um evento único na agenda do RH e convidar destinatários por
  e-mail, sem exigir conexão individual de cada colaborador. Fases 1–3
  (banco, backend, frontend) implementadas em 17/09/2026, desligadas por
  `GOOGLE_CALENDAR_EMAIL_INVITES_ENABLED=false` até a Fase 0 (prova manual
  numa conta real do Workspace) ser executada — ver
  [reference/agenda-google.md](reference/agenda-google.md#convites-de-agenda-por-e-mail).
- [rh-completo-11-frentes.md](features/planning/rh-completo-11-frentes.md) —
  plano das 11 frentes de RH pedidas (tempo de experiência, aniversariantes
  por mês, avisos configuráveis, checklist de admissão + pré-cadastro
  público, Central de Documentos, foto de perfil, contracheque, dados de
  saúde/cultural, turnover + demissão, pesquisas NPS/NR-1, feedback 1:1).
  Itens 5 (Central de Documentos), 6 (foto de perfil) e 7 (contracheque)
  implementados em 17/09/2026; as demais 8 frentes seguem como plano.

## features-planning/ — planos solicitados neste caminho

- [logs-aplicacao.md](features-planning/logs-aplicacao.md) — plano do módulo
  administrativo que registra requisições HTTP, detalha erros e reinicia o
  histórico em ciclos de 100 entradas. Implementado em 17/09/2026 — ver
  [reference/logs-aplicacao.md](reference/logs-aplicacao.md).
- [solicitacao-reserva-sala-colaborador.md](features/planning/solicitacao-reserva-sala-colaborador.md) —
  plano, contrato e pontos de continuidade da solicitação pessoal de salas,
  implementada com configuração global e aprovação administrativa.

## reference/ — como as coisas já implementadas funcionam e como operar

- [como-rodar.md](reference/como-rodar.md) — ambiente local.
- [deploy.md](reference/deploy.md) e [configurar-deploy-ec2.md](reference/configurar-deploy-ec2.md) — produção no EC2.
- [agenda-google.md](reference/agenda-google.md), [agenda-google-oauth-individual.md](reference/agenda-google-oauth-individual.md),
  [login-google.md](reference/login-google.md), [custos-google.md](reference/custos-google.md) — integração Google.
- [agendamento-salas.md](reference/agendamento-salas.md) — como o módulo de salas funciona no dia a dia.
- [logs-aplicacao.md](reference/logs-aplicacao.md) — histórico técnico das requisições HTTP, captura, sanitização e rotação em ciclos de 100.
