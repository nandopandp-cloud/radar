import { formatarDiaCompleto, formatarDiaCurto, formatarDiaExtenso } from '@/lib/datas';
import {
  COR_PRIORIDADE,
  ROTULO_PRIORIDADE,
  ROTULO_STATUS,
  type Prioridade,
  type Status,
} from '@/lib/dominio';
import type { GrupoAutor } from '@/lib/vencidas';

/** Base pública, para links e imagens do e-mail resolverem fora do app. */
const BASE_URL = (
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://radar-mu-seven.vercel.app')
).replace(/\/$/, '');

const MARCA = '#2563eb';
const MARCA_ESCURA = '#1d4ed8';
const TINTA = '#0f172a';
const TINTA_SUAVE = '#64748b';
const BORDA = '#e2e8f0';
const ATRASADA = '#ef4444';
const ATRASADA_FUNDO = '#fef2f2';
const ATRASADA_BORDA = '#fecaca';
const HOJE_COR = '#2563eb';
const HOJE_FUNDO = '#eff6ff';
const HOJE_BORDA = '#bfdbfe';

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
  return `<span style="display:inline-block;padding:4px 11px;border-radius:999px;background:${cores.fundo};color:${cores.texto};border:1px solid ${cores.borda};font-size:11px;font-weight:700;letter-spacing:.02em;white-space:nowrap;">${escapar(texto)}</span>`;
}

/** Link direto para a demanda dentro do Radar. */
function linkDemanda(id: string): string {
  return `${BASE_URL}/?demanda=${id}`;
}

function cartaoDemanda(d: GrupoAutor['demandas'][number]): string {
  const cores = COR_PRIORIDADE[d.prioridade as Prioridade] ?? COR_PRIORIDADE.MEDIA;
  const corBarra = d.atrasada ? ATRASADA : HOJE_COR;

  const descricao = d.descricao
    ? `<p style="margin:6px 0 0;font-size:13.5px;line-height:1.55;color:${TINTA_SUAVE};">${escapar(d.descricao)}</p>`
    : '';

  const metaVencimento = d.atrasada
    ? `<span style="color:${ATRASADA};font-weight:700;">${
        d.diasVencido === 1 ? 'Vencida há 1 dia' : `Vencida há ${d.diasVencido} dias`
      }</span>`
    : `<span style="color:${HOJE_COR};font-weight:700;">Prazo hoje</span>`;

  const avisos = d.atrasada && d.vezesAlertada > 0
    ? ` &nbsp;|&nbsp; <span style="color:${TINTA_SUAVE};">${
        d.vezesAlertada === 1 ? '1 aviso já enviado' : `${d.vezesAlertada} avisos já enviados`
      }</span>`
    : '';

  return `
  <tr>
    <td style="padding:0 0 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:#ffffff;border:1px solid ${BORDA};border-left:4px solid ${corBarra};border-radius:10px;">
        <tr>
          <td style="padding:18px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:15.5px;font-weight:700;color:${TINTA};line-height:1.4;padding-right:12px;">
                  ${escapar(d.titulo)}
                </td>
                <td align="right" valign="top" style="white-space:nowrap;">
                  ${selo(ROTULO_PRIORIDADE[d.prioridade as Prioridade] ?? d.prioridade, cores)}
                </td>
              </tr>
            </table>
            ${descricao}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
              <tr>
                <td style="font-size:13px;color:${TINTA_SUAVE};line-height:1.6;">
                  <span style="display:inline-block;width:14px;vertical-align:-2px;margin-right:4px;">&#128197;</span>Prazo {ATRASADO_TXT} <strong style="color:${TINTA};">${formatarDiaCompleto(d.prazo)}</strong>
                  &nbsp;&nbsp;|&nbsp;&nbsp; ${metaVencimento}${avisos}
                </td>
              </tr>
              <tr>
                <td style="padding-top:14px;">
                  <a href="${linkDemanda(d.id)}" style="display:inline-block;padding:8px 18px;border-radius:8px;border:1px solid ${BORDA};color:${MARCA};font-size:12.5px;font-weight:700;text-decoration:none;background:#ffffff;">
                    Ver detalhes &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`.replace('{ATRASADO_TXT}', d.atrasada ? 'era' : 'é');
}

function secao(
  titulo: string,
  descricaoSecao: string,
  corFundo: string,
  corBorda: string,
  corTexto: string,
  iconeBg: string,
  icone: string,
  contagem: number,
  demandas: GrupoAutor['demandas'],
): string {
  if (demandas.length === 0) return '';

  return `
  <tr>
    <td style="padding:0 28px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${corFundo};border:1px solid ${corBorda};border-radius:12px 12px 0 0;">
        <tr>
          <td style="padding:16px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="38" valign="top">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="32" height="32" align="center" valign="middle" style="background:${iconeBg};border-radius:50%;font-size:15px;line-height:32px;">
                        ${icone}
                      </td>
                    </tr>
                  </table>
                </td>
                <td valign="middle">
                  <div style="font-size:15px;font-weight:700;color:${corTexto};">${escapar(titulo)}</div>
                  <div style="font-size:12.5px;color:${TINTA_SUAVE};margin-top:2px;">${escapar(descricaoSecao)}</div>
                </td>
                <td valign="middle" align="right" style="white-space:nowrap;">
                  <span style="font-size:12.5px;color:${TINTA_SUAVE};">${contagem} ${contagem === 1 ? 'demanda' : 'demandas'}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:0 28px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDA};border-top:none;border-radius:0 0 12px 12px;padding:16px;background:#fafbfc;">
        <tr>
          <td style="padding:4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${demandas.map(cartaoDemanda).join('')}
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export function assuntoEmail(grupo: GrupoAutor): string {
  const atrasadas = grupo.demandas.filter((d) => d.atrasada).length;
  const hoje = grupo.demandas.filter((d) => !d.atrasada).length;

  if (atrasadas > 0 && hoje > 0) {
    return `Radar · ${atrasadas} atrasada(s) e ${hoje} para hoje`;
  }
  if (atrasadas > 0) {
    const criticas = grupo.demandas.some((d) => d.atrasada && d.prioridade === 'CRITICA');
    return `${criticas ? '[Crítico] ' : ''}Radar · ${atrasadas} ${atrasadas === 1 ? 'demanda atrasada' : 'demandas atrasadas'}`;
  }
  return `Radar · ${hoje} ${hoje === 1 ? 'demanda para hoje' : 'demandas para hoje'}`;
}

export function montarHtml(grupo: GrupoAutor, diaReferencia: string): string {
  const atrasadas = grupo.demandas.filter((d) => d.atrasada);
  const paraHoje = grupo.demandas.filter((d) => !d.atrasada);
  const total = grupo.demandas.length;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Radar</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${atrasadas.length > 0 ? `${atrasadas.length} demanda(s) atrasada(s)` : ''}${
      atrasadas.length > 0 && paraHoje.length > 0 ? ' e ' : ''
    }${paraHoje.length > 0 ? `${paraHoje.length} para hoje` : ''}.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

          <!-- Topo: logo + frase -->
          <tr>
            <td style="background:#ffffff;border-radius:16px 16px 0 0;padding:22px 28px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle" style="padding-right:9px;">
                          <img src="${BASE_URL}/radar-email.png" width="30" height="30" alt=""
                               style="display:block;border:0;outline:none;" />
                        </td>
                        <td valign="middle" style="font-size:20px;font-weight:800;color:${TINTA};letter-spacing:-.02em;">
                          Radar
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle" style="font-size:12px;color:${TINTA_SUAVE};line-height:1.5;">
                    Organização hoje.<br />Mais resultados amanhã.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cabeçalho azul -->
          <tr>
            <td style="background:${MARCA_ESCURA};background-image:linear-gradient(135deg,${MARCA_ESCURA} 0%,${MARCA} 100%);padding:32px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle">
                    <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#a5c0ff;font-weight:700;">
                      Lembrete de demandas
                    </div>
                    <div style="font-size:25px;font-weight:800;color:#ffffff;margin-top:10px;line-height:1.28;">
                      Mantenha suas entregas<br />em dia, ${escapar(primeiroNome(grupo.nome))}!
                    </div>
                    <div style="font-size:14px;color:#c7d7ff;margin-top:10px;">
                      Aqui está um resumo das suas demandas pendentes.
                    </div>
                  </td>
                  <td width="90" align="right" valign="middle">
                    <img src="${BASE_URL}/radar-simbolo.png" width="76" height="76" alt=""
                         style="display:block;border:0;outline:none;opacity:.92;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Resumo -->
          <tr>
            <td style="background:#ffffff;padding:24px 28px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="32.5%" style="padding:16px 14px;background:${ATRASADA_FUNDO};border:1px solid ${ATRASADA_BORDA};border-radius:12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="34" height="34" align="center" valign="middle" style="background:${ATRASADA};border-radius:50%;font-size:15px;line-height:34px;color:#ffffff;font-weight:800;">!</td>
                        <td style="padding-left:12px;">
                          <div style="font-size:24px;font-weight:800;color:${ATRASADA};line-height:1;">${atrasadas.length}</div>
                        </td>
                      </tr>
                    </table>
                    <div style="font-size:12.5px;font-weight:700;color:${TINTA};margin-top:9px;">Demandas atrasadas</div>
                    <div style="font-size:11.5px;color:${TINTA_SUAVE};margin-top:2px;">Precisam da sua atenção</div>
                  </td>
                  <td width="2.5%"></td>
                  <td width="32.5%" style="padding:16px 14px;background:${HOJE_FUNDO};border:1px solid ${HOJE_BORDA};border-radius:12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="34" height="34" align="center" valign="middle" style="background:#ffffff;border:2px solid ${HOJE_COR};border-radius:50%;font-size:15px;line-height:30px;color:${HOJE_COR};">&#8226;</td>
                        <td style="padding-left:12px;">
                          <div style="font-size:24px;font-weight:800;color:${HOJE_COR};line-height:1;">${paraHoje.length}</div>
                        </td>
                      </tr>
                    </table>
                    <div style="font-size:12.5px;font-weight:700;color:${TINTA};margin-top:9px;">Demandas para hoje</div>
                    <div style="font-size:11.5px;color:${TINTA_SUAVE};margin-top:2px;">Com prazo até ${formatarDiaCurto(diaReferencia)}</div>
                  </td>
                  <td width="2.5%"></td>
                  <td width="32.5%" style="padding:16px 14px;background:#f8fafc;border:1px solid ${BORDA};border-radius:12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="34" height="34" align="center" valign="middle" style="background:#e2e8f0;border-radius:50%;font-size:15px;line-height:34px;color:${TINTA_SUAVE};">&#10003;</td>
                        <td style="padding-left:12px;">
                          <div style="font-size:24px;font-weight:800;color:${TINTA};line-height:1;">${total}</div>
                        </td>
                      </tr>
                    </table>
                    <div style="font-size:12.5px;font-weight:700;color:${TINTA};margin-top:9px;">Total de pendentes</div>
                    <div style="font-size:11.5px;color:${TINTA_SUAVE};margin-top:2px;">Acompanhamento no Radar</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Seções -->
          <tr>
            <td style="background:#ffffff;padding-top:16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${secao(
                  'Demandas atrasadas',
                  'Estas demandas já passaram do prazo e continuam pendentes.',
                  ATRASADA_FUNDO, ATRASADA_BORDA, '#991b1b', ATRASADA, '&#9888;',
                  atrasadas.length, atrasadas,
                )}
                ${secao(
                  'Demandas para hoje',
                  'Estas demandas têm prazo de entrega até o final do dia.',
                  HOJE_FUNDO, HOJE_BORDA, MARCA_ESCURA, HOJE_COR, '&#8986;',
                  paraHoje.length, paraHoje,
                )}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="background:#ffffff;padding:4px 28px 26px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid ${HOJE_BORDA};border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle">
                          <div style="font-size:14px;font-weight:700;color:${TINTA};">Precisa ver todas as suas demandas?</div>
                          <div style="font-size:12.5px;color:${TINTA_SUAVE};margin-top:2px;">Acesse o Radar e acompanhe seu calendário completo.</div>
                        </td>
                        <td align="right" valign="middle" style="white-space:nowrap;padding-left:16px;">
                          <a href="${BASE_URL}/" style="display:inline-block;padding:11px 20px;border-radius:9px;background:${MARCA};color:#ffffff;font-size:13.5px;font-weight:700;text-decoration:none;">
                            Acessar o Radar &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background:#ffffff;border-radius:0 0 16px 16px;padding:20px 28px 26px;border-top:1px solid ${BORDA};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle" style="padding-right:8px;">
                          <img src="${BASE_URL}/radar-email.png" width="20" height="20" alt=""
                               style="display:block;border:0;outline:none;" />
                        </td>
                        <td valign="middle" style="font-size:12.5px;color:${TINTA_SUAVE};">
                          Mais controle para o que realmente importa.
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle" style="font-size:11px;color:#94a3b8;">
                    Este é um email automático. Não responda.
                  </td>
                </tr>
              </table>
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
  const atrasadas = grupo.demandas.filter((d) => d.atrasada);
  const paraHoje = grupo.demandas.filter((d) => !d.atrasada);

  const linhas = [
    'RADAR — Mantenha suas entregas em dia',
    formatarDiaExtenso(diaReferencia),
    '',
    `Olá, ${primeiroNome(grupo.nome)}!`,
    '',
    `Atrasadas: ${atrasadas.length} | Para hoje: ${paraHoje.length} | Total: ${grupo.demandas.length}`,
    '',
  ];

  function listar(titulo: string, lista: typeof grupo.demandas) {
    if (lista.length === 0) return;
    linhas.push(`${titulo.toUpperCase()}:`, '');
    lista.forEach((d, i) => {
      const rotulo = ROTULO_PRIORIDADE[d.prioridade as Prioridade] ?? d.prioridade;
      linhas.push(`${i + 1}. [${rotulo.toUpperCase()}] ${d.titulo}`);
      if (d.descricao) linhas.push(`   ${d.descricao}`);
      const status = d.atrasada
        ? d.diasVencido === 1 ? 'vencida há 1 dia' : `vencida há ${d.diasVencido} dias`
        : 'prazo hoje';
      linhas.push(`   Prazo ${d.atrasada ? 'era' : 'é'} ${formatarDiaCurto(d.prazo)} · ${status}`);
      linhas.push(`   Ver: ${linkDemanda(d.id)}`);
      linhas.push('');
    });
  }

  listar('Demandas atrasadas', atrasadas);
  listar('Demandas para hoje', paraHoje);

  linhas.push(`Acesse o Radar: ${BASE_URL}/`);
  return linhas.join('\n');
}
