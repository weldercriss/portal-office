import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CategoriasDocumentoService } from './categorias-documento.service';
import { CreateCategoriaDocumentoDto, UpdateCategoriaDocumentoDto } from './dto/categoria-documento.dto';

/** Catálogo configurável de categorias de documento (Contrato, Holerite...), usado na ficha do colaborador e na Central de Documentos. */
@UseGuards(JwtAuthGuard)
@Controller('categorias-documento')
export class CategoriasDocumentoController {
  constructor(private readonly categoriasService: CategoriasDocumentoService) {}

  @Get()
  findAll(@Query('all') all?: string) {
    return this.categoriasService.findAll(all === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriasService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateCategoriaDocumentoDto) {
    return this.categoriasService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateCategoriaDocumentoDto) {
    return this.categoriasService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.categoriasService.remove(id);
  }

  @Delete(':id/permanent')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deletePermanently(@Param('id') id: string) {
    return this.categoriasService.deletePermanently(id);
  }
}
