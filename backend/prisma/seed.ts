import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@portal-backoffice.local';
const ADMIN_SENHA = 'senha123';

// Master: administração da própria plataforma (não é colaborador). Mesma
// conta usada como padrão em produção (ver migration 20260917220100).
const MASTER_EMAIL = 'admin@suri.ai';
const MASTER_SENHA = '@@@@@@1234567890';

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

  const masterSenhaHash = await bcrypt.hash(MASTER_SENHA, 10);
  await prisma.user.upsert({
    where: { email: MASTER_EMAIL },
    update: { role: 'MASTER' },
    create: {
      nome: 'Master',
      email: MASTER_EMAIL,
      senhaHash: masterSenhaHash,
      role: 'MASTER',
      ativo: true,
      acessoPlataforma: true,
    },
  });

  console.log(`Seed concluído. Login admin: ${ADMIN_EMAIL} / ${ADMIN_SENHA}`);
  console.log(`Login master: ${MASTER_EMAIL} / ${MASTER_SENHA}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
