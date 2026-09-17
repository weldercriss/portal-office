# Agendamento de salas

O admin cadastra as salas e em que dias e horários cada uma pode ser reservada.
Ele também decide, por uma configuração global, se o colaborador pode solicitar
uma sala para si. O horário de uma solicitação já sai da lista de disponíveis e
só volta se ela for cancelada; a Agenda Google só recebe o evento depois da
confirmação administrativa.

Quem tem a agenda Google conectada em *Meu perfil* recebe a reserva como evento
na própria agenda, pelo mesmo caminho já usado pelos plantões.

## Como funciona

**Salas e disponibilidade.** Cada sala tem uma grade semanal de janelas: dia da
semana, hora de abertura, hora de fechamento e o tamanho dos blocos exibidos.
Duas janelas do mesmo dia não podem se sobrepor, e sala sem janela não aceita
reserva. A janela é o horário comercial da sala naquele dia — é ela que limita
a reserva.

**A duração da reserva é livre.** Os blocos (`Blocos de`) são só atalhos
visuais: mostram o que já foi tomado e preenchem o horário com um clique. A
reserva em si não fica presa a eles — quem registra digita o início e o fim e
pode pedir quantas horas precisar, inclusive em horário quebrado (09:20 às
10:50), desde que caibam numa janela do dia. Não há teto artificial de duração:
o limite é o horário comercial da própria sala.

**Reservar.** O painel mostra a grade do dia com o que já foi tomado riscado.
Clicar num bloco livre preenche o horário; clicar num posterior emenda até ele,
se todo o trecho no meio estiver livre. A tela já avisa quando o horário vaza da
janela ou atravessa uma reserva, e o backend revalida o mesmo: precisa caber
inteiro numa janela da sala e não encostar em reserva viva. Intervalos são
meio-abertos — 10:00–11:00 e 11:00–12:00 convivem sem conflito.

**Status.** `SOLICITADA` e `CONFIRMADA` ocupam o horário; só `CANCELADA` o
libera. Cancelar preserva o registro (com data e motivo) e é o caminho normal;
excluir apaga o histórico e existe só para engano de digitação. Sala com reserva
registrada não pode ser excluída — desative-a para tirá-la das novas reservas.

**Quem faz o quê.** Consultar as salas, a grade e as reservas é de quem tem a
rotina `agendamentos`. O admin registra reservas diretamente, confirma ou
cancela solicitações, edita e exclui. Quando habilitado em *Configurações →
Salas*, o colaborador pode solicitar somente para si; o backend impõe o status
`SOLICITADA` e permite que ele cancele somente o próprio pedido ainda pendente.

**Notificações.** Ao solicitar, o colaborador recebe a confirmação interna do
envio e os administradores recebem o novo pedido (`RESERVA_SALA_SOLICITADA`). O
solicitante também é avisado quando a reserva é criada, confirmada, atualizada ou
cancelada. Os tipos do Telegram nascem desligados e podem ser ligados em
*Configurações → Telegram*.

## Agenda Google

Somente reserva `CONFIRMADA` de quem conectou a agenda e mantém a sincronização
ligada vira evento na agenda dessa pessoa. `SOLICITADA` ocupa a sala, mas não é
publicada enquanto aguarda o admin. Cancelar, excluir ou trocar o solicitante
remove o evento de quem saiu.

O caminho é o mesmo dos plantões e depende da mesma configuração descrita em
[agenda-google.md](agenda-google.md) — nenhuma variável nova. Com
`GOOGLE_CALENDAR_ENABLED=false` o módulo funciona normalmente, só não publica
eventos.

**Fila própria.** A mutação da reserva só registra a pendência em
`ReservaSyncPendente`; um worker processa a cada minuto, com espera crescente de
até uma hora e no máximo dez tentativas. A agenda fora do ar nunca derruba uma
reserva. Pendência parada por falta de autorização espera em
`aguardandoReconexaoUserId` e volta à fila quando a pessoa reconecta.

**Por que uma fila separada.** As tabelas dos plantões são chaveadas por
`plantaoId`. Manter as reservas em `ReservaSyncPendente` e `ReservaEventoAgenda`
deixa este módulo autocontido — o plano prevê que ele possa migrar inteiro para
outro projeto — sem mexer na sincronização já em produção. O que é reusado são
os primitivos: o cliente da Calendar API e o estado da conexão individual.

**Idempotência.** O ID do evento é derivado de `reserva:<id>` e da pessoa, então
uma repetição depois de falha ao gravar o vínculo reencontra o mesmo evento em
vez de criar outro — e nunca colide com o evento de um plantão.

## API

Tudo em `/v1/agendamento`. A v1 é o contrato do painel interno; integrações com
outros portais entram na v2, sem prender este contrato.

| Método | Rota | Quem |
| --- | --- | --- |
| `GET` | `/v1/agendamento/salas?all=true` | rotina `agendamentos` |
| `GET` | `/v1/agendamento/salas/:id` | rotina |
| `GET` | `/v1/agendamento/salas/:id/horarios?data=YYYY-MM-DD&ignorarReservaId=` | rotina |
| `POST` `PATCH` `DELETE` | `/v1/agendamento/salas[/:id][/permanent]` | ADMIN |
| `GET` | `/v1/agendamento/reservas?salaId=&solicitanteId=&status=&from=&to=` | rotina |
| `GET` | `/v1/agendamento/reservas/minhas` | rotina |
| `GET` | `/v1/agendamento/config` | rotina |
| `PUT` | `/v1/agendamento/config` | ADMIN |
| `POST` | `/v1/agendamento/reservas/minhas` | rotina, se a configuração permitir |
| `POST` | `/v1/agendamento/reservas/:id/cancelar-minha` | dono da solicitação pendente |
| `POST` `PATCH` `DELETE` | `/v1/agendamento/reservas[/:id]` | ADMIN |
| `POST` | `/v1/agendamento/reservas/:id/cancelar` | ADMIN |

`horarios` devolve cada horário com `disponivel`, já descontando as reservas
vivas. `ignorarReservaId` deixa a própria reserva fora da conta ao editá-la.

**Datas.** `data` é sempre `YYYY-MM-DD` e o dia é guardado à meia-noite UTC; o
horário vive em `horaInicio`/`horaFim` (`HH:MM`). Toda a leitura de dia da
semana é feita em UTC, para que a grade não deslize um dia em servidor fora de
UTC+0.

## Ativação

1. Aplique as migrations `20260909230000_agendamento_salas` e
   `20260917044610_permite_solicitacao_sala_colaborador`. Elas criam as tabelas,
   semeiam a rotina `agendamentos`, os tipos de notificação e a configuração
   global, cujo valor efetivo começa desligado mesmo antes de existir uma linha.
2. Cadastre as salas e as janelas em *Configurações → Salas* e escolha se os
   colaboradores podem solicitar.
3. Ajuste a rotina por departamento em *Configurações → Permissões*, se quiser
   restringir quem enxerga a agenda das salas.

## Quando algo não aparece

| Sintoma | Causa provável |
| --- | --- |
| "Esta sala não abre nesse dia da semana" | Não há janela cadastrada para aquele dia |
| Grade vazia mesmo com janela | O bloco escolhido é maior que a janela |
| "A sala não está disponível nesse dia e horário" | O horário pedido vaza da janela do dia ou atravessa duas janelas separadas |
| "Este horário já está reservado" | Existe reserva `SOLICITADA` ou `CONFIRMADA` sobrepondo |
| Evento não aparece na agenda | Pessoa não conectou a agenda, desligou a sincronização, ou a integração está desligada |
| Evento uma hora deslocado | `GOOGLE_CALENDAR_TIMEZONE` errado |

Pendências que falharam ficam em `ReservaSyncPendente` com `ultimoErro` e o
número de tentativas; as que esperam reconexão trazem
`aguardandoReconexaoUserId`. É o primeiro lugar para olhar.
