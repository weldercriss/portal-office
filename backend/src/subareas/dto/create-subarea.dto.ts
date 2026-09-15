import { IsString, IsUUID } from 'class-validator';

export class CreateSubAreaDto {
  @IsString()
  nome!: string;

  @IsUUID()
  groupId!: string;
}
