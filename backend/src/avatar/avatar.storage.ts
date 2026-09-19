import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

export const AVATAR_DIR = join(process.cwd(), 'uploads', 'avatares');
if (!existsSync(AVATAR_DIR)) mkdirSync(AVATAR_DIR, { recursive: true });

const EXTENSAO_POR_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

export const AVATAR_MULTER_OPTIONS = {
  storage: diskStorage({
    destination: AVATAR_DIR,
    filename: (_req, file, callback) => {
      const extensao = EXTENSAO_POR_MIME[file.mimetype] ?? extname(file.originalname);
      callback(null, `${randomUUID()}${extensao}`);
    },
  }),
  fileFilter: (_req: unknown, file: Express.Multer.File, callback: (error: Error | null, accept: boolean) => void) => {
    if (!EXTENSAO_POR_MIME[file.mimetype]) {
      callback(new BadRequestException('A foto deve ser uma imagem JPG ou PNG'), false);
      return;
    }
    callback(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
};
