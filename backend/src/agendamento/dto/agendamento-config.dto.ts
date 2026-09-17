import { IsBoolean } from 'class-validator';

export class UpdateAgendamentoConfigDto {
  @IsBoolean()
  permiteSolicitacaoColaborador!: boolean;
}
