# Plantões na Agenda Google

Cada plantão publicado vira um evento na Agenda Google do plantonista, e o
evento acompanha as mudanças da escala. O backend escreve com a **autorização
individual** de cada pessoa: ela conecta a própria conta Google em *Meu perfil →
Agenda Google*, e o portal guarda um refresh token criptografado para atualizar
os eventos dela mesmo quando não está com o portal aberto.

Não há delegação em todo o domínio nem conta de serviço. Quem não conectar a
agenda continua usando o portal normalmente — só não recebe os eventos. Poder
entrar com Google não é o mesmo que autorizar a agenda: são dois consentimentos.

## Como configurar

Tudo acontece em `console.cloud.google.com`, no mesmo projeto e no **mesmo
cliente OAuth do login**. Configurar a API e a credencial exige acesso ao
projeto Google Cloud, o que é diferente de ser super-administrador do Workspace.

### 1. No Google Cloud

1. Ative a **Google Calendar API** em *APIs e serviços → Biblioteca*.
2. Abra o cliente OAuth do tipo **Aplicativo da Web** já usado pelo login, em
   *Google Auth Platform → Clientes*.
3. Mantenha as origens JavaScript do login e **adicione as URIs de
   redirecionamento** da agenda:

   | Ambiente | URI de redirecionamento |
   | --- | --- |
   | Desenvolvimento | `http://localhost:3333/agenda-google/oauth/callback` |
   | Produção (Caddy) | `https://SEU-DOMINIO/api/agenda-google/oauth/callback` |

   A URI precisa ser **idêntica** à configurada no backend, incluindo o `/api`
   que o Caddy remove antes de encaminhar. Divergência aqui gera
   `redirect_uri_mismatch`.
4. Confira que a tela de consentimento pede exatamente estes escopos:

   ```text
   openid
   email
   https://www.googleapis.com/auth/calendar.events
   ```

   `calendar.events` permite gerenciar eventos das agendas acessíveis à pessoa;
   o portal limita suas operações aos eventos de plantão que ele mesmo cria.
5. Copie o **Client Secret** desse cliente. Ele fica só no backend — nunca em
   variável `VITE_*`.

Se o aplicativo estiver **externo em modo de teste**, cadastre os usuários de
teste; nesse estado os refresh tokens costumam expirar em sete dias, o que
obriga a reconectar. Para uso contínuo, publique o aplicativo. Se o Workspace
bloquear o app ou os escopos, um administrador ainda precisa liberá-los em
[controles de acesso a aplicativos](https://support.google.com/a/answer/7281227?hl=pt-BR).

### 2. No portal

```dotenv
GOOGLE_CALENDAR_ENABLED="true"
GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET="<segredo do mesmo client id do login>"
GOOGLE_CALENDAR_OAUTH_REDIRECT_URI="https://portal.exemplo.com.br/api/agenda-google/oauth/callback"
GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY="<32 bytes aleatórios em base64>"
GOOGLE_CALENDAR_TIMEZONE="America/Sao_Paulo"
GOOGLE_CALENDAR_ID="primary"
APP_PUBLIC_URL="https://portal.exemplo.com.br"
```

`GOOGLE_CLIENT_ID` é o mesmo do login e já está configurado. Gere a chave de
criptografia **uma vez por ambiente** e preserve-a entre reinícios e deploys:
sem ela os tokens guardados não abrem mais e todos precisam reconectar. Ela é
independente dos segredos JWT.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`GOOGLE_CALENDAR_ID="primary"` grava na agenda principal da pessoa. Para separar
os plantões numa agenda própria, aponte para o ID dela — mas essa agenda precisa
existir e estar acessível a cada plantonista.

## Como funciona

**Conectar.** Em *Meu perfil → Agenda Google*, o botão **Conectar Agenda
Google** leva ao consentimento do Google e volta para `/perfil`. O portal exige
que a conta autorizada seja **a mesma do cadastro** (e-mail e, quando já existe
vínculo de login, o mesmo `sub`). Consentimento parcial, sem a permissão de
eventos, não gera conexão válida.

**O que vira evento.** Só plantão com status `PUBLICADO`, com plantonista
vinculado, com a chave de sincronização ligada e com conexão válida. Rascunho
não gera evento; despublicar apaga o evento existente.

**Horário.** Vem do turno: `horaInicio` e `horaFim`, no fuso configurado. Turno
que vira a meia-noite (fim menor ou igual ao início) termina no dia seguinte.
Plantão sem turno vira evento de dia inteiro.

**Quando sincroniza.** Criação (inclusive de séries), edição, exclusão,
exclusão de série e aceitação de troca. A troca move o evento: apaga da agenda
de quem saiu e cria na de quem entrou.

**Fila com repetição.** A operação do plantão apenas registra a pendência numa
outbox (`AgendaSyncPendente`); um worker processa a cada minuto, com espera
crescente de até uma hora e no máximo dez tentativas. Assim a agenda fora do ar
nunca derruba a publicação de uma escala. O worker pressupõe **uma instância**
do backend, que é como o portal é publicado hoje.

**Falhas por pessoa são independentes.** Numa troca, se quem saiu revogou o
acesso, o evento de quem entrou é criado do mesmo jeito. A limpeza pendente e
seu vínculo ficam guardados em `aguardandoReconexaoUserId` até a reconexão
resolver — não são apagados como se tivessem funcionado.

**Idempotência.** O ID do evento é derivado do plantão e da pessoa. Se a criação
no Google funcionar mas gravar o vínculo falhar, a repetição reencontra o mesmo
evento em vez de criar um duplicado.

**Se a pessoa apagar o evento** na própria agenda, a próxima sincronização
recria. A descrição do evento avisa que alterações manuais são sobrescritas.

**Desligar a sincronização** (a chave em Meu perfil) enfileira a remoção dos
eventos já criados e mantém a autorização para conseguir fazer essa limpeza.
Ligar de novo recria os plantões futuros.

**Desconectar** apaga o refresh token guardado no portal e interrompe novas
chamadas, mas **mantém os eventos já criados** no Google. Para removê-los pelo
portal, desligue a sincronização e aguarde a limpeza antes de desconectar.
Desconectar aqui não revoga a concessão no Google: como o cliente OAuth é o
mesmo do login, a revogação alcançaria também outras permissões do aplicativo.

## Ativação

1. Publique com `GOOGLE_CALENDAR_ENABLED=false` e aplique a migration.
2. Configure a Calendar API, as URIs de redirecionamento e o consentimento.
3. Preencha as variáveis (segredo, redirect URI e chave de criptografia).
4. Ligue em homologação, conecte uma conta de teste e valide publicação,
   atualização, troca de plantonista, limpeza e reconexão.
5. Se houver eventos antigos criados pela conta de serviço, preserve os vínculos
   e verifique se a conta conectada consegue atualizá-los no mesmo calendário.
   Não recrie tudo indiscriminadamente.
6. Ligue em produção e oriente cada pessoa a conectar a agenda em Meu perfil.
   Quem já fazia login Google **não** é conectado automaticamente.

O rollback é voltar `GOOGLE_CALENDAR_ENABLED=false`. Isso pausa o processamento,
mas não exclui eventos remotos nem revoga autorizações. Preserve os tokens
criptografados, a chave de criptografia e os vínculos para retomar depois.

## Quando algo não aparece

| Sintoma | Causa provável |
| --- | --- |
| Card não aparece em Meu perfil | Integração desligada, ou segredo/redirect/chave de criptografia ausentes |
| `redirect_uri_mismatch` no Google | URI do backend diferente da cadastrada no Cloud (atenção ao `/api`) |
| Volta com `motivo=conta_diferente` | A conta Google autorizada não é a do cadastro no portal |
| Volta com `motivo=estado_invalido` | Tentativa expirada (dez minutos), reutilizada ou de outro navegador |
| Volta com `motivo=permissao_incompleta` | A permissão de eventos não foi concedida na tela do Google |
| Volta com `motivo=sem_token` | O Google não devolveu refresh token; reconecte para forçar o consentimento |
| Card pede **Reconectar** | Autorização revogada ou expirada (`invalid_grant`), ou chave de criptografia trocada |
| Nada é criado para uma pessoa | Ela não conectou a agenda, ou desligou a chave de sincronização |
| Evento uma hora deslocado | `GOOGLE_CALENDAR_TIMEZONE` errado |

Pendências que falharam ficam em `AgendaSyncPendente` com `ultimoErro` e o
número de tentativas; as que esperam reconexão trazem
`aguardandoReconexaoUserId`. Conexões com problema ficam em
`AgendaGoogleConexao` com `status` e `ultimoErro`. São os primeiros lugares para
olhar.

## Custos

Nenhum: a Calendar API é gratuita dentro das cotas. Os números e a ressalva
sobre 2026 estão em [custos-google.md](custos-google.md).
