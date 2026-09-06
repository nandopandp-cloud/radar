import { prisma } from '@/lib/prisma';
import { diaParaDate } from '@/lib/datas';
import { assuntoEmail, montarHtml, montarTexto } from '@/lib/email-template';
import { enviarEmail, smtpConfigurado } from '@/lib/mailer';
import { aplicarPostergacao, buscarPostergadas, diaReferenciaPadrao } from '@/lib/postergacao';

export type ItemResultado = {
  colaborador: string;
  email: string;
  qtdDemandas: number;
  status: 'ENVIADO' | 'PREVIEW' | 'ERRO' | 'IGNORADO';
  detalhe?: string;
  /// Presente no modo preview: a prévia pode ser aberta na interface.
  temPrevia?: boolean;
};

export type ResultadoDisparo = {
  diaReferencia: string;
  modo: 'SMTP' | 'PREVIEW';
  totalColaboradores: number;
  totalDemandas: number;
  enviados: number;
  erros: number;
  ignorados: number;
  postergadas: number;
  itens: ItemResultado[];
};

/**
 * Dispara o alerta de demandas postergadas.
 *
 * @param diaReferencia dia "YYYY-MM-DD" que recebe as demandas. Padrão: próximo dia útil.
 * @param forcar reenvia mesmo que já exista alerta registrado para o dia.
 * @param postergar move de fato as demandas para o dia de referência após o envio.
 */
export async function dispararAlertas(opcoes: {
  diaReferencia?: string;
  forcar?: boolean;
  postergar?: boolean;
} = {}): Promise<ResultadoDisparo> {
  const diaReferencia = opcoes.diaReferencia || diaReferenciaPadrao();
  const forcar = opcoes.forcar ?? false;
  const postergar = opcoes.postergar ?? true;
  const modo: 'SMTP' | 'PREVIEW' = smtpConfigurado() ? 'SMTP' : 'PREVIEW';

  const grupos = await buscarPostergadas(diaReferencia);
  const dataRef = diaParaDate(diaReferencia);
  const itens: ItemResultado[] = [];

  for (const grupo of grupos) {
    // Evita reenviar o mesmo alerta no mesmo dia, salvo se o usuário forçar.
    if (!forcar) {
      const jaEnviado = await prisma.alerta.findUnique({
        where: {
          colaboradorId_dataReferencia: {
            colaboradorId: grupo.colaboradorId,
            dataReferencia: dataRef,
          },
        },
      });
      if (jaEnviado && jaEnviado.status !== 'ERRO') {
        itens.push({
          colaborador: grupo.nome,
          email: grupo.email,
          qtdDemandas: grupo.demandas.length,
          status: 'IGNORADO',
          detalhe: 'Alerta já enviado hoje. Use "reenviar" para forçar.',
        });
        continue;
      }
    }

    const assunto = assuntoEmail(grupo, diaReferencia);
    const html = montarHtml(grupo, diaReferencia);

    const resultado = await enviarEmail({
      para: grupo.email,
      assunto,
      html,
      texto: montarTexto(grupo, diaReferencia),
      diaReferencia,
    });

    const status: ItemResultado['status'] = resultado.ok
      ? resultado.modo === 'SMTP'
        ? 'ENVIADO'
        : 'PREVIEW'
      : 'ERRO';

    await prisma.alerta.upsert({
      where: {
        colaboradorId_dataReferencia: {
          colaboradorId: grupo.colaboradorId,
          dataReferencia: dataRef,
        },
      },
      create: {
        colaboradorId: grupo.colaboradorId,
        email: grupo.email,
        dataReferencia: dataRef,
        qtdDemandas: grupo.demandas.length,
        status,
        detalhe: resultado.detalhe,
        assunto,
        // Guardamos o HTML só na prévia; no envio real a mensagem já foi entregue.
        corpoHtml: status === 'PREVIEW' ? html : null,
      },
      update: {
        qtdDemandas: grupo.demandas.length,
        status,
        detalhe: resultado.detalhe,
        assunto,
        corpoHtml: status === 'PREVIEW' ? html : null,
        enviadoEm: new Date(),
      },
    });

    itens.push({
      colaborador: grupo.nome,
      email: grupo.email,
      qtdDemandas: grupo.demandas.length,
      status,
      detalhe: resultado.detalhe,
      temPrevia: status === 'PREVIEW',
    });
  }

  // Só movemos as demandas se algum alerta realmente saiu.
  const houveEnvio = itens.some((i) => i.status === 'ENVIADO' || i.status === 'PREVIEW');
  const postergadas = postergar && houveEnvio ? await aplicarPostergacao(diaReferencia) : 0;

  return {
    diaReferencia,
    modo,
    totalColaboradores: grupos.length,
    totalDemandas: grupos.reduce((acc, g) => acc + g.demandas.length, 0),
    enviados: itens.filter((i) => i.status === 'ENVIADO' || i.status === 'PREVIEW').length,
    erros: itens.filter((i) => i.status === 'ERRO').length,
    ignorados: itens.filter((i) => i.status === 'IGNORADO').length,
    postergadas,
    itens,
  };
}
