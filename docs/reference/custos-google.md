# Custos da integração com o Google

Consulta feita na documentação oficial do Google em **09/09/2026**. Preços e
cotas mudam; confira as fontes no fim antes de decidir com base neste texto.

## Resumo

| Item | Custo hoje |
| --- | --- |
| Login com Google (Identity Services) | Gratuito, sem limite de usuários |
| Validação do ID token no backend | Gratuito |
| Google Calendar API | Gratuito dentro das cotas |
| Service account e delegação em todo o domínio | Gratuito |
| Verificação do app (se for interno ao Workspace) | Não se aplica |
| Licenças do Google Workspace | Já pagas, por usuário |

Nenhuma das duas integrações exige conta de faturamento ativa no Google Cloud
hoje. Veja a ressalva sobre 2026 na seção da Agenda.

## Login com Google

Não há cobrança. O Google Identity Services e o OAuth 2.0 para autenticação são
gratuitos, sem tarifa por login, por usuário ativo ou por projeto. O portal
recebe o ID token no navegador, o backend valida assinatura e emissor com a
`google-auth-library` e emite a própria sessão JWT — nenhum serviço pago entra
nesse caminho. As chaves públicas que a biblioteca busca no Google para
conferir a assinatura também são gratuitas e ficam em cache.

Vale registrar uma confusão comum: **Firebase Authentication** e **Google Cloud
Identity Platform** cobram por usuário ativo mensal acima de uma faixa
gratuita. São produtos diferentes do que o portal usa. Se um dia alguém propuser
migrar a autenticação para um deles, aí sim entra custo recorrente por usuário.

Os escopos do login (`openid`, `email`, `profile`) são **não sensíveis**, então
não disparam verificação do app nem processo de revisão.

## Agenda (Google Calendar API)

A API é gratuita: *"All standard use of the Google Calendar API is available at
no additional cost"*. O que existe são cotas:

| Limite | Valor |
| --- | --- |
| Requisições por minuto, por projeto | 10.000 |
| Requisições por minuto, por usuário | 600 |
| Requisições por dia, por projeto | 1.000.000 |

Estourar a cota devolve erro 403 ou 429 — por isso a sincronização precisa de
espera exponencial entre as tentativas, que é o que a outbox da sincronização
faz.

**Ressalva importante:** a documentação do Google avisa que ultrapassar o limite
diário passará a gerar cobrança na conta de faturamento **ainda em 2026**, com o
preço a ser anunciado com pelo menos 90 dias de antecedência. Não muda nada para
o portal na prática, pelo volume abaixo, mas convém acompanhar o aviso.

### Volume estimado do portal

Cada plantão publicado, alterado, trocado ou cancelado gera **uma** chamada à
API. Numa escala com 40 pessoas e 8 plantões por pessoa ao mês, são cerca de 320
chamadas mensais, mais as alterações. O pico acontece quando o admin publica uma
série inteira de uma vez: algumas dezenas de chamadas em poucos minutos, contra
um teto de 10.000 por minuto.

Em outras palavras, o uso previsto fica três ordens de grandeza abaixo do limite
diário. O risco real não é custo, é bater no limite por usuário (600/min) num
laço com defeito — daí a importância do retry com espera crescente.

## O que pode custar dinheiro de verdade

**1. Verificação do app, quando ele é externo.** Aplicativos que pedem escopos
*sensíveis* ou *restritos* precisam passar pela verificação do Google. O
processo em si é gratuito, mas consome tempo e exige política de privacidade,
domínio verificado e, às vezes, vídeo demonstrativo.

**2. Avaliação de segurança (CASA), só para escopos restritos.** Aplicativos que
acessam dados restritos por um servidor de terceiros precisam de avaliação anual
feita por um avaliador aprovado pelo Google. **O preço é negociado diretamente
entre a empresa e o avaliador; o Google não define nem controla esse valor.** É
o único item da lista que costuma custar caro de verdade, e é recorrente, porque
a recertificação é a cada 12 meses.

O escopo de agenda que a integração usaria (`calendar.events`) é classificado
como sensível, não restrito — ou seja, não cai na avaliação paga. Confirme na
tela de escopos do console, que rotula cada escopo como não sensível, sensível
ou restrito na hora em que você o adiciona.

**3. Nada disso se aplica se o app for interno.** Para aplicativos usados apenas
dentro da organização do Workspace, os escopos nem aparecem na tela de
consentimento e o uso de escopos sensíveis ou restritos **não exige revisão do
Google**. É o cenário mais barato e mais rápido.

Aqui entra a única decisão com impacto real de custo e prazo: um app *interno*
pertence a **uma** organização do Workspace. Se `chatbotmaker.io` e `suri.ai`
forem organizações distintas, o app não pode ser interno para as duas ao mesmo
tempo. As saídas são publicar como externo (e passar pela verificação, gratuita
mas demorada), manter dois projetos no Google Cloud, ou concentrar tudo numa
organização só.

**4. Infraestrutura.** Zero adicional. A sincronização roda no mesmo backend e no
mesmo EC2 que já existem.

## Alternativa sem custo e sem verificação

Se a verificação virar um obstáculo, o feed **ICS** assinável não usa API do
Google, não pede escopo, não exige verificação e funciona também em Outlook e
Apple. Em troca, o Google atualiza feeds externos de hora em hora, às vezes
demorando bem mais, e a agenda fica somente leitura.

## O que confirmar antes de ativar

- Se `chatbotmaker.io` e `suri.ai` são a mesma organização do Workspace.
- O tipo do app na tela de consentimento: interno ou externo.
- A classificação que o console mostra para o escopo `calendar.events`.
- As cotas atuais em **APIs e serviços → Cotas**, no projeto do Google Cloud.
- O aviso do Google sobre a cobrança acima do limite diário, prevista para 2026.

## Documentos relacionados

- [Plano do login com Google](plano-login-google.md)
- [Plantões na Agenda Google](agenda-google.md)

## Fontes

- [Cotas e preço da Calendar API](https://developers.google.com/workspace/calendar/api/guides/quota)
- [FAQ de verificação de apps OAuth](https://support.google.com/cloud/answer/9110914)
- [Verificação de escopos restritos](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)
- [Avaliação de segurança (CASA)](https://support.google.com/cloud/answer/13465431)
- [Requisitos de verificação e exceções](https://support.google.com/cloud/answer/13464321)
