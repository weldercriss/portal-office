import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Cadastro de um usuário master: administração da própria plataforma, não um
 * colaborador — sem os campos de RH que `CreateUserDto` exige. O role é
 * sempre `MASTER`, decidido pelo service, nunca enviado pelo cliente.
 */
export class CreateMasterUserDto {
  @IsString()
  nome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  senha!: string;
}
