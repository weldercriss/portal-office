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

## Checklist

- [ ] Estado fechado (conjunto conhecido de valores) está modelado como
      `enum`, não `String` livre?
- [ ] Conceitos independentes (ex.: condição física vs. andamento de
      processo) estão em enums separados, não misturados num só?
- [ ] Novo valor de enum tem migration correspondente?
