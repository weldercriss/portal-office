import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateTemplateFormularioDto } from './dto/create-template-formulario.dto';
import { TemplatesFormularioService } from './templates-formulario.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('templates-formulario')
export class TemplatesFormularioController {
  constructor(private readonly templatesFormularioService: TemplatesFormularioService) {}

  @Get()
  findAll() {
    return this.templatesFormularioService.findAll();
  }

  @Post()
  create(@Body() dto: CreateTemplateFormularioDto) {
    return this.templatesFormularioService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.templatesFormularioService.remove(id);
  }
}
