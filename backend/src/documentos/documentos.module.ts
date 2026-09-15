import { Module } from '@nestjs/common';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';

@Module({
  providers: [DocumentosService],
  controllers: [DocumentosController],
})
export class DocumentosModule {}
