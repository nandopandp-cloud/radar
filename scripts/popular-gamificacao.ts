/**
 * Popula dados de gamificação num analista de exemplo, para conferir a tela de
 * perfil com conteúdo real em vez de zeros.
 *
 * Só mexe em quem tem e-mail @exemplo.com — os analistas criados por
 * `npm run db:seed`. Nunca toca em gente de verdade.
 *
 * Uso:
 *   npm run db:popular-gamificacao
 *   npm run db:popular-gamificacao -- --email=ana.ribeiro@exemplo.com
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Guarda-chuva: só contas de demonstração entram aqui. */
const DOMINIO_EXEMPLO = '@exemplo.com';

/** Dias ativos a criar, contando de hoje para trás. */
const DIAS_ATIVOS = 47;

/** Quantos dos últimos dias formam a ofensiva corrente, sem buracos. */
const OFENSIVA = 12;

function diaUTC(offset: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith('--email='));
  const email = arg?.split('=')[1];

  const alvo = email
    ? await prisma.usuario.findUnique({ where: { email } })
    : await prisma.usuario.findFirst({
        where: { email: { endsWith: DOMINIO_EXEMPLO }, perfil: 'ANALISTA' },
        orderBy: { criadoEm: 'asc' },
      });

  if (!alvo) {
    throw new Error(
      email
        ? `Usuário ${email} não encontrado.`
        : `Nenhum analista de exemplo encontrado. Rode antes: npm run db:seed`,
    );
  }

  if (!alvo.email.endsWith(DOMINIO_EXEMPLO)) {
    throw new Error(
      `${alvo.email} não é uma conta de demonstração. Este script só mexe em ${DOMINIO_EXEMPLO}, ` +
        'para nunca alterar dados de uma pessoa real.',
    );
  }

  console.log(`Populando gamificação de ${alvo.nome} (${alvo.email})…\n`);

  /* Dias ativos: a ofensiva corrente é contínua; o resto fica espalhado para
     o mapa de calor não ficar com cara de bloco sólido. */
  const dias = new Set<number>();
  for (let i = 0; i < OFENSIVA; i += 1) dias.add(-i);
  let salto = OFENSIVA;
  while (dias.size < DIAS_ATIVOS && salto < 180) {
    dias.add(-salto);
    salto += 1 + Math.floor(Math.random() * 3);
  }

  await prisma.diaAtivo.deleteMany({ where: { usuarioId: alvo.id } });
  await prisma.diaAtivo.createMany({
    data: Array.from(dias).map((offset) => ({
      usuarioId: alvo.id,
      dia: diaUTC(offset),
      acoes: 1 + Math.floor(Math.random() * 5),
    })),
    skipDuplicates: true,
  });
  console.log(`  ${dias.size} dias ativos (ofensiva corrente de ${OFENSIVA} dias)`);

  /* Demandas concluídas: alimentam as conquistas. A missão da semana conta
     por `atualizadoEm`, que o Prisma controla sozinho (@updatedAt) — como
     estas nascem agora, todas caem na semana corrente, que é o que queremos
     para a missão aparecer com progresso. */
  const jaTem = await prisma.demanda.count({ where: { autorId: alvo.id, status: 'CONCLUIDA' } });
  const criar = Math.max(0, 28 - jaTem);
  if (criar > 0) {
    await prisma.demanda.createMany({
      data: Array.from({ length: criar }, (_, i) => ({
        autorId: alvo.id,
        titulo: `Demanda concluída ${i + 1}`,
        status: 'CONCLUIDA' as const,
        prioridade: 'MEDIA' as const,
        prazo: diaUTC(-(i % 30)),
        concluidaEm: diaUTC(-(i % 30)),
      })),
    });
  }
  console.log(`  ${jaTem + criar} demandas concluídas`);

  /* Limpa a gamificação anterior para o cálculo rodar do zero: carregarPerfil
     credita XP uma única vez por missão, então sobras falseariam o total. */
  await prisma.conquista.deleteMany({ where: { usuarioId: alvo.id } });
  await prisma.missao.deleteMany({ where: { usuarioId: alvo.id } });
  await prisma.progresso.deleteMany({ where: { usuarioId: alvo.id } });
  console.log('  gamificação zerada — será recalculada no primeiro acesso\n');

  console.log('Pronto. Para ver a tela cheia:');
  console.log(`  1. Saia da sua conta`);
  console.log(`  2. Entre como ${alvo.email} (senha: 12345)`);
  console.log(`  3. Abra "Meu perfil"\n`);
  console.log('As conquistas, missões e o XP são calculados no primeiro acesso,');
  console.log('a partir desses números — nada é inventado pela tela.');
}

main()
  .catch((e) => { console.error('\nerro:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
