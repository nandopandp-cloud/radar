/**
 * Cria um analista de demonstração e popula a gamificação dele, para conferir
 * a tela de perfil com conteúdo real em vez de zeros.
 *
 * Regra de ouro: este script NUNCA apaga nada e NUNCA toca em quem já existe.
 * Ele cria o próprio usuário (um e-mail reservado) e escreve apenas linhas
 * ligadas a esse usuário. Rodar duas vezes não duplica nem sobrescreve: se a
 * conta já tiver dados, o script informa e sai.
 *
 * Uso: npm run db:popular-gamificacao
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Conta exclusiva deste script. Não é usada por nenhuma pessoa real. */
const EMAIL = 'demonstracao.perfil@exemplo.com';
const NOME = 'Marina Duarte (demonstração)';
const SENHA = '12345';

/** Dias ativos a criar, contando de hoje para trás. */
const DIAS_ATIVOS = 47;

/** Quantos dos últimos dias formam a ofensiva corrente, sem buracos. */
const OFENSIVA = 12;

/** Demandas concluídas: o bastante para desbloquear parte das conquistas. */
const CONCLUIDAS = 28;

function diaUTC(offset: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

async function main() {
  const existente = await prisma.usuario.findUnique({
    where: { email: EMAIL },
    select: { id: true, nome: true },
  });

  if (existente) {
    const [dias, demandas] = await Promise.all([
      prisma.diaAtivo.count({ where: { usuarioId: existente.id } }),
      prisma.demanda.count({ where: { autorId: existente.id } }),
    ]);

    if (dias > 0 || demandas > 0) {
      console.log(`A conta ${EMAIL} já existe e já tem dados:`);
      console.log(`  ${dias} dias ativos, ${demandas} demandas\n`);
      console.log('Nada foi alterado — este script não apaga nem sobrescreve.');
      console.log(`Entre como ${EMAIL} (senha: ${SENHA}) e abra "Meu perfil".`);
      return;
    }
  }

  /* A conta é criada pelo próprio script. Nenhum usuário existente é lido,
     alterado ou apagado em nenhum momento. */
  const usuario = existente ?? await prisma.usuario.create({
    data: {
      nome: NOME,
      email: EMAIL,
      senhaHash: await bcrypt.hash(SENHA, 10),
      perfil: 'ANALISTA',
    },
    select: { id: true, nome: true },
  });

  console.log(`Analista de demonstração: ${usuario.nome}`);
  console.log(`   ${EMAIL} (senha: ${SENHA})\n`);

  /* Dias ativos: a ofensiva corrente é contínua; o resto fica espalhado para
     o mapa de calor não virar um bloco sólido. */
  const dias = new Set<number>();
  for (let i = 0; i < OFENSIVA; i += 1) dias.add(-i);
  let salto = OFENSIVA;
  while (dias.size < DIAS_ATIVOS && salto < 180) {
    dias.add(-salto);
    salto += 1 + Math.floor(Math.random() * 3);
  }

  await prisma.diaAtivo.createMany({
    data: Array.from(dias).map((offset) => ({
      usuarioId: usuario.id,
      dia: diaUTC(offset),
      acoes: 1 + Math.floor(Math.random() * 5),
    })),
    skipDuplicates: true,
  });
  console.log(`  ${dias.size} dias ativos (ofensiva corrente de ${OFENSIVA} dias)`);

  /* Demandas concluídas: alimentam as conquistas. A missão da semana conta
     por `atualizadoEm`, que o Prisma controla sozinho (@updatedAt) — como
     estas nascem agora, caem na semana corrente e a missão aparece com
     progresso. */
  await prisma.demanda.createMany({
    data: Array.from({ length: CONCLUIDAS }, (_, i) => ({
      autorId: usuario.id,
      titulo: `Demanda de demonstração ${i + 1}`,
      status: 'CONCLUIDA' as const,
      prioridade: 'MEDIA' as const,
      prazo: diaUTC(-(i % 30)),
      concluidaEm: diaUTC(-(i % 30)),
    })),
  });
  console.log(`  ${CONCLUIDAS} demandas concluídas\n`);

  console.log('Pronto. Para ver a tela cheia:');
  console.log(`  1. Saia da sua conta`);
  console.log(`  2. Entre como ${EMAIL} (senha: ${SENHA})`);
  console.log(`  3. Abra "Meu perfil"\n`);
  console.log('As conquistas, missões e o XP são calculados no primeiro acesso,');
  console.log('a partir desses números — a tela não inventa nada.');
}

main()
  .catch((e) => { console.error('\nerro:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
