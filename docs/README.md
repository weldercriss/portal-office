# Documentação do Portal BackOffice

## AI/ — estado atual e tarefas pendentes

- [CONTEXT.md](AI/CONTEXT.md) — como o sistema está implementado hoje:
  arquitetura, funcionalidades, integrações e operação.
- [TASKS.md](AI/TASKS.md) — trabalho que falta concluir, consolidado dos
  planos anteriores: interface de patrimônio/equipamentos, integração com
  colaboradores e validação da entrega.

Agendamento de salas e os itens transversais já estão implementados no
código. Patrimônio possui backend, mas sua interface está pendente. A pasta
de planos anteriores foi removida após a consolidação das pendências.

## reference/ — como as coisas já implementadas funcionam e como operar

- [como-rodar.md](reference/como-rodar.md) — ambiente local.
- [deploy.md](reference/deploy.md) e [configurar-deploy-ec2.md](reference/configurar-deploy-ec2.md) — produção no EC2.
- [agenda-google.md](reference/agenda-google.md), [agenda-google-oauth-individual.md](reference/agenda-google-oauth-individual.md),
  [login-google.md](reference/login-google.md), [custos-google.md](reference/custos-google.md) — integração Google.
- [agendamento-salas.md](reference/agendamento-salas.md) — como o módulo de salas funciona no dia a dia.
