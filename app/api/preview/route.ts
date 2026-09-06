import { prisma } from '@/lib/prisma';
import { diaParaDate } from '@/lib/datas';
import { montarHtml } from '@/lib/email-template';
import { buscarPostergadas, diaReferenciaPadrao } from '@/lib/postergacao';

export const dynamic = 'force-dynamic';

function paginaVazia(mensagem: string): Response {
  return new Response(
    `<div style="font-family:system-ui;padding:40px;text-align:center;color:#64748b;">
       <h2 style="color:#0f172a;">Nada para pré-visualizar</h2>
       <p>${mensagem}</p>
     </div>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

/**
 * Renderiza o e-mail de um colaborador no navegador.
 *
 * Com `alertaId`, mostra a prévia exata que foi gerada no disparo (guardada no
 * banco). Sem ele, monta a mensagem a partir do estado atual das demandas.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const alertaId = searchParams.get('alertaId');

  if (alertaId) {
    const alerta = await prisma.alerta.findUnique({ where: { id: alertaId } });
    if (!alerta?.corpoHtml) {
      return paginaVazia('Esta prévia não está mais disponível.');
    }
    return new Response(alerta.corpoHtml, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const dia = searchParams.get('dia') || diaReferenciaPadrao();
  const colaboradorId = searchParams.get('colaboradorId');

  // Se o disparo já rodou, as demandas foram movidas e a busca não acha nada.
  // Nesse caso recuperamos a prévia guardada.
  if (colaboradorId) {
    const grupos = await buscarPostergadas(dia);
    const grupo = grupos.find((g) => g.colaboradorId === colaboradorId);
    if (grupo) {
      return new Response(montarHtml(grupo, dia), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    const alerta = await prisma.alerta.findUnique({
      where: {
        colaboradorId_dataReferencia: {
          colaboradorId,
          dataReferencia: diaParaDate(dia),
        },
      },
    });
    if (alerta?.corpoHtml) {
      return new Response(alerta.corpoHtml, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }
    return paginaVazia(`Não há demandas postergadas para ${dia}.`);
  }

  const grupos = await buscarPostergadas(dia);
  if (!grupos[0]) return paginaVazia(`Não há demandas postergadas para ${dia}.`);

  return new Response(montarHtml(grupos[0], dia), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
