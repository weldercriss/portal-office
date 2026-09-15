import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

export const TERMO_DIR = join(process.cwd(), 'uploads', 'patrimonio');
if (!existsSync(TERMO_DIR)) mkdirSync(TERMO_DIR, { recursive: true });

/**
 * O termo assinado costuma voltar digitalizado em PDF, mas o RH também guarda o
 * .docx original — por isso os formatos do Word entram junto.
 */
const EXTENSAO_POR_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

export const TERMO_MULTER_OPTIONS = {
  storage: diskStorage({
    destination: TERMO_DIR,
    filename: (_req, file, callback) => {
      const extensao = EXTENSAO_POR_MIME[file.mimetype] ?? extname(file.originalname);
      callback(null, `${randomUUID()}${extensao}`);
    },
  }),
  fileFilter: (_req: unknown, file: Express.Multer.File, callback: (error: Error | null, accept: boolean) => void) => {
    if (!EXTENSAO_POR_MIME[file.mimetype]) {
      callback(new BadRequestException('O termo deve ser um arquivo PDF, DOC ou DOCX'), false);
      return;
    }
    callback(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
};
