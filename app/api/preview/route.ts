import { prisma } from '@/lib/prisma';
import { sessaoAtual } from '@/lib/auth';
import { diaParaDate } from '@/lib/datas';
import { montarHtml } from '@/lib/email-template';
import { buscarVencidas, diaReferenciaPadrao } from '@/lib/vencidas';

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

export async function GET(req: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return new Response('Não autenticado.', { status: 401 });

  const { searchParams } = new URL(req.url);
  const alertaId = searchParams.get('alertaId');

  if (alertaId) {
    const alerta = await prisma.alerta.findUnique({ where: { id: alertaId } });
    if (!alerta?.corpoHtml) return paginaVazia('Esta prévia não está mais disponível.');
    if (sessao.perfil !== 'ADMIN' && alerta.usuarioId !== sessao.sub) {
      return new Response('Sem permissão.', { status: 403 });
    }
    return new Response(alerta.corpoHtml, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const dia = searchParams.get('dia') || diaReferenciaPadrao();
  const pedido = searchParams.get('usuarioId') || sessao.sub;

  if (sessao.perfil !== 'ADMIN' && pedido !== sessao.sub) {
    return new Response('Sem permissão.', { status: 403 });
  }

  const grupos = await buscarVencidas(dia);
  const grupo = grupos.find((g) => g.usuarioId === pedido);
  if (grupo) {
    return new Response(montarHtml(grupo, dia), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  // Já disparado: recupera a prévia guardada.
  const alerta = await prisma.alerta.findUnique({
    where: { usuarioId_dataReferencia: { usuarioId: pedido, dataReferencia: diaParaDate(dia) } },
  });
  if (alerta?.corpoHtml) {
    return new Response(alerta.corpoHtml, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  return paginaVazia('Nenhuma demanda com prazo vencido.');
}
