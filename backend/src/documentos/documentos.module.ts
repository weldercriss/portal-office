import { Module } from '@nestjs/common';
import { DocumentosController, DocumentosResumoController } from './documentos.controller';
import { DocumentosService } from './documentos.service';

@Module({
  providers: [DocumentosService],
  controllers: [DocumentosController, DocumentosResumoController],
})
export class DocumentosModule {}
