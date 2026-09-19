import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export const TIPOS_CAMPO_FORMULARIO = ['TEXTO', 'NUMERO', 'DATA', 'SELECAO', 'ARQUIVO'] as const;
export type TipoCampoFormulario = (typeof TIPOS_CAMPO_FORMULARIO)[number];

export class CampoFormularioDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsIn(TIPOS_CAMPO_FORMULARIO)
  tipo!: TipoCampoFormulario;

  @IsOptional()
  @IsBoolean()
  obrigatorio?: boolean;

  /** Mostra a resposta direto na listagem de solicitações, sem precisar abrir o drill-down. */
  @IsOptional()
  @IsBoolean()
  exibirNaListagem?: boolean;

  /** Só usado quando TipoSolicitacao.ehPreAdmissao=true: qual campo vira o nome/e-mail do User criado. */
  @IsOptional()
  @IsIn(['NOME', 'EMAIL'])
  mapeamento?: 'NOME' | 'EMAIL';

  @ValidateIf((campo: CampoFormularioDto) => campo.tipo === 'SELECAO')
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  opcoes?: string[];
}
