import { Module } from '@nestjs/common';
import { TemplatesFormularioController } from './templates-formulario.controller';
import { TemplatesFormularioService } from './templates-formulario.service';

@Module({
  providers: [TemplatesFormularioService],
  controllers: [TemplatesFormularioController],
})
export class TemplatesFormularioModule {}
