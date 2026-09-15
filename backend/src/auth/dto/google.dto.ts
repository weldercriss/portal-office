import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export const FINALIDADES_DESAFIO = ['LOGIN', 'VINCULO'] as const;
export type FinalidadeDesafio = (typeof FINALIDADES_DESAFIO)[number];

export class GoogleChallengeDto {
  @IsIn(FINALIDADES_DESAFIO)
  finalidade!: FinalidadeDesafio;
}

export class GoogleLoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8192)
  credential!: string;
}

export class GoogleLinkDto extends GoogleLoginDto {
  @IsString()
  @MinLength(6)
  senha!: string;
}
