import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

const EXTENSAO_POR_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

export function createUploadMulterOptions(subdir: string) {
  const dir = join(process.cwd(), 'uploads', subdir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  return {
    storage: diskStorage({
      destination: dir,
      filename: (_req, file, callback) => {
        const extensao = EXTENSAO_POR_MIME[file.mimetype] ?? extname(file.originalname);
        callback(null, `${randomUUID()}${extensao}`);
      },
    }),
    fileFilter: (_req: unknown, file: Express.Multer.File, callback: (error: Error | null, accept: boolean) => void) => {
      if (!EXTENSAO_POR_MIME[file.mimetype]) {
        callback(new BadRequestException('O arquivo deve ser uma imagem (JPG/PNG), PDF, DOC ou DOCX'), false);
        return;
      }
      callback(null, true);
    },
    limits: { fileSize: 10 * 1024 * 1024 },
  };
}

export function uploadDir(subdir: string) {
  return join(process.cwd(), 'uploads', subdir);
}
