import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateTelegramTipoDto {
  @IsOptional()
  @IsBoolean()
  enviar?: boolean;

  @IsOptional()
  @IsBoolean()
  enviarGrupo?: boolean;
}
