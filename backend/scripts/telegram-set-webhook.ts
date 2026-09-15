import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Registra no Telegram a URL que ele deve chamar quando alguém manda mensagem pro bot.
 * Precisa de uma URL PÚBLICA (https) — "localhost" não é alcançável pelos servidores do
 * Telegram. Para testar em dev, abra um túnel (ex.: ngrok http 3333) e use a URL dele.
 *
 * Uso: npm run telegram:set-webhook -- <url-publica-do-backend>
 *   Local com túnel:  npm run telegram:set-webhook -- https://abcd1234.ngrok-free.app
 *   Produção (Caddy):  npm run telegram:set-webhook -- https://portal.exemplo.com.br/api
 */
async function main() {
  const baseUrl = process.argv[2];
  if (!baseUrl) {
    console.error('Uso: npm run telegram:set-webhook -- <url-publica-do-backend>');
    process.exit(1);
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    console.error('TELEGRAM_WEBHOOK_SECRET não está definido no .env.');
    process.exit(1);
  }

  const config = await  prisma.telegramConfig.findFirst();
  if (!config?.botToken) {
    console.error('Nenhum bot do Telegram configurado ainda. Salve o token em Configurações > Telegram primeiro.');
    process.exit(1);
  }

  const url = `${baseUrl.replace(/\/$/, '')}/telegram/webhook/${secret}`;
  const resposta = await fetch(`https://api.telegram.org/bot${config.botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const corpo = (await resposta.json()) as { ok: boolean; description?: string };

  if (!corpo.ok) {
    console.error(`Telegram recusou o registro: ${corpo.description}`);
    process.exit(1);
  }

  console.log(`Webhook registrado com sucesso: ${url}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
