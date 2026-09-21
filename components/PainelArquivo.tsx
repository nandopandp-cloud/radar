'use client';

import { useState } from 'react';
import { ArquivoIcone } from '@/components/ArquivoIcone';
import {
  IconeAbrirFora, IconeCopiar, IconeLixeira, IconeLink, IconeMarcador, IconeMover,
  IconeX,
} from '@/components/icones';
import {
  caminhoDe, contarArquivos, dataPorExtenso, tamanhoLegivel, type ArquivoDrive,
} from '@/lib/drive-demo';
import type { Notificar } from '@/lib/tipos';

const ROTULO_TIPO: Record<string, string> = {
  pasta: 'Pasta no Google Drive',
  planilha: 'Planilha do Google',
  documento: 'Documento do Google',
  apresentacao: 'Apresentação do Google',
  pdf: 'Documento PDF',
  imagem: 'Imagem',
  outro: 'Arquivo',
};

/** Avatares empilhados de quem tem acesso, como no Drive. */
function Compartilhado({ quantos }: { quantos: number }) {
  const mostrados = Math.min(quantos, 3);
  return (
    <span className="arq-compartilhado">
      {Array.from({ length: mostrados }, (_, i) => (
        <span key={i} className={`arq-avatar arq-avatar-${i}`} aria-hidden="true" />
      ))}
      {quantos > mostrados && <span className="arq-avatar-mais">+{quantos - mostrados}</span>}
    </span>
  );
}

/**
 * Painel lateral com os detalhes do que está selecionado.
 *
 * As ações são de demonstração: enquanto o Drive não está conectado de
 * verdade, copiar/mover/duplicar avisam o que fariam em vez de fingir que
 * fizeram — um estado falso de sucesso atrapalharia a avaliação da tela.
 */
export function PainelArquivo({
  arquivo,
  aoFechar,
  notificar,
}: {
  arquivo: ArquivoDrive;
  aoFechar: () => void;
  notificar: Notificar;
}) {
  const [guia, setGuia] = useState<'detalhes' | 'historico' | 'demandas'>('detalhes');
  const ehPasta = arquivo.tipo === 'pasta';
  const caminho = caminhoDe(arquivo.id).slice(0, -1);

  function aindaNao(acao: string) {
    notificar(`${acao} estará disponível quando o Google Drive for conectado.`, 'info');
  }

  return (
    <aside className="arq-painel">
      <div className="arq-painel-topo">
        <ArquivoIcone tipo={arquivo.tipo} size={ehPasta ? 22 : 20} />
        <div className="arq-painel-nome">
          <div className="arq-painel-titulo" title={arquivo.nome}>{arquivo.nome}</div>
          <div className="arq-painel-sub">
            {ROTULO_TIPO[arquivo.tipo]}
            {arquivo.tamanho !== null && ` · ${tamanhoLegivel(arquivo.tamanho)}`}
          </div>
        </div>
        <button className="btn-icone" onClick={aoFechar} aria-label="Fechar detalhes">
          <IconeX size={18} />
        </button>
      </div>

      <div className="arq-painel-guias" role="tablist">
        <button
          role="tab" aria-selected={guia === 'detalhes'}
          className={`arq-guia${guia === 'detalhes' ? ' ativa' : ''}`}
          onClick={() => setGuia('detalhes')}
        >
          Detalhes
        </button>
        <button
          role="tab" aria-selected={guia === 'historico'}
          className={`arq-guia${guia === 'historico' ? ' ativa' : ''}`}
          onClick={() => setGuia('historico')}
        >
          {ehPasta ? 'Conteúdo' : 'Histórico'}
        </button>
        {!ehPasta && arquivo.demanda && (
          <button
            role="tab" aria-selected={guia === 'demandas'}
            className={`arq-guia${guia === 'demandas' ? ' ativa' : ''}`}
            onClick={() => setGuia('demandas')}
          >
            Demandas (1)
          </button>
        )}
      </div>

      <div className="arq-painel-corpo">
        {guia === 'detalhes' && (
          <>
            {!ehPasta && (
              <div className="arq-previa">
                <ArquivoIcone tipo={arquivo.tipo} size={30} />
                <span className="arq-previa-texto">
                  A pré-visualização aparece com o Drive conectado.
                </span>
              </div>
            )}

            <dl className="arq-dados">
              {ehPasta && (
                <>
                  <dt>Tipo</dt>
                  <dd>{ROTULO_TIPO.pasta}</dd>
                </>
              )}
              <dt>Localização</dt>
              <dd>
                Meu Drive
                {caminho.map((p) => <span key={p.id}> › {p.nome}</span>)}
              </dd>
              {arquivo.demanda && !ehPasta && (
                <>
                  <dt>Demanda</dt>
                  <dd><span className="arq-vinculo">{arquivo.demanda}</span></dd>
                </>
              )}
              <dt>Proprietário</dt>
              <dd>{arquivo.proprietario}</dd>
              <dt>Última modificação</dt>
              <dd>{dataPorExtenso(arquivo.modificadoEm)}</dd>
              <dt>Criado em</dt>
              <dd>{dataPorExtenso(arquivo.criadoEm)}</dd>
              {ehPasta && (
                <>
                  <dt>Arquivos</dt>
                  <dd>{contarArquivos(arquivo.id)}</dd>
                </>
              )}
              <dt>Compartilhado com</dt>
              <dd><Compartilhado quantos={arquivo.compartilhadoCom} /></dd>
            </dl>
          </>
        )}

        {guia === 'historico' && (
          ehPasta ? (
            <p className="arq-painel-vazio">
              {contarArquivos(arquivo.id)} arquivo(s) nesta pasta. Abra a pasta para vê-los.
            </p>
          ) : (
            <ul className="arq-historico">
              <li>
                <span className="arq-historico-marca" />
                <div>
                  <div className="arq-historico-acao">Última modificação</div>
                  <div className="arq-historico-quando">
                    {dataPorExtenso(arquivo.modificadoEm)} · {arquivo.proprietario}
                  </div>
                </div>
              </li>
              <li>
                <span className="arq-historico-marca" />
                <div>
                  <div className="arq-historico-acao">Arquivo criado</div>
                  <div className="arq-historico-quando">
                    {dataPorExtenso(arquivo.criadoEm)} · {arquivo.proprietario}
                  </div>
                </div>
              </li>
            </ul>
          )
        )}

        {guia === 'demandas' && arquivo.demanda && (
          <ul className="arq-vinculos">
            <li>
              <div className="arq-vinculo-titulo">{arquivo.demanda}</div>
              <div className="arq-vinculo-sub">Anexado em {dataPorExtenso(arquivo.criadoEm)}</div>
            </li>
          </ul>
        )}
      </div>

      <div className="arq-painel-acoes">
        <button className="btn btn-primario btn-bloco" onClick={() => aindaNao('Abrir no Drive')}>
          <IconeAbrirFora size={16} /> Abrir no Google Drive
        </button>
        {ehPasta ? (
          <>
            <button className="btn btn-secundario btn-bloco" onClick={() => aindaNao('O atalho')}>
              <IconeMarcador size={16} /> Adicionar atalho no Radar
            </button>
            <button className="btn btn-secundario btn-bloco" onClick={() => aindaNao('Copiar link')}>
              <IconeLink size={16} /> Copiar link
            </button>
          </>
        ) : (
          <div className="arq-acoes-grade">
            <button className="btn btn-secundario btn-pequeno" onClick={() => aindaNao('Copiar')}>
              <IconeCopiar size={15} /> Copiar
            </button>
            <button className="btn btn-secundario btn-pequeno" onClick={() => aindaNao('Mover')}>
              <IconeMover size={15} /> Mover
            </button>
            <button className="btn btn-secundario btn-pequeno" onClick={() => aindaNao('Duplicar')}>
              <IconeCopiar size={15} /> Duplicar
            </button>
            <button className="btn btn-perigo btn-pequeno" onClick={() => aindaNao('Remover')}>
              <IconeLixeira size={15} /> Remover
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
