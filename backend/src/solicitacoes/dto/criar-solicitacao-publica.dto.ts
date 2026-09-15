import { IsObject } from 'class-validator';

export class CriarSolicitacaoPublicaDto {
  @IsObject()
  respostasFormulario!: Record<string, string | string[]>;
}
