import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RequireRotina } from '../auth/rotina.decorator';
import { RotinaGuard } from '../auth/rotina.guard';
import { AgendamentoConfigService } from './agendamento-config.service';
import { UpdateAgendamentoConfigDto } from './dto/agendamento-config.dto';

@UseGuards(JwtAuthGuard, RotinaGuard)
@RequireRotina('agendamentos')
@Controller('v1/agendamento/config')
export class AgendamentoConfigController {
  constructor(private readonly configService: AgendamentoConfigService) {}

  @Get()
  get() {
    return this.configService.get();
  }

  @Put()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Body() dto: UpdateAgendamentoConfigDto) {
    return this.configService.update(dto);
  }
}
