# Estado de domínio é `enum` do Prisma, não string livre

Sempre que um campo representa um conjunto fechado de estados, modele como
`enum` no `schema.prisma` — não como `String` validada só na aplicação.
Exemplos já no schema:

- `EstadoEquipamento`: `NOVO`, `BOM`, `REGULAR`, `RUIM`, `DANIFICADO`
  (conservação física do item).
- `EquipamentoStatus`: `EM_COMPRA`, `AGUARDANDO_CHEGADA`, `ESTOQUE`,
  `EM_USO`, `MANUTENCAO`, `BAIXADO` (situação do item).
- `AlocacaoStatus`: `PENDENTE`, `ENTREGUE`, `ASSINADO`, `DEVOLVIDO`,
  `CANCELADA` (andamento da entrega/termo).
- Estados equivalentes existem para solicitações (`SOLICITADA`, `APROVADA`,
  `REJEITADA`, `CANCELADA`) e reservas de sala (`SOLICITADA`, `CONFIRMADA`,
  `CANCELADA`).

Note que o mesmo projeto já separa conceitos que parecem parecidos em enums
distintos — patrimônio tem três eixos independentes (conservação física,
situação do item, andamento da alocação) em vez de um enum genérico
"status". Ao modelar um domínio novo, prefira essa separação por eixo em vez
de um único enum genérico que mistura conceitos diferentes.

Adicionar um valor a um enum existente ainda exige migration (ver
[migrations.md](migrations.md)) — não é uma mudança "só de aplicação".

## Isso não proíbe `Json` para schema variável definido pelo admin

A regra acima é sobre **estado** (um conjunto fechado, conhecido em tempo de
build, que decide o comportamento da aplicação). Não se aplica a dados cujo
formato é definido em runtime pelo próprio usuário — ex.:
`TipoSolicitacao.camposFormulario`/`Solicitacao.respostasFormulario`
(`backend/prisma/schema.prisma`), o primeiro uso de `Json` no schema: os
campos de um formulário são livres (o admin decide quantos, quais tipos),
e nenhum filtro precisa fazer query relacional sobre esse conteúdo — os
filtros reais (tipo, período) já são colunas normais. Nesse caso `Json` é
mais simples que normalizar em tabelas, e o "tipo do campo" dentro do Json
(`TEXTO`/`NUMERO`/`DATA`/`SELECAO`/`ARQUIVO`) é validado só no DTO
(`@IsIn`, ver `backend/src/common/dto/campo-formulario.dto.ts`), não como
enum Prisma — um enum Prisma vira tipo de *coluna*, não dá pra restringir
um valor dentro de um Json.

## Checklist

- [ ] Estado fechado (conjunto conhecido de valores) está modelado como
      `enum`, não `String` livre?
- [ ] Conceitos independentes (ex.: condição física vs. andamento de
      processo) estão em enums separados, não misturados num só?
- [ ] Novo valor de enum tem migration correspondente?
