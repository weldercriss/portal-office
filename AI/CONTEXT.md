# Contexto atual do Portal BackOffice

Atualizado em **10/09/2026** a partir dos arquivos presentes neste checkout, incluindo alterações locais ainda não commitadas.

Este documento descreve o sistema implementado. A leitura do repositório não confirma quais migrations estão aplicadas no banco, quais integrações estão habilitadas nem qual versão está publicada. Nesta atualização não foram executados testes, builds, migrations ou deploys.

## 1. O que é o sistema

Portal interno da Suri para administrar colaboradores e rotinas de RH e operação: departamentos, permissões, plantões, solicitações, reservas de salas, documentos, admissão e recrutamento. Possui notificações dentro do portal, integração com Telegram e sincronização com a Agenda Google.

Existem dois perfis, `ADMIN` e `USER`. O cadastro de uma pessoa como colaborador é separado da autorização para ela entrar na plataforma. O módulo de patrimônio já possui backend e modelagem, mas ainda não tem telas no frontend.

## 2. Arquitetura e organização

| Parte | Implementação atual |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 5, React Router 6, TanStack Query 5 e Tailwind CSS 3. |
| Backend | NestJS 10 com Express, TypeScript, DTOs com class-validator e class-transformer. |
| Persistência | PostgreSQL; Prisma 5 para acesso ao banco, schema, migrations e seeds. O Compose usa PostgreSQL 16. |
| Autenticação | JWT, Passport e bcrypt; login Google opcional. |
| Tempo real | Socket.IO, com namespaces para notificações e agendamentos. |
| Tarefas periódicas | `@nestjs/schedule` dentro do processo da API. |
| Testes | Jest no backend; Vitest e Testing Library no frontend. |
| Empacotamento | Dockerfiles com Node.js 22; frontend servido por Caddy. |

O repositório contém dois projetos npm independentes, `backend/` e `frontend/`, cada um com seu `package.json` e lockfile. Não há um pacote npm na raiz coordenando os dois.

- `backend/src/app.module.ts`: registra os módulos ativos.
- `backend/src/<domínio>/`: controllers, services, DTOs e testes do domínio.
- `backend/prisma/schema.prisma` e `backend/prisma/migrations/`: estrutura e evolução do banco.
- `frontend/src/router/`: rotas e proteção de acesso.
- `frontend/src/app/layouts/`: estrutura da aplicação, navegação e configurações.
- `frontend/src/modules/<domínio>/`: páginas, componentes, chamadas de API, hooks e tipos.
- `frontend/src/components/ui/` e `components/system/`: componentes compartilhados.
- `frontend/src/api/httpClient.ts`: transporte HTTP, autenticação, renovação de token, FormData e download de arquivos.
- `AI/`: contexto atual (`CONTEXT.md`), tarefas pendentes (`TASKS.md`) e convenções por área (`SKILLS/`); `docs/reference/`: guias operacionais e de integrações.
- `.github/workflows/` e `scripts/`: automação de entrega e backup.

As páginas são carregadas sob demanda com `lazy`/`Suspense`. Consultas e mutações usam TanStack Query. A API não define prefixo global `/api`: esse prefixo é acrescentado externamente pelo proxy de produção, que o remove antes de encaminhar a chamada.

## 3. Identidade e permissões

`User` concentra tanto a identidade de acesso quanto o cadastro do colaborador. Os campos têm funções distintas:

- `ativo`: ativação do registro.
- `acessoPlataforma`: autorização para login, com padrão `false` no schema.
- `role`: perfil `ADMIN` ou `USER`.
- `statusColaborador`: situação de RH (`ATIVO`, `AFASTADO`, `FERIAS`, `DESLIGADO`).

Login, refresh e autenticação HTTP verificam se a pessoa existe, está ativa e possui acesso à plataforma. A estratégia JWT consulta o usuário atual no banco, incluindo seu perfil, em vez de usar apenas o perfil gravado no token.

O login por e-mail/senha emite access token e refresh token. Os tempos padrão são 15 minutos e 7 dias, configuráveis por ambiente. O refresh fica em cookie HttpOnly; o frontend persiste usuário e access token no localStorage. O cliente HTTP tenta renovar o access token após uma resposta 401 e compartilha a renovação entre chamadas concorrentes. Logout limpa o cookie e a sessão local.

As funcionalidades são representadas por `Rotina`. Para `USER`, as permissões vêm do departamento (`GroupRotina`), com concessões ou bloqueios individuais (`UserRotinaOverride`). Para `ADMIN`, o serviço resolve todas as rotinas ativas. Controllers combinam `JwtAuthGuard`, `RolesGuard` e `RotinaGuard` conforme a operação; o frontend também filtra menus e protege rotas.

Após login, administradores e usuários com a rotina `dashboard` vão para `/`; os demais vão para `/perfil`.

## 4. Módulos e comportamento disponível

### Colaboradores, departamentos e RH

Cadastro e edição de colaboradores, ativação, acesso à plataforma, senha, perfil, departamento, subárea, gestor, cargo, senioridade, datas pessoais/profissionais, dados bancários, salário e benefícios. `Group` representa o departamento e pode ter um responsável; `SubArea` pertence a um departamento.

A ficha administrativa do colaborador reúne dependentes, histórico profissional, checklist de admissão e documentos. Também existem APIs de treinamentos e participação, além das telas de recrutamento para vagas, candidatos e entrevistas. A presença de uma API não significa que exista uma página independente para ela.

O cadastro/edição permite anexar um documento opcional. Primeiro salva a pessoa e depois envia o arquivo: uma falha no upload não desfaz o cadastro. O armazenamento compartilhado de documentos aceita JPG, PNG, PDF, DOC e DOCX; downloads passam por endpoints da aplicação.

### Dashboard

Para administradores, apresenta total de colaboradores ativos, distribuição por departamento, próximos aniversários e aniversários de empresa, reservas pendentes e reservas confirmadas de hoje/amanhã. As listas de aniversários consideram uma janela de 60 dias e até oito itens; a lista de reservas também é limitada a oito.

Para colaboradores com acesso à rotina, existe um dashboard com próximos plantões publicados, ausências aprovadas e folgas. Ele consulta as APIs desses módulos, cujas permissões também se aplicam.

### Plantões

API `/plantoes`, com turnos e tipos configuráveis. Há plantões em `RASCUNHO` e `PUBLICADO`, recorrências `UNICO`, `SEMANAL` e `MENSAL`, exclusão de série e fluxo de troca com estados `PENDENTE`, `ACEITA` e `REJEITADA`. Plantões integram notificações e Agenda Google.

A navegação e a página `/plantoes` estão atualmente restritas a administradores. O arquivo `MeusPlantoesPage.tsx` continua no repositório, mas seu carregamento está comentado no roteador; as operações de troca continuam implementadas no backend.

### Solicitações

API `/solicitacoes`, com tipos configuráveis, colaborador, responsável opcional, período, descrição, anexo e identificação de quem registrou e decidiu. Estados: `SOLICITADA`, `APROVADA`, `REJEITADA` e `CANCELADA`.

Tipos controlam necessidade de aprovação e classificação como afastamento ou folga. Quando um tipo dispensa aprovação, somente um administrador pode registrá-lo, informando o colaborador; a solicitação já nasce aprovada. Para os demais tipos, usuários comuns solicitam em seu próprio nome, enquanto administradores podem indicar outra pessoa.

Em `/solicitacoes`, administradores recebem a tela de gestão e usuários comuns a tela pessoal. Aprovação e rejeição estão disponíveis por botões de ação na listagem administrativa.

### Agendamento de salas

Backend e frontend implementados. A API usa `/v1/agendamento/salas` e `/v1/agendamento/reservas`; este versionamento é específico do módulo, não um prefixo geral do portal.

- Salas possuem nome, localização, capacidade, observações, ativação e janelas semanais de disponibilidade com duração dos intervalos da grade.
- Reservas possuem sala, data, horário inicial/final, solicitante, responsável opcional, título, observações e quem registrou.
- Estados: `SOLICITADA`, `CONFIRMADA` e `CANCELADA`. Os dois primeiros ocupam o horário; cancelar libera o horário e preserva o registro. Excluir remove o registro.
- A API permite consulta a quem tem a rotina `agendamentos`; criação e alterações exigem `ADMIN`.
- O serviço valida disponibilidade e sobreposição antes de salvar. O WebSocket atualiza as telas quando reservas mudam; isso não constitui, por si só, um bloqueio de concorrência no banco.
- A interface apresenta lista e grade diária, filtros, diálogo de reserva e confirmação direta na listagem. Administradores também podem criar/editar salas na própria tela de agendamentos ou em Configurações.
- Os destinatários dos avisos podem ser solicitante, responsável ou ambos (`ReservaDestinatarios`). A opção `notificarTelegram` controla avisos pessoais pelo Telegram; as notificações internas de mudança continuam.
- Há avisos de criação, confirmação e cancelamento, além de lembretes aproximadamente 30 minutos antes do início e do fim. O worker roda a cada cinco minutos, usa uma janela de 25 a 35 minutos e flags para evitar repetição; atualmente seleciona reservas confirmadas do dia UTC com `notificarTelegram=true`.
- Reservas sincronizam eventos na Agenda Google do solicitante. A escolha do responsável como destinatário de notificações não altera o titular dessa sincronização.

### Patrimônio e equipamentos

Backend registrado no `AppModule`, com APIs `/patrimonio/tipos`, `/patrimonio/equipamentos` e `/patrimonio/alocacoes`, protegidas pela rotina `patrimonio`; escrita restrita a administradores.

A modelagem separa conservação física (`EstadoEquipamento`), situação do item (`EquipamentoStatus`) e andamento da entrega/termo (`AlocacaoStatus`). Cada entrega é uma alocação própria, preservando o histórico do equipamento e do colaborador.

Há cadastro e filtros de inventário, resumo por situação, entrega, devolução, cancelamento e termo assinado em PDF/DOC/DOCX de até 10 MB. O termo é anexado à alocação; não se marca `ASSINADO` sem documento. Colaboradores desligados não recebem equipamentos. Ao mudar o status de alguém para `DESLIGADO`, o serviço de usuários aciona a devolução de suas alocações, fora da transação do cadastro.

**Ainda não existe frontend de patrimônio:** faltam páginas, navegação, catálogo de tipos e bloco de equipamentos na ficha do colaborador. Há testes do backend no repositório, mas seu resultado não foi revalidado nesta atualização.

## 5. Integrações e tarefas em segundo plano

### Google: login e Agenda são autorizações distintas

O login Google é opcional, controlado por `GOOGLE_AUTH_ENABLED` e pelo Client ID no backend/frontend. Usa desafios temporários vinculados ao navegador e validação do ID token. É possível vincular uma conta a um usuário existente mediante confirmação de senha. O provisionamento automático depende de `GOOGLE_AUTO_PROVISION` e de domínios permitidos configurados; o código também permite contas provisionadas sem senha local e a definição posterior de uma senha.

A Agenda Google usa consentimento OAuth individual em Meu perfil, com conexão, desconexão, preferência pessoal e estados `CONECTADA`, `RECONECTAR` e `DESCONECTADA`. Refresh tokens são armazenados de forma criptografada, com chave definida no ambiente. O login Google sozinho não concede autorização de calendário.

Plantões e reservas registram pendências em tabelas do próprio PostgreSQL (`AgendaSyncPendente` e `ReservaSyncPendente`). Workers a cada minuto processam a sincronização, com novas tentativas e espera por reconexão quando necessário. Vínculos de eventos remotos sobrevivem à exclusão do registro local para permitir sua limpeza. O portal é a origem dos dados: alterações manuais no evento Google podem ser sobrescritas na sincronização seguinte.

Não há um broker externo de filas nesse fluxo. O worker de plantões declara pressupor uma instância da API; não há coordenação distribuída de lote nesse worker para múltiplas réplicas.

### Notificações e Telegram

`Notificacao` é persistida por usuário, com título, mensagem, tipo, link e marcação de leitura. O portal lista as últimas 50, conta não lidas e permite marcar ou limpar notificações. O namespace Socket.IO `/notificacoes` entrega eventos pessoais; `/agendamento` emite `reserva:mudou`, utilizado para invalidar consultas de reservas e horários no frontend.

A integração Telegram possui configuração administrativa do bot e dos tipos de aviso, mensagem de teste, link pessoal de conexão e webhook `/telegram/webhook/:secret`. A conexão associa a pessoa a um chat; apenas informar um username não garante que o bot possa enviar uma mensagem privada.

Há detecção e cadastro de múltiplos grupos/tópicos, com controle de envio pessoal e para grupos por tipo de notificação. Mensagens para grupos têm fluxo próprio: `enviarTelegram=false` em uma notificação suprime a mensagem privada, mas não suprime automaticamente um texto de grupo fornecido pela operação. Os lembretes de reserva, por sua vez, só entram na seleção do worker quando `notificarTelegram=true`.

O envio Telegram é disparado sem aguardar a entrega dentro de `NotificacoesService`; uma notificação gravada no portal não comprova entrega externa. Aniversários também possuem tarefa diária agendada às 8h pelo scheduler.

## 6. Rotas principais do frontend

| Caminho | Destino / acesso |
| --- | --- |
| `/login` | Login por senha e, quando habilitado, Google. |
| `/` | Dashboard condicionado à rotina; conteúdo varia por perfil. |
| `/perfil` | Perfil e conexões pessoais, para usuário autenticado. |
| `/plantoes` | Gestão de plantões; `ADMIN` e rotina correspondente. |
| `/agendamentos` | Consulta de reservas; gestão para `ADMIN`. |
| `/solicitacoes` | Gestão administrativa ou solicitações pessoais. |
| `/configuracoes/colaboradores` | Cadastro administrativo de colaboradores. |
| `/configuracoes/colaboradores/:id` | Ficha de RH. |
| `/configuracoes/departamentos` | Departamentos e subáreas. |
| `/configuracoes/permissoes` | Rotinas por departamento e exceções individuais. |
| `/configuracoes/tipos-solicitacao` | Catálogo de solicitações. |
| `/configuracoes/salas` | Cadastro de salas. |
| `/configuracoes/plantoes/turnos` | Cadastro de turnos. |
| `/configuracoes/plantoes/tipos-plantao` | Catálogo de plantões. |
| `/configuracoes/telegram` | Bot, avisos e grupos/tópicos. |
| `/configuracoes/vagas` e `/configuracoes/vagas/:id` | Recrutamento. |

Toda a área `/configuracoes` exige `ADMIN`. As rotas antigas de configurações de turnos e tipos de plantão redirecionam para os caminhos agrupados em `/configuracoes/plantoes`.

## 7. Execução e entrega

O ambiente local usa frontend em `http://localhost:5173`, API em `http://localhost:3333` e PostgreSQL publicado pelo Compose do backend na porta `5433` do computador. Exemplos de configuração ficam em `backend/.env.example` e `frontend/.env.example`.

O fluxo documentado é instalar dependências com `npm.cmd ci` em cada projeto, preparar os `.env`, iniciar o PostgreSQL e, no backend, executar `npm.cmd run prisma:generate` e `npx.cmd prisma migrate deploy`. O seed de desenvolvimento é destinado à primeira configuração de um banco vazio. A API inicia com `npm.cmd run start:dev`, e o frontend com `npm.cmd run dev`, cada um em seu diretório e terminal. O guia completo está em [como-rodar.md](../reference/como-rodar.md).

Comandos de verificação disponíveis, executados no projeto correspondente:

- Backend: `npm.cmd test -- --runInBand` e `npm.cmd run build`.
- Frontend: `npm.cmd test` e `npm.cmd run build`.

Em produção, `docker-compose.prod.yml` define PostgreSQL, backend e servidor web, com volumes para banco e uploads. `docker-compose.caddy.yml` define o proxy público separado, conectado à rede da aplicação, com HTTP/HTTPS conforme o domínio. O Caddy interno serve a SPA, encaminha `/api/*` para a API e `/socket.io/*` para o transporte de tempo real.

O entrypoint do backend executa `prisma migrate deploy` antes de iniciar a aplicação e pode executar o seed de produção quando `RUN_SEED=true`. Esse seed é distinto do seed de desenvolvimento. `GET /` verifica resposta básica da API; `GET /health` consulta o banco e retorna indisponibilidade se ele falhar. Pelo proxy, o healthcheck é `/api/health`.

O workflow de GitHub Actions está configurado para `main` e acionamento manual: valida scripts/Compose/Caddy, constrói e publica imagens identificadas pelo commit e entrega via SSH no EC2 com verificação de saúde. Os Dockerfiles compilam os projetos; o workflow atual não executa as suítes Jest/Vitest. Há scripts de build/publicação, deploy e backup no repositório. Sua existência não confirma execução recente ou backup disponível.

Variáveis principais: `DATABASE_URL`, segredos e expiração JWT, `CORS_ORIGIN`, `COOKIE_PATH`, `COOKIE_SECURE`, `TELEGRAM_WEBHOOK_SECRET`, `GOOGLE_AUTH_ENABLED`, `GOOGLE_CLIENT_ID`, `GOOGLE_ALLOWED_DOMAINS`, `GOOGLE_AUTO_PROVISION` e o conjunto `GOOGLE_CALENDAR_*`. No frontend, `VITE_API_BASE_URL`, `VITE_SOCKET_URL` e `VITE_GOOGLE_CLIENT_ID` entram na configuração/build. Valores reais e credenciais não fazem parte deste documento.

## 8. Limites e referências para continuidade

- Patrimônio está disponível apenas no backend.
- Comunicados, templates de comunicados, desempenho e a antiga página de portal do colaborador foram removidos no estado local examinado. Não aparecem como módulos/rotas ativos.
- Horários padrão, horários diferenciados e almoço do cadastro foram removidos do schema atual; turnos e horários de plantões/reservas continuam existindo.
- As migrations presentes incluem essas remoções, login/Agenda Google, salas, patrimônio, acesso à plataforma, responsáveis e evolução dos avisos Telegram. Não foi consultado o estado de aplicação delas em nenhum banco.
- Os planos anteriores continham contagens de testes, relatos de produção e migrations então pendentes. Suas pendências foram consolidadas em [TASKS.md](TASKS.md), e a pasta de planos foi removida. Os relatos históricos não atestam a situação desta cópia ou de um ambiente remoto.
- `claude.md` e `AGENTS.md` apontavam para `docs/ai/CONTEXT.md`/`RULES.md`/`DECISIONS.md`/`TODO.md`, que nunca existiram nesta árvore; ambos foram corrigidos para apontar para `AI/CONTEXT.md`, `AI/TASKS.md` e `AI/SKILLS/`, que são os arquivos reais.

Para conferir comportamento, comece pelo [AppModule](../../backend/src/app.module.ts), pelas [rotas do frontend](../../frontend/src/router/AppRoutes.tsx), pelo [schema Prisma](../../backend/prisma/schema.prisma) e pelo controller/service do domínio. As instruções de operação estão em [docs/reference](../reference/como-rodar.md), as pendências em [TASKS.md](TASKS.md) e o índice em [docs/README.md](../README.md). Em divergências sobre o que está implementado, confira o código atual antes de reproduzir afirmações de planos antigos.
