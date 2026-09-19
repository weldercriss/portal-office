import { Module } from '@nestjs/common';
import { CategoriasDocumentoController } from './categorias-documento.controller';
import { CategoriasDocumentoService } from './categorias-documento.service';

@Module({
  providers: [CategoriasDocumentoService],
  controllers: [CategoriasDocumentoController],
})
export class CategoriasDocumentoModule {}
