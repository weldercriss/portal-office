# Uploads e armazenamento de arquivos

Uploads usam `FileInterceptor` do NestJS/Multer com opções centralizadas por
domínio, não configuração solta em cada controller:

```ts
// backend/src/solicitacoes/solicitacoes.controller.ts
import { ANEXO_MULTER_OPTIONS } from './anexo.storage';

@UseInterceptors(FileInterceptor('anexo', ANEXO_MULTER_OPTIONS))
```

- Armazenamento compartilhado de documentos (colaboradores) aceita **JPG,
  PNG, PDF, DOC e DOCX** — ver `backend/src/common/upload.storage.ts`.
- Termo de patrimônio aceita **PDF/DOC/DOCX até 10 MB**, anexado à alocação
  (não ao cadastro do equipamento).
- No cadastro de colaborador, o upload é uma etapa separada, depois de salvar
  a pessoa — uma falha no upload não desfaz o cadastro. Siga essa ordem
  (salvar entidade primeiro, anexar arquivo depois) para qualquer fluxo novo
  que combine criação de registro + upload.
- Downloads passam por endpoint da aplicação (o arquivo não é servido
  estaticamente por URL pública direta).

## Checklist

- [ ] Tipos e tamanho aceitos foram definidos num arquivo `*.storage.ts` do
      domínio, reaproveitando `common/upload.storage.ts` quando fizer
      sentido, em vez de configuração solta no controller?
- [ ] Falha de upload não desfaz a criação da entidade principal, quando o
      upload é uma etapa posterior e opcional?
- [ ] Download passa por um endpoint autenticado, não por acesso direto ao
      arquivo?
