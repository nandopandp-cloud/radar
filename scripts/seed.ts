/**
 * Popula o banco com dados de exemplo para conhecer o Radar MSA.
 * Uso: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function diaISO(offset: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return new Date(d.toISOString().slice(0, 10) + 'T00:00:00.000Z');
}

const PESSOAS = [
  { nome: 'Ana Ribeiro', email: 'ana.ribeiro@exemplo.com', equipe: 'Operações' },
  { nome: 'Bruno Carvalho', email: 'bruno.carvalho@exemplo.com', equipe: 'Operações' },
  { nome: 'Carla Menezes', email: 'carla.menezes@exemplo.com', equipe: 'Atendimento' },
];

const DEMANDAS = [
  { p: 0, titulo: 'Revisar contrato do cliente Alfa', descricao: 'Cláusulas 4 e 7 pendentes de validação jurídica.', prioridade: 'CRITICA', dias: -2, solicitante: 'Diretoria', origem: 'TEAMS' },
  { p: 0, titulo: 'Fechar relatório mensal de SLA', descricao: 'Consolidar os indicadores de agosto.', prioridade: 'ALTA', dias: -1, solicitante: 'Gerência', origem: 'MANUAL' },
  { p: 0, titulo: 'Atualizar planilha de capacidade', prioridade: 'BAIXA', dias: 0, origem: 'MANUAL' },
  { p: 1, titulo: 'Corrigir integração do webhook de faturamento', descricao: 'Erros 500 intermitentes desde segunda-feira.', prioridade: 'CRITICA', dias: -3, solicitante: 'Financeiro', origem: 'GOOGLE_CHAT' },
  { p: 1, titulo: 'Responder chamado #4821', prioridade: 'MEDIA', dias: -1, solicitante: 'Suporte', origem: 'TEAMS', status: 'EM_ANDAMENTO' },
  { p: 2, titulo: 'Ligar para o cliente Beta sobre a renovação', descricao: 'Contrato vence no fim do mês.', prioridade: 'ALTA', dias: -1, solicitante: 'Comercial', origem: 'GOOGLE_CHAT' },
  { p: 2, titulo: 'Organizar a base de FAQs do atendimento', prioridade: 'BAIXA', dias: 0, origem: 'MANUAL' },
  { p: 2, titulo: 'Enviar pesquisa de satisfação da semana', prioridade: 'MEDIA', dias: -1, origem: 'MANUAL', status: 'CONCLUIDA' },
];

async function main() {
  console.log('Limpando dados anteriores…');
  await prisma.alerta.deleteMany();
  await prisma.demanda.deleteMany();
  await prisma.colaborador.deleteMany();

  const criados = [];
  for (const pessoa of PESSOAS) {
    criados.push(await prisma.colaborador.create({ data: pessoa }));
  }
  console.log(`${criados.length} colaboradores criados.`);

  for (const d of DEMANDAS) {
    await prisma.demanda.create({
      data: {
        titulo: d.titulo,
        descricao: d.descricao ?? null,
        prioridade: d.prioridade,
        status: d.status ?? 'ABERTA',
        origem: d.origem,
        solicitante: d.solicitante ?? null,
        dataPrevista: diaISO(d.dias),
        colaboradorId: criados[d.p].id,
        concluidaEm: d.status === 'CONCLUIDA' ? new Date() : null,
      },
    });
  }
  console.log(`${DEMANDAS.length} demandas criadas.`);
  console.log('\nPronto! Rode `npm run dev` e abra http://localhost:3000');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
