import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateHistoricoDto, UpdateHistoricoDto } from './dto/historico.dto';
import { HistoricoService } from './historico.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('colaboradores/:userId/historico')
export class HistoricoController {
  constructor(private readonly historicoService: HistoricoService) {}

  @Get()
  findAll(@Param('userId') userId: string) {
    return this.historicoService.findAll(userId);
  }

  @Post()
  create(@Param('userId') userId: string, @Body() dto: CreateHistoricoDto) {
    return this.historicoService.create(userId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHistoricoDto) {
    return this.historicoService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.historicoService.remove(id);
  }
}
