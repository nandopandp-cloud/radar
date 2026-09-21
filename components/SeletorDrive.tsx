'use client';

import { useMemo, useState } from 'react';
import { ArquivoIcone } from '@/components/ArquivoIcone';
import { LogoDrive } from '@/components/LogoDrive';
import { IconeBusca, IconeDireita, IconeX } from '@/components/icones';
import {
  caminhoDe, conteudoDe, contarArquivos, dataLegivel, RAIZ, tamanhoLegivel,
  type ArquivoDrive,
} from '@/lib/drive-demo';

/**
 * Escolher arquivos do Google Drive para anexar a uma demanda.
 *
 * O acervo é o catálogo de demonstração; quando a integração real entrar, só
 * a fonte dos itens muda — a janela, a navegação por pastas e a seleção
 * múltipla continuam as mesmas.
 */
export function SeletorDrive({
  aoFechar,
  aoConfirmar,
}: {
  aoFechar: () => void;
  /** Recebe os arquivos escolhidos; quem chama decide o que fazer com eles. */
  aoConfirmar: (arquivos: ArquivoDrive[]) => void;
}) {
  const [pasta, setPasta] = useState(RAIZ);
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState('');

  const caminho = pasta === RAIZ ? [] : caminhoDe(pasta);

  const itens = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = conteudoDe(pasta);
    if (!termo) return base;
    return base.filter((a) => a.nome.toLowerCase().includes(termo));
  }, [pasta, busca]);

  function alternar(item: ArquivoDrive) {
    setEscolhidos((atual) => {
      const nova = new Set(atual);
      if (nova.has(item.id)) nova.delete(item.id);
      else nova.add(item.id);
      return nova;
    });
  }

  function confirmar() {
    const lista = [...escolhidos]
      .map((id) => itens.find((a) => a.id === id) ?? conteudoDe(pasta).find((a) => a.id === id))
      .filter((a): a is ArquivoDrive => Boolean(a));
    aoConfirmar(lista);
  }

  return (
    <>
      <div className="veu" onClick={aoFechar} />
      <div className="drive-modal" role="dialog" aria-modal="true" aria-label="Escolher do Google Drive">
        <div className="drive-topo">
          <div className="linha" style={{ gap: 10 }}>
            <LogoDrive size={22} />
            <div>
              <div className="modal-titulo">Escolher do Google Drive</div>
              <div className="modal-sub">Arquivos do Drive da MSA a que você tem acesso.</div>
            </div>
          </div>
          <button className="btn-icone" onClick={aoFechar} aria-label="Fechar">
            <IconeX size={19} />
          </button>
        </div>

        <div className="drive-barra">
          <div className="arq-caminho">
            <button className="arq-caminho-item" onClick={() => setPasta(RAIZ)}>Meu Drive</button>
            {caminho.map((p) => (
              <span key={p.id} className="arq-caminho-parte">
                <IconeDireita size={14} />
                <button
                  className={`arq-caminho-item${p.id === pasta ? ' atual' : ''}`}
                  onClick={() => setPasta(p.id)}
                >
                  {p.nome}
                </button>
              </span>
            ))}
          </div>
          <div className="arq-busca arq-busca-lateral">
            <IconeBusca size={15} />
            <input
              className="entrada"
              placeholder="Buscar neste local…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        <div className="drive-lista">
          {itens.length === 0 ? (
            <div className="vazio">
              <div className="vazio-titulo">Pasta vazia</div>
              <p className="vazio-texto">Não há arquivos aqui com esse nome.</p>
            </div>
          ) : (
            <ul className="drive-itens">
              {itens.map((a) => {
                const ehPasta = a.tipo === 'pasta';
                const marcado = escolhidos.has(a.id);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      className={`drive-item${marcado ? ' marcado' : ''}`}
                      onClick={() => (ehPasta ? setPasta(a.id) : alternar(a))}
                    >
                      {!ehPasta && (
                        <span className={`drive-caixa${marcado ? ' marcada' : ''}`} aria-hidden="true" />
                      )}
                      <ArquivoIcone tipo={a.tipo} size={17} />
                      <span className="drive-item-nome">{a.nome}</span>
                      <span className="drive-item-meta">
                        {ehPasta
                          ? `${contarArquivos(a.id)} ${contarArquivos(a.id) === 1 ? 'arquivo' : 'arquivos'}`
                          : tamanhoLegivel(a.tamanho)}
                      </span>
                      <span className="drive-item-data">
                        {dataLegivel(a.modificadoEm).slice(0, 10)}
                      </span>
                      {ehPasta && <IconeDireita size={15} className="drive-item-seta" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="drive-rodape">
          <span className="texto-suave">
            {escolhidos.size === 0
              ? 'Nenhum arquivo escolhido'
              : `${escolhidos.size} arquivo(s) escolhido(s)`}
          </span>
          <div className="linha">
            <button className="btn btn-secundario" onClick={aoFechar}>Cancelar</button>
            <button
              className="btn btn-primario"
              disabled={escolhidos.size === 0}
              onClick={confirmar}
            >
              Anexar à demanda
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
