# Guards: JwtAuthGuard, RotinaGuard e RolesGuard

Três guards compõem o controle de acesso do backend — combine-os conforme a
operação, não crie verificação manual de permissão dentro do service.

- `JwtAuthGuard` — exige usuário autenticado (token válido).
- `RotinaGuard` + `@RequireRotina('<nome>')` — exige que o usuário tenha a
  rotina liberada (via departamento/`GroupRotina` ou exceção individual em
  `UserRotinaOverride`). Aplicado no nível do controller, cobre leitura e
  escrita do módulo inteiro.
- `RolesGuard` + `@Roles('ADMIN')` — exige o perfil `ADMIN`. Aplicado por
  método, normalmente só nas operações de escrita.

O padrão real, de `backend/src/plantoes/plantoes.controller.ts`:

```ts
@UseGuards(JwtAuthGuard, RotinaGuard)
@RequireRotina('plantoes')
@Controller('plantoes')
export class PlantoesController {
  @Get()
  findAll(/* ... */) { /* qualquer um com a rotina pode consultar */ }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(/* ... */) { /* só ADMIN pode escrever */ }
}
```

Ou seja: guard de rotina na classe (todo o módulo exige a permissão), guard
de role só nos métodos que exigem `ADMIN`. Não inverta — não coloque
`RolesGuard` na classe se existe operação de leitura que outros perfis também
devem acessar.

## Hierarquia de papéis: `USER < ADMIN < MASTER`

`Role` tem três valores. `MASTER` é administração da própria plataforma (não
é colaborador — ver `AI/CONTEXT.md#3-identidade-e-permissões`), acima de
`ADMIN`. A hierarquia é resolvida em `backend/src/auth/roles.util.ts`
(`satisfazRole(role, minimo)` e `ehAdminOuSuperior(role)`), nunca por
comparação direta de string:

- `RolesGuard` já usa `satisfazRole` — `@Roles('ADMIN')` deixa passar `ADMIN`
  **e** `MASTER` automaticamente; `@Roles('MASTER')` (ex.:
  `logs-aplicacao.controller.ts`) só deixa passar `MASTER`. Não é preciso
  escrever `@Roles('ADMIN', 'MASTER')`.
- Qualquer checagem manual de "é admin" ou "é dono ou admin" dentro de
  service/controller usa `ehAdminOuSuperior(usuario.role)`, nunca
  `usuario.role === 'ADMIN'`/`!== 'ADMIN'` — senão um `MASTER` fica de fora
  dessa checagem específica mesmo passando no guard da rota. Exemplos reais:
  `PermissoesService.resolveRotinas` (bypass total de rotina),
  `SolicitacoesService`/`DocumentosService`/`AlocacoesService` (dono ou
  admin acessa um recurso de terceiro).
- O frontend espelha isso em `satisfazRole` (`frontend/src/types/auth.types.ts`)
  — mesma regra: nunca `user.role === 'ADMIN'` solto quando o objetivo é "é
  admin ou mais".
- Um endpoint exclusivo de `MASTER` (não herdado por `ADMIN`) precisa mesmo
  assim excluir explicitamente quem não é master de enxergar o recurso — ver
  `UsersService.findAll`/`findOne`/`update`/`remove` (um `ADMIN` recebe 404,
  igual a um id inexistente, para um usuário `MASTER`, nunca 403).

## Checklist

- [ ] Controller novo tem `@UseGuards(JwtAuthGuard, RotinaGuard)` e
      `@RequireRotina('<nome-da-rotina>')` na classe?
- [ ] Métodos de escrita (`POST`/`PATCH`/`DELETE`) têm
      `@UseGuards(RolesGuard)` + `@Roles('ADMIN')` quando a operação é
      restrita a administradores?
- [ ] Nenhuma verificação de role/rotina foi reimplementada manualmente no
      service?
- [ ] Checagem manual de "é admin" usa `ehAdminOuSuperior`/`satisfazRole`,
      não `role === 'ADMIN'` direto?
