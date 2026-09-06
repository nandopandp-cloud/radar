import nodemailer, { type Transporter } from 'nodemailer';

export type ResultadoEnvio = {
  ok: boolean;
  modo: 'SMTP' | 'PREVIEW';
  destino: string;
  detalhe?: string;
};

/** Só consideramos SMTP configurado quando há host — o resto tem padrão razoável. */
export function smtpConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim());
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

export async function enviarEmail(opcoes: {
  para: string;
  assunto: string;
  html: string;
  texto: string;
  diaReferencia: string;
}): Promise<ResultadoEnvio> {
  const remetente = process.env.MAIL_FROM?.trim() || 'Radar MSA <radar-msa@localhost>';

  // Modo preview: nada é enviado. O HTML é guardado no banco pelo chamador
  // (lib/disparo.ts) — o filesystem é somente leitura em serverless.
  if (!smtpConfigurado()) {
    return {
      ok: true,
      modo: 'PREVIEW',
      destino: opcoes.para,
      detalhe: 'Prévia gerada — nenhum e-mail enviado.',
    };
  }

  try {
    const bcc = process.env.MAIL_BCC?.trim();
    const info = await obterTransporter().sendMail({
      from: remetente,
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
      detalhe: explicarErro(erro),
    };
  }
}

/** Traduz os erros de SMTP mais comuns para algo acionável. */
function explicarErro(erro: unknown): string {
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

/** Testa a conexão SMTP sem enviar mensagem. */
export async function verificarSmtp(): Promise<{ ok: boolean; detalhe: string }> {
  if (!smtpConfigurado()) {
    return { ok: true, detalhe: 'Modo preview ativo — nenhum SMTP configurado.' };
  }
  try {
    await obterTransporter().verify();
    return { ok: true, detalhe: `Conectado a ${process.env.SMTP_HOST}.` };
  } catch (erro) {
    return { ok: false, detalhe: explicarErro(erro) };
  }
}
