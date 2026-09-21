import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { sessaoAtual } from '@/lib/auth';
import { paraDiaISO } from '@/lib/datas';
import { RelatorioPainel } from '@/components/RelatorioPainel';
import type { Demanda } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

/**
 * O relatório do painel em folha, para salvar como PDF pela impressão do
 * navegador. É uma página à parte porque a tela do painel tem menu, filtros e
 * gráficos interativos que não fazem sentido no papel.
 *
 * O período chega por `?de=&ate=`; sem ele, o relatório cobre todo o histórico,
 * como o "Todo o período" do seletor.
 */
export default async function PaginaRelatorio({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; rotulo?: string }>;
}) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/login');
  // O painel é da administração; o analista não tem essa visão consolidada.
  if (sessao.perfil !== 'ADMIN') redirect('/');

  const { de, ate, rotulo } = await searchParams;
  const dia = /^\d{4}-\d{2}-\d{2}$/;
  const intervalo = de && ate && dia.test(de) && dia.test(ate) ? { de, ate } : null;

  /*
   * Traz tudo e recorta no cliente com as mesmas funções da tela: os KPIs
   * comparam com o período anterior, que está fora do intervalo pedido.
   */
  const registros = await prisma.demanda.findMany({
    include: {
      autor: { select: { id: true, nome: true, email: true, equipe: true } },
    },
    orderBy: [{ prazo: 'asc' }, { criadoEm: 'asc' }],
  });

  const demandas = JSON.parse(JSON.stringify(registros)) as Demanda[];

  return (
    <RelatorioPainel
      demandas={demandas}
      hoje={paraDiaISO()}
      intervalo={intervalo}
      rotulo={rotulo ?? null}
      geradoPor={sessao.nome}
    />
  );
}
