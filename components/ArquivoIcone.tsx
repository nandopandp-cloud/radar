'use client';

import {
  IconeApresentacao, IconeArquivo, IconeImagem, IconePasta, IconePlanilha,
} from '@/components/icones';
import type { TipoArquivo } from '@/lib/drive-demo';

/**
 * O quadradinho colorido que identifica o tipo do arquivo nas listas.
 *
 * As cores seguem as do Google (planilha verde, documento azul, apresentação
 * amarela) porque o acervo é o Drive da pessoa: manter a mesma convenção
 * poupa a releitura de um código de cores novo.
 */
const ESTILO: Record<TipoArquivo, { cor: string; fundo: string }> = {
  pasta:        { cor: '#3b82f6', fundo: '#dbeafe' },
  planilha:     { cor: '#15803d', fundo: '#dcfce7' },
  documento:    { cor: '#1d4ed8', fundo: '#dbeafe' },
  apresentacao: { cor: '#b45309', fundo: '#fef3c7' },
  pdf:          { cor: '#b91c1c', fundo: '#fee2e2' },
  imagem:       { cor: '#7c3aed', fundo: '#ede9fe' },
  outro:        { cor: '#475569', fundo: '#f1f5f9' },
};

export function ArquivoIcone({ tipo, size = 20 }: { tipo: TipoArquivo; size?: number }) {
  const { cor, fundo } = ESTILO[tipo];
  const caixa = Math.round(size * 1.75);

  const Desenho =
    tipo === 'pasta' ? IconePasta
    : tipo === 'planilha' ? IconePlanilha
    : tipo === 'apresentacao' ? IconeApresentacao
    : tipo === 'imagem' ? IconeImagem
    : IconeArquivo;

  return (
    <span
      className="arq-icone"
      style={{ width: caixa, height: caixa, background: fundo, color: cor }}
      aria-hidden="true"
    >
      {/* O PDF não tem desenho próprio: a sigla diz mais que um ícone genérico. */}
      {tipo === 'pdf' ? <span className="arq-icone-sigla">PDF</span> : <Desenho size={size} />}
    </span>
  );
}
