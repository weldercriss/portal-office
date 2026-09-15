# `User` concentra identidade de acesso e cadastro de colaborador

`User` tem quatro campos com funções distintas — não confunda um com o
outro ao escrever queries ou regras novas:

- `ativo` — ativação do registro (cadastro existe e está ativo).
- `acessoPlataforma` — autorização para login, padrão `false` no schema. Uma
  pessoa pode estar `ativo` e ainda não ter `acessoPlataforma`.
- `role` — perfil `ADMIN` ou `USER`.
- `statusColaborador` — situação de RH: `ATIVO`, `AFASTADO`, `FERIAS`,
  `DESLIGADO`.

Login, refresh e a estratégia JWT verificam existência, `ativo` e
`acessoPlataforma` — não apenas o perfil gravado no token (a estratégia
busca o usuário atual no banco a cada request). Qualquer query que decida se
alguém "pode entrar" ou "pode agir" deve considerar essas quatro dimensões
separadamente, não assumir que uma implica a outra.

Mudar `statusColaborador` para `DESLIGADO` tem efeito colateral real: o
serviço de usuários aciona a devolução das alocações de patrimônio da
pessoa, fora da transação do próprio cadastro. Uma migration ou service novo
que mexa em desligamento precisa considerar esse gatilho existente, não
duplicá-lo.

Permissões de funcionalidade não ficam no `User` diretamente: `Rotina`
representa a funcionalidade, `GroupRotina` concede por departamento, e
`UserRotinaOverride` concede ou bloqueia por exceção individual. Para
`ADMIN`, todas as rotinas ativas são resolvidas sem consultar essas tabelas.

## Checklist

- [ ] A query/regra nova trata `ativo`, `acessoPlataforma`, `role` e
      `statusColaborador` como campos independentes, sem assumir que um
      implica o outro?
- [ ] Uma mudança de `statusColaborador` para `DESLIGADO` não duplica o
      efeito colateral de devolução de patrimônio já existente?
- [ ] Permissão de funcionalidade passa por `Rotina`/`GroupRotina`/
      `UserRotinaOverride`, não por um campo novo solto em `User`?
