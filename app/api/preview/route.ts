import { montarHtml } from '@/lib/email-template';
import { buscarPostergadas, diaReferenciaPadrao } from '@/lib/postergacao';

export const dynamic = 'force-dynamic';

/** Renderiza o e-mail de um colaborador direto no navegador, para conferência. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dia = searchParams.get('dia') || diaReferenciaPadrao();
  const colaboradorId = searchParams.get('colaboradorId');

  const grupos = await buscarPostergadas(dia);
  const grupo = colaboradorId
    ? grupos.find((g) => g.colaboradorId === colaboradorId)
    : grupos[0];

  if (!grupo) {
    return new Response(
      `<div style="font-family:system-ui;padding:40px;text-align:center;color:#64748b;">
         <h2 style="color:#0f172a;">Nada para pré-visualizar</h2>
         <p>Não há demandas postergadas para ${dia}.</p>
       </div>`,
      { headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }

  return new Response(montarHtml(grupo, dia), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
