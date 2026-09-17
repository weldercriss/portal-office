import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateTipoPlantaoDto } from './dto/create-tipo-plantao.dto';
import { UpdateTipoPlantaoDto } from './dto/update-tipo-plantao.dto';
import { TiposPlantaoService } from './tipos-plantao.service';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

@UseGuards(JwtAuthGuard)
@Controller('tipos-plantao')
export class TiposPlantaoController {
  constructor(private readonly tiposPlantaoService: TiposPlantaoService) {}

  @Get()
  findAll(@Query('all') all?: string) {
    return this.tiposPlantaoService.findAll(all === 'true');
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateTipoPlantaoDto, @Req() req: Request) {
    return this.tiposPlantaoService.create(dto, (req.user as UsuarioAutenticado).id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateTipoPlantaoDto, @Req() req: Request) {
    return this.tiposPlantaoService.update(id, dto, (req.user as UsuarioAutenticado).id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.tiposPlantaoService.remove(id);
  }

  @Delete(':id/permanent')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deletePermanently(@Param('id') id: string) {
    return this.tiposPlantaoService.deletePermanently(id);
  }
}
