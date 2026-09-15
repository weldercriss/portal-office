import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@portal-backoffice.local';
const ADMIN_SENHA = 'senha123';

async function main() {
  const senhaHash = await bcrypt.hash(ADMIN_SENHA, 10);

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { senhaHash, role: 'ADMIN', ativo: true, acessoPlataforma: true },
    create: {
      nome: 'Administrador',
      email: ADMIN_EMAIL,
      senhaHash,
      role: 'ADMIN',
      acessoPlataforma: true,
    },
  });

  console.log(`Seed concluído. Login admin: ${ADMIN_EMAIL} / ${ADMIN_SENHA}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
