# Estrutura de módulo e responsabilidade do controller

Como organizar um módulo NestJS em `backend/src/` e onde cada tipo de lógica
deve morar.

## Um módulo por domínio

`backend/src/<dominio>/` já segue esse padrão (`plantoes`, `solicitacoes`,
`patrimonio`, `agendamento` etc.) — mantenha. Cada módulo tem:

```
<dominio>/
├── dto/
│   ├── create-<dominio>.dto.ts
│   └── update-<dominio>.dto.ts
├── <dominio>.controller.ts   # rotas HTTP e guards, sem lógica de negócio
├── <dominio>.service.ts      # lógica de negócio e acesso ao Prisma
├── <dominio>.service.spec.ts
└── <dominio>.module.ts
```

Todo módulo novo precisa ser registrado em `backend/src/app.module.ts` — sem
isso o Nest não carrega os providers/controllers dele.

## Controller fino, service com a lógica

O controller só traduz HTTP → chamada de método, com os guards e decorators
de permissão. Nada de regra de negócio ou acesso a `PrismaService` dentro
dele — é o que já acontece em `solicitacoes.controller.ts` e
`plantoes.controller.ts`:

```ts
// backend/src/plantoes/plantoes.controller.ts
@Post()
@UseGuards(RolesGuard)
@Roles('ADMIN')
create(@Body() dto: CreatePlantaoDto, @Req() req: Request) {
  return this.plantoesService.create(dto, (req.user as UsuarioAutenticado).id);
}
```

Se uma feature nova não se encaixa em nenhum módulo existente, crie um
módulo novo — não injete lógica de um domínio dentro do controller/service de
outro.

## Checklist

- [ ] Lógica de negócio está no service, não no controller?
- [ ] Módulo novo foi registrado em `app.module.ts`?
- [ ] Feature nova está no módulo certo, não misturada em outro domínio?
