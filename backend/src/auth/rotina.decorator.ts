import { SetMetadata } from '@nestjs/common';

export const ROTINA_KEY = 'rotina';
export const RequireRotina = (chave: string) => SetMetadata(ROTINA_KEY, chave);
