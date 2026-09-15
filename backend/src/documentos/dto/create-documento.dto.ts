import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export enum TipoDocumentoColaboradorDto {
  CONTRATO = 'CONTRATO',
  COMPROVANTE = 'COMPROVANTE',
  POLITICA = 'POLITICA',
  HOLERITE = 'HOLERITE',
  ASSINADO = 'ASSINADO',
  OUTRO = 'OUTRO',
}

export class CreateDocumentoDto {
  @IsString()
  nome!: string;

  @IsEnum(TipoDocumentoColaboradorDto)
  tipo!: TipoDocumentoColaboradorDto;

  @IsOptional()
  @IsDateString()
  validade?: string;
}
