/**
 * Cria (ou atualiza) o usuário administrador.
 * Idempotente: pode rodar quantas vezes quiser.
 *
 * Uso: ADMIN_SENHA="..." npm run db:seed-admin
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase() || 'admins@msa.com';
const SENHA = process.env.ADMIN_SENHA || '12345';
const NOME = process.env.ADMIN_NOME?.trim() || 'Administrador MSA';

async function main() {
  const senhaHash = await bcrypt.hash(SENHA, 10);

  const usuario = await prisma.usuario.upsert({
    where: { email: EMAIL },
    update: { senhaHash, nome: NOME, perfil: 'ADMIN', ativo: true },
    create: { email: EMAIL, senhaHash, nome: NOME, perfil: 'ADMIN' },
  });
  console.log(`Administrador pronto: ${usuario.email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
