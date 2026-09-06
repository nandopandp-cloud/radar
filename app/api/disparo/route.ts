import { NextResponse } from 'next/server';
import { sessaoAtual } from '@/lib/auth';
import { dispararAlertas } from '@/lib/disparo';
import { smtpConfigurado, verificarSmtp } from '@/lib/mailer';
import { buscarVencidas, diaReferenciaPadrao } from '@/lib/vencidas';

export const dynamic = 'force-dynamic';

/** Prévia do que seria enviado, sem enviar nada. */
export async function GET(req: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dia = searchParams.get('dia') || diaReferenciaPadrao();
  const todos = await buscarVencidas(dia);

  // Analista só enxerga o próprio alerta.
  const grupos = sessao.perfil === 'ADMIN' ? todos : todos.filter((g) => g.usuarioId === sessao.sub);
  const smtp = await verificarSmtp();

  return NextResponse.json({
    diaReferencia: dia,
    modo: smtpConfigurado() ? 'SMTP' : 'PREVIEW',
    smtp,
    totalAutores: grupos.length,
    totalDemandas: grupos.reduce((acc, g) => acc + g.demandas.length, 0),
    grupos,
  });
}

export async function POST(req: Request) {
  // O agendador externo autentica por CRON_SECRET; a interface, por sessão.
  const segredo = process.env.CRON_SECRET?.trim();
  const enviado =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    req.headers.get('x-cron-secret');

  const viaCron = Boolean(segredo && enviado === segredo);

  if (!viaCron) {
    const sessao = await sessaoAtual();
    if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
    if (sessao.perfil !== 'ADMIN') {
      return NextResponse.json(
        { erro: 'Apenas administradores disparam os alertas.' },
        { status: 403 },
      );
    }
  }

  const corpo = await req.json().catch(() => ({}));

  const resultado = await dispararAlertas({
    diaReferencia:
      typeof corpo?.dia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(corpo.dia) ? corpo.dia : undefined,
    forcar: corpo?.forcar === true,
  });

  return NextResponse.json(resultado);
}
