import { prisma } from '@/lib/prisma';
import {
  assuntoComentario,
  montarHtmlComentario,
  montarTextoComentario,
  type MotivoComentario,
} from '@/lib/email-comentario';
import { enviarEmail } from '@/lib/mailer';

/**
 * Avisa por e-mail quem precisa saber de um comentário novo: o dono da demanda
 * e as pessoas marcadas com @.
 *
 * Três regras definem a lista de destinatários:
 *
 * 1. Quem escreveu nunca recebe — já sabe o que escreveu. Vale inclusive se
 *    a pessoa se automencionar ou comentar na própria demanda.
 * 2. Cada pessoa recebe no máximo um e-mail por comentário. Se o dono também
 *    foi mencionado, vale a versão de menção, que é a mais específica.
 * 3. Contas inativas ficam de fora.
 *
 * O envio é best-effort: uma falha de SMTP não desfaz o comentário, que já
 * está gravado. O erro é registrado no log do servidor para investigação.
 */
export async function notificarComentario(opcoes: {
  comentarioId: string;
  demanda: { id: string; titulo: string; autorId: string };
  texto: string;
  autorNome: string;
  /** Quem escreveu. Nulo em teoria; na prática sempre vem da sessão. */
  autorId: string | null;
  /** Ids das pessoas marcadas com @ neste comentário. */
  mencionadosIds: string[];
}): Promise<void> {
  const { demanda, texto, autorNome, autorId } = opcoes;

  // Menção vence "dono": quem está nos dois papéis recebe só o aviso de menção.
  const motivoPorUsuario = new Map<string, MotivoComentario>();
  motivoPorUsuario.set(demanda.autorId, 'DONO');
  for (const id of opcoes.mencionadosIds) motivoPorUsuario.set(id, 'MENCAO');

  // Quem escreveu não é avisado da própria fala.
  if (autorId) motivoPorUsuario.delete(autorId);
  if (motivoPorUsuario.size === 0) return;

  const destinatarios = await prisma.usuario.findMany({
    where: { id: { in: [...motivoPorUsuario.keys()] }, ativo: true },
    select: { id: true, nome: true, email: true },
  });

  await Promise.all(
    destinatarios.map(async (pessoa) => {
      const motivo = motivoPorUsuario.get(pessoa.id)!;
      const dados = {
        destinatario: { nome: pessoa.nome },
        autorNome,
        demanda: { id: demanda.id, titulo: demanda.titulo },
        texto,
        motivo,
      };

      try {
        const resultado = await enviarEmail({
          para: pessoa.email,
          assunto: assuntoComentario(dados),
          html: montarHtmlComentario(dados),
          texto: montarTextoComentario(dados),
        });
        if (!resultado.ok) {
          console.error(
            `[comentario] falha ao avisar ${pessoa.email}: ${resultado.detalhe}`,
          );
        }
      } catch (erro) {
        console.error(`[comentario] erro ao avisar ${pessoa.email}:`, erro);
      }
    }),
  );
}
