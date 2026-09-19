import { IsObject } from 'class-validator';

export class ResponderPesquisaDto {
  /** { [campoId]: string | number } — chaves são os ids de Pesquisa.campos. */
  @IsObject()
  respostas!: Record<string, unknown>;
}
