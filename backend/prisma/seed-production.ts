import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 16 || password.includes('TROQUE-ME')) {
    throw new Error('Defina ADMIN_EMAIL e ADMIN_PASSWORD (minimo de 16 caracteres) para o seed de producao.');
  }

  await prisma.user.upsert({
    where: { email },
    // Repeated starts must never reset an existing password or elevate a user.
    update: {},
    create: {
      nome: process.env.ADMIN_NAME?.trim() || 'Administrador',
      email,
      senhaHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
      acessoPlataforma: true,
    },
  });
  console.log('Administrador inicial verificado. Nenhuma senha existente foi alterada.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
