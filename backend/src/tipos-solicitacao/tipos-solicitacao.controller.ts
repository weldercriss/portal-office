import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateTipoSolicitacaoDto } from './dto/create-tipo-solicitacao.dto';
import { UpdateTipoSolicitacaoDto } from './dto/update-tipo-solicitacao.dto';
import { TiposSolicitacaoService } from './tipos-solicitacao.service';

@UseGuards(JwtAuthGuard)
@Controller('tipos-solicitacao')
export class TiposSolicitacaoController {
  constructor(private readonly tiposSolicitacaoService: TiposSolicitacaoService) {}

  @Get()
  findAll(@Query('all') all?: string) {
    return this.tiposSolicitacaoService.findAll(all === 'true');
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateTipoSolicitacaoDto) {
    return this.tiposSolicitacaoService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateTipoSolicitacaoDto) {
    return this.tiposSolicitacaoService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.tiposSolicitacaoService.remove(id);
  }

  @Delete(':id/permanent')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deletePermanently(@Param('id') id: string) {
    return this.tiposSolicitacaoService.deletePermanently(id);
  }
}
