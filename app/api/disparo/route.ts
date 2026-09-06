import { NextResponse } from 'next/server';
import { dispararAlertas } from '@/lib/disparo';
import { buscarPostergadas } from '@/lib/postergacao';
import { diaReferenciaPadrao } from '@/lib/postergacao';
import { smtpConfigurado, verificarSmtp } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

/** Prévia do que seria enviado, sem enviar nada. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dia = searchParams.get('dia') || diaReferenciaPadrao();
  const grupos = await buscarPostergadas(dia);
  const smtp = await verificarSmtp();

  return NextResponse.json({
    diaReferencia: dia,
    modo: smtpConfigurado() ? 'SMTP' : 'PREVIEW',
    smtp,
    totalColaboradores: grupos.length,
    totalDemandas: grupos.reduce((acc, g) => acc + g.demandas.length, 0),
    grupos,
  });
}

export async function POST(req: Request) {
  // Proteção opcional para quando o endpoint for exposto ao agendador externo.
  const segredo = process.env.CRON_SECRET?.trim();
  if (segredo) {
    const enviado =
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
      req.headers.get('x-cron-secret');
    if (enviado !== segredo) {
      return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });
    }
  }

  const corpo = await req.json().catch(() => ({}));

  const resultado = await dispararAlertas({
    diaReferencia:
      typeof corpo?.dia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(corpo.dia)
        ? corpo.dia
        : undefined,
    forcar: corpo?.forcar === true,
    postergar: corpo?.postergar !== false,
  });

  return NextResponse.json(resultado);
}
