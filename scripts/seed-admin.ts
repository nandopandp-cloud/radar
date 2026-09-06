/**
 * Cria o usuário administrador e o colaborador de teste.
 * Idempotente: pode rodar quantas vezes quiser.
 *
 * Uso: npm run db:seed-admin
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
    update: { senhaHash, nome: NOME },
    create: { email: EMAIL, senhaHash, nome: NOME },
  });
  console.log(`Administrador pronto: ${usuario.email}`);

  // Colaborador de teste — recebe os alertas enquanto o time real não entra.
  const emailTeste = process.env.COLABORADOR_TESTE_EMAIL?.trim().toLowerCase();
  if (emailTeste) {
    const colab = await prisma.colaborador.upsert({
      where: { email: emailTeste },
      update: { ativo: true },
      create: {
        nome: process.env.COLABORADOR_TESTE_NOME?.trim() || 'Fernando',
        email: emailTeste,
        equipe: 'MSA',
      },
    });
    console.log(`Colaborador de teste pronto: ${colab.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
