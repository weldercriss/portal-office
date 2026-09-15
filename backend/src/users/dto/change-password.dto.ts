import { IsOptional, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  /** Dispensada apenas para quem ainda não tem senha, caso do acesso via Google. */
  @IsOptional()
  @IsString()
  senhaAtual?: string;

  @IsString()
  @MinLength(6)
  novaSenha!: string;
}