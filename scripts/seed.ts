/**
 * Dados de exemplo para conhecer o Radar: analistas e demandas com prazos
 * espalhados pelo mês corrente, incluindo casos já vencidos.
 *
 * Uso: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function dia(offset: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

const ANALISTAS = [
  { nome: 'Ana Ribeiro', email: 'ana.ribeiro@exemplo.com', equipe: 'Operações' },
  { nome: 'Bruno Carvalho', email: 'bruno.carvalho@exemplo.com', equipe: 'Financeiro' },
];

const DEMANDAS = [
  { a: 0, titulo: 'Enviar relatório financeiro', descricao: 'Consolidar os dados do Q4.', prioridade: 'CRITICA', categoria: 'Financeiro', prazo: -2 },
  { a: 0, titulo: 'Revisar contrato com fornecedor', descricao: 'Analisar cláusulas e enviar parecer.', prioridade: 'ALTA', categoria: 'Jurídico', prazo: -1 },
  { a: 0, titulo: 'Atualizar base de clientes', descricao: 'Incluir novos registros da regional.', prioridade: 'MEDIA', categoria: 'Comercial', prazo: 0 },
  { a: 0, titulo: 'Preparar apresentação da diretoria', prioridade: 'ALTA', categoria: 'Operações', prazo: 3 },
  { a: 1, titulo: 'Fechamento contábil do mês', descricao: 'Conferir lançamentos pendentes.', prioridade: 'CRITICA', categoria: 'Financeiro', prazo: -3 },
  { a: 1, titulo: 'Treinamento do time de suporte', prioridade: 'BAIXA', categoria: 'Operações', prazo: 5, status: 'EM_ANDAMENTO' },
  { a: 1, titulo: 'Conciliação bancária', prioridade: 'MEDIA', categoria: 'Financeiro', prazo: -1, status: 'CONCLUIDA' },
];

async function main() {
  const senhaHash = await bcrypt.hash('12345', 10);
  const criados = [];

  for (const a of ANALISTAS) {
    criados.push(
      await prisma.usuario.upsert({
        where: { email: a.email },
        update: { nome: a.nome, equipe: a.equipe },
        create: { ...a, senhaHash, perfil: 'ANALISTA' },
      }),
    );
  }
  console.log(`${criados.length} analistas prontos (senha: 12345).`);

  for (const d of DEMANDAS) {
    await prisma.demanda.create({
      data: {
        titulo: d.titulo,
        descricao: d.descricao ?? null,
        prioridade: d.prioridade,
        categoria: d.categoria ?? null,
        status: d.status ?? 'ABERTA',
        prazo: dia(d.prazo),
        autorId: criados[d.a].id,
        concluidaEm: d.status === 'CONCLUIDA' ? new Date() : null,
      },
    });
  }
  console.log(`${DEMANDAS.length} demandas criadas.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
