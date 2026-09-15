import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

export const ANEXO_DIR = join(process.cwd(), 'uploads', 'solicitacoes');
if (!existsSync(ANEXO_DIR)) mkdirSync(ANEXO_DIR, { recursive: true });

const EXTENSAO_POR_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};

export const ANEXO_MULTER_OPTIONS = {
  storage: diskStorage({
    destination: ANEXO_DIR,
    filename: (_req, file, callback) => {
      const extensao = EXTENSAO_POR_MIME[file.mimetype] ?? extname(file.originalname);
      callback(null, `${randomUUID()}${extensao}`);
    },
  }),
  fileFilter: (_req: unknown, file: Express.Multer.File, callback: (error: Error | null, accept: boolean) => void) => {
    if (!EXTENSAO_POR_MIME[file.mimetype]) {
      callback(new BadRequestException('O anexo deve ser uma imagem (JPG/PNG) ou um PDF'), false);
      return;
    }
    callback(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
};
