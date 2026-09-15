# DTOs com class-validator, nunca `any`

Toda entrada de controller é tipada por um DTO com decorators de
`class-validator`, não por um objeto solto ou `any`:

```ts
// backend/src/solicitacoes/dto/create-solicitacao.dto.ts
export class CreateSolicitacaoDto {
  @IsOptional()
  @IsString()
  responsavelId?: string | null;

  @IsString()
  tipoId!: string;

  @IsDateString()
  dataInicio!: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;
}
```

- Campo opcional: `@IsOptional()` antes do validador de tipo.
- Data: `@IsDateString()`, não `@IsString()` solto.
- `create-<dominio>.dto.ts` e `update-<dominio>.dto.ts` ficam em `dto/`,
  próximos ao controller que os usa.
- `any` não é aceito em lugar nenhum do backend — se o tipo genuinamente não
  é conhecido (payload externo, webhook), tipe como `unknown` e faça a
  validação/narrowing explícita antes de usar.

## Checklist

- [ ] Toda entrada de body/query tem um DTO com `class-validator`?
- [ ] Nenhum `any` foi introduzido (usar `unknown` + narrowing quando o tipo
      não é conhecido)?
- [ ] Campos opcionais estão marcados com `@IsOptional()`?
