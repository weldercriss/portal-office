import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateTipoPlantaoDto } from './dto/create-tipo-plantao.dto';
import { UpdateTipoPlantaoDto } from './dto/update-tipo-plantao.dto';
import { TiposPlantaoService } from './tipos-plantao.service';

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
  create(@Body() dto: CreateTipoPlantaoDto) {
    return this.tiposPlantaoService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateTipoPlantaoDto) {
    return this.tiposPlantaoService.update(id, dto);
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
