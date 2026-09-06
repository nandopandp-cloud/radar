import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';

export type ResultadoEnvio = {
  ok: boolean;
  modo: 'SMTP' | 'PREVIEW';
  destino: string;
  detalhe?: string;
  arquivo?: string;
};

const PASTA_PREVIEW = path.join(process.cwd(), '.preview-emails');

/** Só consideramos SMTP configurado quando há host — o resto tem padrão razoável. */
export function smtpConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim());
}

let transporterCache: Transporter | null = null;

function obterTransporter(): Transporter {
  if (transporterCache) return transporterCache;

  const porta = Number(process.env.SMTP_PORT || 587);
  const usuario = process.env.SMTP_USER?.trim();
  const senha = process.env.SMTP_PASS ?? '';

  transporterCache = nodemailer.createTransport({
    host: process.env.SMTP_HOST!.trim(),
    port: porta,
    // secure=true é obrigatório na 465; nas demais o padrão é STARTTLS.
    secure: process.env.SMTP_SECURE === 'true' || porta === 465,
    auth: usuario ? { user: usuario, pass: senha } : undefined,
  });

  return transporterCache;
}

function nomeArquivoSeguro(email: string, dia: string): string {
  const base = email.replace(/[^a-zA-Z0-9._-]/g, '_');
  const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
  return `${dia}__${base}__${carimbo}.html`;
}

export async function enviarEmail(opcoes: {
  para: string;
  assunto: string;
  html: string;
  texto: string;
  diaReferencia: string;
}): Promise<ResultadoEnvio> {
  const remetente = process.env.MAIL_FROM?.trim() || 'Radar MSA <radar-msa@localhost>';

  // Modo preview: grava o HTML em disco em vez de enviar.
  if (!smtpConfigurado()) {
    try {
      await mkdir(PASTA_PREVIEW, { recursive: true });
      const arquivo = path.join(PASTA_PREVIEW, nomeArquivoSeguro(opcoes.para, opcoes.diaReferencia));
      const cabecalho =
        `<!-- PREVIEW (não enviado)\n` +
        `     De: ${remetente}\n` +
        `     Para: ${opcoes.para}\n` +
        `     Assunto: ${opcoes.assunto}\n-->\n`;
      await writeFile(arquivo, cabecalho + opcoes.html, 'utf8');
      return { ok: true, modo: 'PREVIEW', destino: opcoes.para, arquivo };
    } catch (erro) {
      return {
        ok: false,
        modo: 'PREVIEW',
        destino: opcoes.para,
        detalhe: erro instanceof Error ? erro.message : String(erro),
      };
    }
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
      detalhe: erro instanceof Error ? erro.message : String(erro),
    };
  }
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
    return { ok: false, detalhe: erro instanceof Error ? erro.message : String(erro) };
  }
}
