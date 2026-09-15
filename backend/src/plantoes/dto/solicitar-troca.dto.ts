import { IsString } from 'class-validator';

export class SolicitarTrocaDto {
  @IsString()
  plantaoDestinoId!: string;
}
