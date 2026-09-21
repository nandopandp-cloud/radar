import {
  BASE_URL,
  BORDA,
  MARCA,
  MARCA_ESCURA,
  TINTA,
  TINTA_SUAVE,
  escapar,
  linkDemanda,
  primeiroNome,
} from '@/lib/email-base';

const CITACAO_FUNDO = '#f8fafc';
const MENCAO_FUNDO = '#eff6ff';
const MENCAO_BORDA = '#bfdbfe';

/**
 * Por que a pessoa está recebendo este e-mail. Muda o assunto, a chamada e a
 * faixa do topo — o resto da mensagem é o mesmo, porque o conteúdo relevante
 * (quem falou, o quê, em qual demanda) não depende do motivo.
 */
export type MotivoComentario = 'DONO' | 'MENCAO';

export type DadosComentario = {
  /** Quem recebe. */
  destinatario: { nome: string };
  autorNome: string;
  demanda: { id: string; titulo: string };
  texto: string;
  motivo: MotivoComentario;
};

export function assuntoComentario(d: DadosComentario): string {
  return d.motivo === 'MENCAO'
    ? `${d.autorNome} mencionou você em "${d.demanda.titulo}"`
    : `${d.autorNome} comentou em "${d.demanda.titulo}"`;
}

/** Preserva as quebras de linha do comentário sem interpretar HTML. */
function textoEmParagrafos(texto: string): string {
  return escapar(texto).replace(/\r?\n/g, '<br />');
}

export function montarHtmlComentario(d: DadosComentario): string {
  const mencao = d.motivo === 'MENCAO';
  const etiqueta = mencao ? 'Você foi mencionado' : 'Novo comentário';
  const chamada = mencao
    ? `${escapar(d.autorNome)} mencionou você em um comentário.`
    : `${escapar(d.autorNome)} comentou em uma demanda sua.`;
  const link = linkDemanda(d.demanda.id);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Radar</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapar(d.texto.slice(0, 120))}
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
            <td style="background:${MARCA_ESCURA};background-image:linear-gradient(135deg,${MARCA_ESCURA} 0%,${MARCA} 100%);padding:30px 28px;">
              <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#a5c0ff;font-weight:700;">
                ${etiqueta}
              </div>
              <div style="font-size:22px;font-weight:800;color:#ffffff;line-height:1.35;padding-top:8px;letter-spacing:-.01em;">
                ${escapar(d.demanda.titulo)}
              </div>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="background:#ffffff;padding:28px;">
              <p style="margin:0 0 6px;font-size:16px;color:${TINTA};font-weight:700;">
                Olá, ${escapar(primeiroNome(d.destinatario.nome))}!
              </p>
              <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:${TINTA_SUAVE};">
                ${chamada}
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                     style="border-collapse:separate;background:${mencao ? MENCAO_FUNDO : CITACAO_FUNDO};border:1px solid ${mencao ? MENCAO_BORDA : BORDA};border-left:4px solid ${MARCA};border-radius:10px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <div style="font-size:13px;font-weight:700;color:${TINTA};padding-bottom:6px;">
                      ${escapar(d.autorNome)}
                    </div>
                    <div style="font-size:14px;line-height:1.6;color:${TINTA};">
                      ${textoEmParagrafos(d.texto)}
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" style="padding-top:24px;">
                <tr>
                  <td style="background:${MARCA};border-radius:8px;">
                    <a href="${link}"
                       style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
                      Abrir a demanda
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background:#ffffff;border-radius:0 0 16px 16px;border-top:1px solid ${BORDA};padding:18px 28px;font-size:12px;color:${TINTA_SUAVE};line-height:1.6;">
              Você recebeu este aviso porque ${
                mencao ? 'foi mencionado neste comentário' : 'é o dono desta demanda'
              }.<br />
              <a href="${BASE_URL}/" style="color:${MARCA};text-decoration:none;">Acessar o Radar</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function montarTextoComentario(d: DadosComentario): string {
  const mencao = d.motivo === 'MENCAO';
  return [
    `RADAR — ${mencao ? 'Você foi mencionado' : 'Novo comentário'}`,
    '',
    `Olá, ${primeiroNome(d.destinatario.nome)}!`,
    '',
    mencao
      ? `${d.autorNome} mencionou você em um comentário na demanda "${d.demanda.titulo}".`
      : `${d.autorNome} comentou na sua demanda "${d.demanda.titulo}".`,
    '',
    `${d.autorNome} escreveu:`,
    d.texto,
    '',
    `Abrir a demanda: ${linkDemanda(d.demanda.id)}`,
    '',
    `Acesse o Radar: ${BASE_URL}/`,
  ].join('\n');
}
