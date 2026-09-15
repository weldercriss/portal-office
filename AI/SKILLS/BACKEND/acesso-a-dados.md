# Acesso a dados via PrismaService, sem camada de Repository

Este backend **não tem** uma camada de Repository separada. O `Service`
injeta `PrismaService` diretamente e chama o Prisma Client nele mesmo:

```ts
// backend/src/solicitacoes/solicitacoes.service.ts
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SolicitacoesService {
  constructor(private readonly prisma: PrismaService) {}
  // ...
}
```

Não crie uma pasta `repositories/` ou uma classe `<Dominio>Repository` — isso
adicionaria uma camada de indireção que não existe em nenhum outro módulo do
projeto e quebraria a consistência com o resto do código. Se a query for
usada em mais de um lugar, extraia um método privado ou um util dentro do
próprio service/domínio, não uma nova camada.

## Checklist

- [ ] O service injeta `PrismaService` diretamente, sem passar por uma
      camada de Repository nova?
- [ ] Query repetida dentro do mesmo service foi extraída como método
      privado, sem criar abstração desnecessária?
