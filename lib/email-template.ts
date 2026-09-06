import { formatarDiaCurto, formatarDiaExtenso } from '@/lib/datas';
import {
  COR_PRIORIDADE,
  ROTULO_ORIGEM,
  ROTULO_PRIORIDADE,
  ROTULO_STATUS,
  type Origem,
  type Prioridade,
  type Status,
} from '@/lib/dominio';
import type { GrupoAutor } from '@/lib/vencidas';

/** Base pública, para as imagens do e-mail resolverem fora do app. */
const BASE_URL = (
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://radar-mu-seven.vercel.app')
).replace(/\/$/, '');

const MARCA = '#1f4ed8';
const MARCA_ESCURA = '#0f2b6b';
const TINTA = '#0f172a';
const TINTA_SUAVE = '#64748b';
const BORDA = '#e2e8f0';

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

function selo(texto: string, cores: { fundo: string; texto: string; borda: string }): string {
  return `<span style="display:inline-block;padding:3px 9px;border-radius:999px;background:${cores.fundo};color:${cores.texto};border:1px solid ${cores.borda};font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;white-space:nowrap;">${escapar(texto)}</span>`;
}

function linhaVencimento(dias: number, vezes: number): string {
  const partes: string[] = [];
  if (dias === 1) partes.push('Venceu ontem');
  else if (dias > 1) partes.push(`Vencida há ${dias} dias`);
  else partes.push('Vence hoje');
  if (vezes === 1) partes.push('1º aviso já enviado');
  else if (vezes > 1) partes.push(`${vezes} avisos já enviados`);
  return partes.join(' &middot; ');
}

function cartaoDemanda(d: GrupoAutor['demandas'][number]): string {
  const cores = COR_PRIORIDADE[d.prioridade as Prioridade] ?? COR_PRIORIDADE.MEDIA;
  const critica = d.prioridade === 'CRITICA' || d.prioridade === 'ALTA';
  const meta = linhaVencimento(d.diasVencido, d.vezesAlertada);

  const descricao = d.descricao
    ? `<p style="margin:8px 0 0;font-size:13px;line-height:1.55;color:${TINTA_SUAVE};">${escapar(d.descricao)}</p>`
    : '';

  return `
  <tr>
    <td style="padding:0 0 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:#ffffff;border:1px solid ${BORDA};border-left:4px solid ${cores.texto};border-radius:10px;">
        <tr>
          <td style="padding:16px 18px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:15px;font-weight:700;color:${TINTA};line-height:1.4;padding-right:10px;">
                  ${escapar(d.titulo)}
                </td>
                <td align="right" style="white-space:nowrap;">
                  ${selo(ROTULO_PRIORIDADE[d.prioridade as Prioridade] ?? d.prioridade, cores)}
                </td>
              </tr>
            </table>
            ${descricao}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
              <tr>
                <td style="font-size:12px;color:${TINTA_SUAVE};line-height:1.6;">
                  <span style="color:#b91c1c;font-weight:700;">${meta}</span>
                  <br />
                  <span>Prazo era <strong style="color:${TINTA};">${formatarDiaCurto(d.prazo)}</strong>
                  &middot; ${escapar(ROTULO_STATUS[d.status as Status] ?? d.status)}${
                    d.categoria ? ` &middot; ${escapar(d.categoria)}` : ''
                  }</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export function assuntoEmail(grupo: GrupoAutor, diaReferencia: string): string {
  const n = grupo.demandas.length;
  const criticas = grupo.demandas.filter((d) => d.prioridade === 'CRITICA').length;
  const prefixo = criticas > 0 ? '[Crítico] ' : '';
  const plural = n === 1 ? 'demanda com prazo vencido' : 'demandas com prazo vencido';
  return `${prefixo}Radar MSA · ${n} ${plural}`;
}

export function montarHtml(grupo: GrupoAutor, diaReferencia: string): string {
  const n = grupo.demandas.length;
  const criticas = grupo.demandas.filter((d) => d.prioridade === 'CRITICA').length;
  const altas = grupo.demandas.filter((d) => d.prioridade === 'ALTA').length;
  const maisAntiga = Math.max(...grupo.demandas.map((d) => d.diasVencido));

  const resumo = [
    { valor: String(n), rotulo: n === 1 ? 'demanda' : 'demandas' },
    { valor: String(criticas + altas), rotulo: 'alta ou crítica' },
    { valor: `${maisAntiga}d`, rotulo: 'vencida há mais tempo' },
  ];

  const celulasResumo = resumo
    .map(
      (r) => `
      <td width="33%" align="center" style="padding:14px 8px;background:#f8fafc;border:1px solid ${BORDA};border-radius:10px;">
        <div style="font-size:24px;font-weight:800;color:${MARCA};line-height:1;">${r.valor}</div>
        <div style="font-size:11px;color:${TINTA_SUAVE};text-transform:uppercase;letter-spacing:.06em;margin-top:5px;">${r.rotulo}</div>
      </td>`,
    )
    .join('<td width="10"></td>');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Radar MSA</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${n === 1 ? 'Uma demanda sua venceu' : `${n} demandas suas venceram`} e continuam pendentes.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

          <!-- Cabeçalho -->
          <tr>
            <td style="background:${MARCA_ESCURA};background-image:linear-gradient(135deg,${MARCA_ESCURA} 0%,${MARCA} 100%);border-radius:14px 14px 0 0;padding:26px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#a5c0ff;font-weight:700;">Radar</div>
                    <div style="font-size:21px;font-weight:800;color:#ffffff;margin-top:6px;line-height:1.3;">
                      Prazos vencidos
                    </div>
                    <div style="font-size:13px;color:#c7d7ff;margin-top:4px;">
                      ${formatarDiaExtenso(diaReferencia)}
                    </div>
                  </td>
                  <td align="right" valign="top">
                    <img src="${BASE_URL}/radar-email.png" width="42" height="42" alt=""
                         style="display:block;border:0;outline:none;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="background:#ffffff;padding:26px 28px 8px;">
              <p style="margin:0 0 6px;font-size:16px;color:${TINTA};font-weight:700;">
                Olá, ${escapar(primeiroNome(grupo.nome))}!
              </p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${TINTA_SUAVE};">
                ${n === 1
                  ? 'Uma demanda que você lançou passou do prazo e continua pendente:'
                  : `Estas <strong style="color:${TINTA};">${n} demandas</strong> que você lançou passaram do prazo e continuam pendentes:`}
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
                <tr>${celulasResumo}</tr>
              </table>
            </td>
          </tr>

          <!-- Lista -->
          <tr>
            <td style="background:#ffffff;padding:0 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${grupo.demandas.map(cartaoDemanda).join('')}
              </table>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background:#ffffff;border-radius:0 0 14px 14px;padding:10px 28px 26px;">
              <div style="border-top:1px solid ${BORDA};padding-top:16px;font-size:12px;line-height:1.6;color:${TINTA_SUAVE};">
                Assim que concluir uma demanda, marque como concluída no Radar para ela sair deste alerta.
              </div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:18px 12px 0;font-size:11px;color:#94a3b8;line-height:1.6;">
              Radar &middot; alerta automático de prazos vencidos &middot; MSA<br />
              Enviado para ${escapar(grupo.email)}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function montarTexto(grupo: GrupoAutor, diaReferencia: string): string {
  const linhas = [
    `RADAR — Prazos vencidos`,
    formatarDiaExtenso(diaReferencia),
    '',
    `Olá, ${primeiroNome(grupo.nome)}!`,
    '',
    `${grupo.demandas.length === 1 ? 'Uma demanda que você lançou passou do prazo e continua pendente' : `${grupo.demandas.length} demandas que você lançou passaram do prazo e continuam pendentes`}:`,
    '',
  ];

  grupo.demandas.forEach((d, i) => {
    const rotulo = ROTULO_PRIORIDADE[d.prioridade as Prioridade] ?? d.prioridade;
    linhas.push(`${i + 1}. [${rotulo.toUpperCase()}] ${d.titulo}`);
    if (d.descricao) linhas.push(`   ${d.descricao}`);
    const meta = linhaVencimento(d.diasVencido, d.vezesAlertada).replace(/&middot;/g, '·');
    linhas.push(`   Prazo era ${formatarDiaCurto(d.prazo)} · ${meta}`);
    linhas.push('');
  });

  linhas.push('Marque como concluída no Radar assim que entregar.');
  return linhas.join('\n');
}
