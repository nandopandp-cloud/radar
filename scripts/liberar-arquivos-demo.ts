/**
 * Liga os recursos em avaliação — hoje, a área "Meus arquivos" e o anexar a
 * partir do Google Drive — na conta de demonstração.
 *
 * Só mexe nessa conta: nenhum outro usuário é lido ou alterado. Rodar duas
 * vezes não faz diferença, e `--desligar` volta atrás.
 *
 * Uso (banco de desenvolvimento):
 *   npm run db:liberar-arquivos-demo
 *   npm run db:liberar-arquivos-demo -- --desligar
 *
 * Em produção o `.env` do projeto aponta para o banco de dev e vence sobre o
 * shell, então a URL entra explicitamente — o mesmo motivo que levou
 * scripts/aplicar-migration.sh a trocar o arquivo de lugar:
 *   DATABASE_URL="<url do Neon>" npm run db:liberar-arquivos-demo
 */
import { PrismaClient } from '@prisma/client';

/* Sem DATABASE_URL no ambiente, cai no .env do projeto, como qualquer script. */
const prisma = new PrismaClient(
  process.env.DATABASE_URL
    ? { datasources: { db: { url: process.env.DATABASE_URL } } }
    : undefined,
);

/** A mesma conta criada por scripts/popular-gamificacao.ts. */
const EMAIL = 'demonstracao.perfil@exemplo.com';

async function main() {
  const ligar = !process.argv.includes('--desligar');

  const usuario = await prisma.usuario.findUnique({
    where: { email: EMAIL },
    select: { id: true, nome: true, recursosExperimentais: true },
  });

  if (!usuario) {
    console.log(`A conta ${EMAIL} não existe.`);
    console.log('Crie-a primeiro com: npm run db:popular-gamificacao');
    process.exitCode = 1;
    return;
  }

  if (usuario.recursosExperimentais === ligar) {
    console.log(`${usuario.nome} já está ${ligar ? 'com' : 'sem'} os recursos em avaliação.`);
    return;
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { recursosExperimentais: ligar },
  });

  console.log(`${usuario.nome}: recursos em avaliação ${ligar ? 'ligados' : 'desligados'}.`);
  if (ligar) {
    console.log('\nEntre como', EMAIL, '(senha: 12345) para ver:');
    console.log('  · a aba "Meus arquivos" na barra lateral');
    console.log('  · o botão "Escolher do Google Drive" ao anexar numa demanda');
  }
}

main()
  .catch((e) => { console.error('\nerro:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
