import { prisma } from '@/lib/prisma';
import { diaParaDate } from '@/lib/datas';
import { assuntoEmail, montarHtml, montarTexto } from '@/lib/email-template';
import { enviarEmail, resendConfigurado, smtpConfigurado } from '@/lib/mailer';
import { buscarVencidas, diaReferenciaPadrao, registrarAlerta } from '@/lib/vencidas';

export type ItemResultado = {
  autor: string;
  email: string;
  qtdDemandas: number;
  status: 'ENVIADO' | 'PREVIEW' | 'ERRO' | 'IGNORADO';
  detalhe?: string;
  temPrevia?: boolean;
};

export type ResultadoDisparo = {
  diaReferencia: string;
  modo: 'SMTP' | 'RESEND' | 'PREVIEW';
  totalAutores: number;
  totalDemandas: number;
  enviados: number;
  erros: number;
  ignorados: number;
  itens: ItemResultado[];
};

/**
 * Alerta cada analista sobre as demandas que ele lançou e cujo prazo venceu.
 *
 * @param diaReferencia dia "YYYY-MM-DD" da apuração. Padrão: hoje.
 * @param forcar reenvia mesmo que já exista alerta registrado para o dia.
 */
export async function dispararAlertas(opcoes: {
  diaReferencia?: string;
  forcar?: boolean;
} = {}): Promise<ResultadoDisparo> {
  const diaReferencia = opcoes.diaReferencia || diaReferenciaPadrao();
  const forcar = opcoes.forcar ?? false;
  const modo: 'SMTP' | 'RESEND' | 'PREVIEW' = resendConfigurado()
    ? 'RESEND'
    : smtpConfigurado()
      ? 'SMTP'
      : 'PREVIEW';

  const grupos = await buscarVencidas(diaReferencia);
  const dataRef = diaParaDate(diaReferencia);
  const itens: ItemResultado[] = [];

  for (const grupo of grupos) {
    if (!forcar) {
      const jaEnviado = await prisma.alerta.findUnique({
        where: {
          usuarioId_dataReferencia: { usuarioId: grupo.usuarioId, dataReferencia: dataRef },
        },
      });
      if (jaEnviado && jaEnviado.status !== 'ERRO') {
        itens.push({
          autor: grupo.nome,
          email: grupo.email,
          qtdDemandas: grupo.demandas.length,
          status: 'IGNORADO',
          detalhe: 'Alerta já enviado hoje. Marque "reenviar" para forçar.',
        });
        continue;
      }
    }

    const assunto = assuntoEmail(grupo);
    const html = montarHtml(grupo, diaReferencia);

    const resultado = await enviarEmail({
      para: grupo.email,
      assunto,
      html,
      texto: montarTexto(grupo, diaReferencia),
      diaReferencia,
    });

    const status: ItemResultado['status'] = resultado.ok
      ? resultado.modo !== 'PREVIEW'
        ? 'ENVIADO'
        : 'PREVIEW'
      : 'ERRO';

    await prisma.alerta.upsert({
      where: {
        usuarioId_dataReferencia: { usuarioId: grupo.usuarioId, dataReferencia: dataRef },
      },
      create: {
        usuarioId: grupo.usuarioId,
        email: grupo.email,
        dataReferencia: dataRef,
        qtdDemandas: grupo.demandas.length,
        status,
        detalhe: resultado.detalhe,
        assunto,
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

    // Só contamos o aviso quando ele de fato saiu, e só para o que já está
    // atrasado — o lembrete das que vencem hoje não é uma cobrança.
    if (status === 'ENVIADO' || status === 'PREVIEW') {
      await registrarAlerta(grupo.demandas.filter((d) => d.atrasada).map((d) => d.id));
    }

    itens.push({
      autor: grupo.nome,
      email: grupo.email,
      qtdDemandas: grupo.demandas.length,
      status,
      detalhe: resultado.detalhe,
      temPrevia: status === 'PREVIEW',
    });
  }

  return {
    diaReferencia,
    modo,
    totalAutores: grupos.length,
    totalDemandas: grupos.reduce((acc, g) => acc + g.demandas.length, 0),
    enviados: itens.filter((i) => i.status === 'ENVIADO' || i.status === 'PREVIEW').length,
    erros: itens.filter((i) => i.status === 'ERRO').length,
    ignorados: itens.filter((i) => i.status === 'IGNORADO').length,
    itens,
  };
}
