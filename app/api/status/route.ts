import { NextResponse } from 'next/server';
import { smtpConfigurado } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

/** Estado do envio de e-mail, para a interface sinalizar o modo preview. */
export async function GET() {
  return NextResponse.json({ modoEmail: smtpConfigurado() ? 'SMTP' : 'PREVIEW' });
}
