import nodemailer, { type Transporter } from 'nodemailer';

export type ResultadoEnvio = {
  ok: boolean;
  modo: 'SMTP' | 'RESEND' | 'PREVIEW';
  destino: string;
  detalhe?: string;
};

/** Resend é preferido quando configurado — mais simples e sem fricção de conta do Google. */
export function resendConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** Só consideramos SMTP configurado quando há host — o resto tem padrão razoável. */
export function smtpConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim());
}

/** Algum provedor de envio real está configurado (Resend ou SMTP). */
export function envioConfigurado(): boolean {
  return resendConfigurado() || smtpConfigurado();
}

let transporterCache: Transporter | null = null;

function obterTransporter(): Transporter {
  if (transporterCache) return transporterCache;

  const porta = Number(process.env.SMTP_PORT || 587);
  const usuario = process.env.SMTP_USER?.trim();
  // O Google mostra a senha de aplicativo em grupos de 4 ("abcd efgh ijkl mnop"),
  // mas os espaços são apenas visuais — enviá-los faz a autenticação falhar.
  const senha = (process.env.SMTP_PASS ?? '').replace(/\s+/g, '');

  transporterCache = nodemailer.createTransport({
    host: process.env.SMTP_HOST!.trim(),
    port: porta,
    // secure=true é obrigatório na 465; nas demais o padrão é STARTTLS.
    secure: process.env.SMTP_SECURE === 'true' || porta === 465,
    auth: usuario ? { user: usuario, pass: senha } : undefined,
  });

  return transporterCache;
}

async function enviarViaResend(opcoes: {
  para: string;
  assunto: string;
  html: string;
  texto: string;
  remetente: string;
  bcc?: string;
}): Promise<ResultadoEnvio> {
  const apiKey = process.env.RESEND_API_KEY!.trim();

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: opcoes.remetente,
        to: [opcoes.para],
        bcc: opcoes.bcc ? [opcoes.bcc] : undefined,
        subject: opcoes.assunto,
        html: opcoes.html,
        text: opcoes.texto,
      }),
    });

    const corpo = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok: false,
        modo: 'RESEND',
        destino: opcoes.para,
        detalhe: explicarErroResend(res.status, corpo),
      };
    }

    return { ok: true, modo: 'RESEND', destino: opcoes.para, detalhe: corpo.id };
  } catch (erro) {
    return {
      ok: false,
      modo: 'RESEND',
      destino: opcoes.para,
      detalhe: erro instanceof Error ? erro.message : String(erro),
    };
  }
}

function explicarErroResend(status: number, corpo: unknown): string {
  const mensagem =
    corpo && typeof corpo === 'object' && 'message' in corpo
      ? String((corpo as { message: unknown }).message)
      : JSON.stringify(corpo);

  if (status === 401 || status === 403 || /api key is invalid|invalid api ?key/i.test(mensagem)) {
    return `API key do Resend inválida ou sem permissão. Confira RESEND_API_KEY. Detalhe: ${mensagem}`;
  }
  if (/domain is not verified|domain.*not.*verif/i.test(mensagem)) {
    return (
      'O domínio do remetente (MAIL_FROM) ainda não foi verificado no Resend. ' +
      `Verifique em resend.com/domains. Detalhe: ${mensagem}`
    );
  }
  return `Resend recusou o envio (HTTP ${status}). Detalhe: ${mensagem}`;
}

export async function enviarEmail(opcoes: {
  para: string;
  assunto: string;
  html: string;
  texto: string;
  /// Contexto do alerta diário. Não afeta o envio; os avisos de comentário
  /// simplesmente não o informam.
  diaReferencia?: string;
}): Promise<ResultadoEnvio> {
  const remetenteBruto = process.env.MAIL_FROM?.trim() || 'Radar <radar@localhost>';

  // Modo preview: nada é enviado. O HTML é guardado no banco pelo chamador
  // (lib/disparo.ts) — o filesystem é somente leitura em serverless.
  if (!envioConfigurado()) {
    return {
      ok: true,
      modo: 'PREVIEW',
      destino: opcoes.para,
      detalhe: 'Prévia gerada — nenhum e-mail enviado.',
    };
  }

  // Resend tem prioridade: menos fricção de conta e recomendado para produção.
  if (resendConfigurado()) {
    return enviarViaResend({
      para: opcoes.para,
      assunto: opcoes.assunto,
      html: opcoes.html,
      texto: opcoes.texto,
      remetente: remetenteBruto,
      bcc: process.env.MAIL_BCC?.trim(),
    });
  }

  try {
    const bcc = process.env.MAIL_BCC?.trim();
    const info = await obterTransporter().sendMail({
      from: remetenteBruto,
      to: opcoes.para,
      bcc: bcc || undefined,
      subject: opcoes.assunto,
      text: opcoes.texto,
      html: opcoes.html,
    });
    return { ok: true, modo: 'SMTP', destino: opcoes.para, detalhe: info.messageId };
  } catch (erro) {
    return {
      ok: false,
      modo: 'SMTP',
      destino: opcoes.para,
      detalhe: explicarErroSmtp(erro),
    };
  }
}

/** Traduz os erros de SMTP mais comuns para algo acionável. */
function explicarErroSmtp(erro: unknown): string {
  const bruto = erro instanceof Error ? erro.message : String(erro);

  if (/Authentication Required|5\.7\.0|Username and Password not accepted|535/i.test(bruto)) {
    return (
      'O servidor recusou a autenticação. Confira SMTP_USER (o e-mail completo) e ' +
      'SMTP_PASS (senha de aplicativo, não a senha da conta). ' +
      `Resposta do servidor: ${bruto}`
    );
  }
  if (/ENOTFOUND|EAI_AGAIN/i.test(bruto)) {
    return `Servidor SMTP não encontrado — confira SMTP_HOST. Detalhe: ${bruto}`;
  }
  if (/ETIMEDOUT|ECONNREFUSED/i.test(bruto)) {
    return `Não foi possível conectar — confira SMTP_PORT e o firewall. Detalhe: ${bruto}`;
  }
  return bruto;
}

/** Testa a conexão do provedor de envio configurado, sem enviar mensagem. */
export async function verificarSmtp(): Promise<{ ok: boolean; detalhe: string }> {
  if (!envioConfigurado()) {
    return { ok: true, detalhe: 'Modo preview ativo — nenhum provedor de envio configurado.' };
  }

  if (resendConfigurado()) {
    try {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}` },
      });
      if (!res.ok) {
        const corpo = await res.json().catch(() => ({}));
        return { ok: false, detalhe: explicarErroResend(res.status, corpo) };
      }
      return { ok: true, detalhe: 'Conectado ao Resend.' };
    } catch (erro) {
      return { ok: false, detalhe: erro instanceof Error ? erro.message : String(erro) };
    }
  }

  try {
    await obterTransporter().verify();
    return { ok: true, detalhe: `Conectado a ${process.env.SMTP_HOST}.` };
  } catch (erro) {
    return { ok: false, detalhe: explicarErroSmtp(erro) };
  }
}
