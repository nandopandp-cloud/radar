import { NextResponse } from 'next/server';
import { resendConfigurado, smtpConfigurado } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

/** Estado do envio de e-mail, para a interface sinalizar o modo ativo. */
export async function GET() {
  const modoEmail = resendConfigurado() ? 'RESEND' : smtpConfigurado() ? 'SMTP' : 'PREVIEW';
  return NextResponse.json({ modoEmail });
}
