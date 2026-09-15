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

## Checklist

- [ ] Controller novo tem `@UseGuards(JwtAuthGuard, RotinaGuard)` e
      `@RequireRotina('<nome-da-rotina>')` na classe?
- [ ] Métodos de escrita (`POST`/`PATCH`/`DELETE`) têm
      `@UseGuards(RolesGuard)` + `@Roles('ADMIN')` quando a operação é
      restrita a administradores?
- [ ] Nenhuma verificação de role/rotina foi reimplementada manualmente no
      service?
