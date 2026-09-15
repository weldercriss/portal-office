# Tarefas pendentes do Portal BackOffice

Atualizado em **10/09/2026**. Pendências consolidadas dos planos anteriores, cuja pasta foi removida após esta transferência. O estado implementado está descrito em [CONTEXT.md](CONTEXT.md).

O agendamento de salas e os seis itens transversais (tempo real, Telegram, aprovação direta, substituição de alertas nativos, dashboard e anexo no cadastro) já têm implementação no código. A pendência funcional dos planos é concluir a interface de **patrimônio e equipamentos**. A situação das migrations e da publicação precisa ser verificada no ambiente de destino; os relatos antigos não confirmam o estado atual.

## 1. Integrar o frontend à API de patrimônio

- [ ] Criar `frontend/src/modules/patrimonio/` com `types/patrimonio.types.ts`, `api/patrimonio.api.ts` e `hooks/usePatrimonio.ts`.
- [ ] Implementar consultas e mutações para tipos, equipamentos, resumo de estoque, alocações, devolução, cancelamento e termos usando as APIs existentes.
- [ ] Usar `FormData` para upload do termo e `httpClientBlob` para download/visualização. Atualizar as consultas afetadas após cada mutação.

Referências: [módulo de agendamento](../../frontend/src/modules/agendamento), [cliente HTTP](../../frontend/src/api/httpClient.ts), [visualização de documentos](../../frontend/src/modules/colaboradores-rh/utils/documento.ts) e [controllers de patrimônio](../../backend/src/patrimonio/patrimonio.controller.ts).

## 2. Construir a tela de inventário e movimentações

- [ ] Criar `pages/PatrimonioPage.tsx` com resumo por situação, listagem e filtros por tipo, situação, conservação, colaborador, busca e disponibilidade.
- [ ] Criar cadastro/edição do equipamento: tipo, número de patrimônio, número de série, marca, modelo, conservação, situação, aquisição e observações conforme os DTOs existentes.
- [ ] Expor desativação e exclusão definitiva respeitando as restrições de histórico e de equipamento em uso retornadas pela API.
- [ ] Criar os diálogos de entrega/alocação, devolução e cancelamento, com colaborador, data de início, estado na entrega/devolução e demais campos suportados pela API.
- [ ] Exibir vínculo atual e histórico de entregas, preservando a distinção entre situação do equipamento e andamento da alocação.
- [ ] Permitir anexar, visualizar/baixar e remover termo assinado da alocação, em PDF/DOC/DOCX de até 10 MB. Refletir o status retornado após essas operações.
- [ ] Tratar carregamento, lista vazia e falhas com os componentes do portal; usar `Dialog` nas confirmações, sem `alert()` ou `confirm()` nativos.

## 3. Adicionar catálogo, rotas e navegação

- [ ] Criar `pages/TiposEquipamentoAdminPage.tsx` para gerenciar os tipos fornecidos aos colaboradores, incluindo a exigência de termo e a ativação.
- [ ] Adicionar a página de tipos à área de Configurações e registrar sua rota em `AppRoutes.tsx`.
- [ ] Registrar `/patrimonio` e adicionar o item **Equipamentos** em `navigation.ts`, condicionado à rotina `patrimonio`.
- [ ] Respeitar o contrato de acesso existente: consultas exigem a rotina; operações de escrita são exclusivas de `ADMIN`. Proteger as rotas e a exibição das ações correspondentes.

Referências: [roteador](../../frontend/src/router/AppRoutes.tsx), [navegação](../../frontend/src/app/layouts/navigation.ts) e [layout de configurações](../../frontend/src/app/layouts/ConfiguracoesLayout.tsx).

## 4. Integrar à gestão de colaboradores

- [ ] Adicionar à `FichaColaboradorPage.tsx` um bloco com equipamentos/alocações da pessoa, situação atual e histórico.
- [ ] Ao alterar o status do colaborador para `DESLIGADO`, informar na interface que os equipamentos vinculados retornam ao estoque.
- [ ] No fluxo de entrega, impedir a seleção de colaboradores desligados e apresentar as rejeições da API de forma compreensível.
- [ ] Após desligamento ou movimentação, atualizar os dados exibidos de colaborador, inventário e alocações que forem afetados.

O backend já aciona a devolução ao mudar o status para `DESLIGADO`. A interface deve consumir esse comportamento, sem criar uma segunda devolução independente.

## 5. Validar a entrega e atualizar o contexto

- [ ] Executar testes pertinentes aos fluxos novos: permissões, cadastro/filtros, entrega, devolução, termo e integração com desligamento. Cobrir rejeições relevantes da API e falhas de upload.
- [ ] Executar os builds de backend e frontend e os testes necessários às alterações, registrando o resultado real.
- [ ] Verificar o estado das migrations no banco de destino. Os planos antigos citavam `20260910000000_patrimonio_equipamentos` e `20260910160000_reserva_telegram_lembrete` como pendentes; confirmar também as posteriores antes de afirmar que o ambiente está atualizado.
- [ ] No fluxo de implantação correspondente, aplicar as migrations que estiverem pendentes e validar acesso à rotina, catálogos e persistência/download dos termos. Confirmar a disponibilidade das telas no ambiente entregue.
- [ ] Atualizar [CONTEXT.md](CONTEXT.md) e marcar as tarefas concluídas conforme implementação e validação efetivas.

Comandos disponíveis: `npm.cmd test -- --runInBand` e `npm.cmd run build` em `backend/`; `npm.cmd test` e `npm.cmd run build` em `frontend/`. A consulta de migrations pode ser feita com `npx.cmd prisma migrate status` no backend configurado para o ambiente a verificar. Nenhum desses comandos foi executado nesta consolidação documental.

## Contrato existente a preservar

O backend de patrimônio já está em [backend/src/patrimonio](../../backend/src/patrimonio), registrado no `AppModule` e integrado ao serviço de usuários. A modelagem está no [schema Prisma](../../backend/prisma/schema.prisma).

| Conceito | Estados |
| --- | --- |
| Conservação (`EstadoEquipamento`) | `NOVO`, `BOM`, `REGULAR`, `RUIM`, `DANIFICADO`. |
| Situação do item (`EquipamentoStatus`) | `EM_COMPRA`, `AGUARDANDO_CHEGADA`, `ESTOQUE`, `EM_USO`, `MANUTENCAO`, `BAIXADO`. |
| Alocação/termo (`AlocacaoStatus`) | `PENDENTE`, `ENTREGUE`, `ASSINADO`, `DEVOLVIDO`, `CANCELADA`. |

Um equipamento só pode ter uma alocação ativa por vez. Itens em uso não podem ter sua situação alterada manualmente nem ser desativados sem devolução. O termo pertence à alocação, não ao cadastro do item; anexá-lo marca `ASSINADO`, e removê-lo desfaz essa condição. Registros com histórico têm restrições de exclusão definitiva. A devolução reavalia a conservação do item para a próxima entrega.

| API base | Operações existentes |
| --- | --- |
| `/patrimonio/tipos` | Listar, criar, editar, desativar e excluir definitivamente quando permitido. |
| `/patrimonio/equipamentos` | Listar/filtrar, consultar, criar, editar, desativar e excluir quando permitido; `/resumo` retorna contadores. |
| `/patrimonio/alocacoes` | Listar/filtrar, consultar, criar e editar; `/meus` consulta os itens da pessoa autenticada. |
| `/patrimonio/alocacoes/:id/devolver` e `/:id/cancelar` | Devolver ou cancelar a alocação. |
| `/patrimonio/alocacoes/colaborador/:id/devolver-tudo` | Devolver os equipamentos do colaborador. |
| `/patrimonio/alocacoes/:id/termo` | Enviar, baixar e remover termo; campo multipart `termo`. |

O contrato não usa prefixo `/v1`; o versionamento do agendamento é específico daquele módulo. Os controllers e DTOs são a referência para métodos, parâmetros e permissões exatos.
