'use client';

import { useMemo, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import {
  IconeAlerta, IconeCheckCirculo, IconeCirculo, IconeMais, IconeRelogio,
} from '@/components/icones';
import { ROTULO_PRIORIDADE, type Prioridade, type Situacao } from '@/lib/dominio';
import { formatarDiaCurto } from '@/lib/datas';
import type { Demanda, SessaoUI } from '@/lib/tipos';

/** Uma coluna do quadro: a situação que ela reúne e como ela se apresenta. */
type Coluna = {
  situacao: Situacao;
  rotulo: string;
  descricao: string;
  /**
   * Status gravado no banco quando um card é solto aqui. Null quando a coluna
   * não aceita soltar: "Atrasada" é consequência do prazo, não uma escolha.
   */
  statusAlvo: 'ABERTA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | null;
  Icone: (p: { size?: number }) => React.ReactElement;
};

const COLUNAS: Coluna[] = [
  {
    situacao: 'ATRASADA', rotulo: 'Atrasadas', descricao: 'Demandas com prazo vencido',
    statusAlvo: null, Icone: IconeAlerta,
  },
  {
    situacao: 'PENDENTE', rotulo: 'Em aberto', descricao: 'Demandas no prazo',
    statusAlvo: 'ABERTA', Icone: IconeCirculo,
  },
  {
    situacao: 'EM_ANDAMENTO', rotulo: 'Em andamento', descricao: 'Demandas em execução',
    statusAlvo: 'EM_ANDAMENTO', Icone: IconeRelogio,
  },
  {
    situacao: 'CONCLUIDA', rotulo: 'Concluídas', descricao: 'Demandas finalizadas',
    statusAlvo: 'CONCLUIDA', Icone: IconeCheckCirculo,
  },
];

/** Cartão do quadro. Arrastável quando o usuário pode editar a demanda. */
function Cartao({
  demanda, situacao, mostrarAutor, podeArrastar, arrastando,
  aoAbrir, aoIniciarArraste, aoTerminarArraste,
}: {
  demanda: Demanda;
  situacao: Situacao;
  mostrarAutor: boolean;
  podeArrastar: boolean;
  arrastando: boolean;
  aoAbrir: () => void;
  aoIniciarArraste: () => void;
  aoTerminarArraste: () => void;
}) {
  const prazo = demanda.prazo.slice(0, 10);
  const atrasada = situacao === 'ATRASADA';

  return (
    <article
      className={`quadro-cartao sit-${situacao}${arrastando ? ' arrastando' : ''}`}
      draggable={podeArrastar}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        // Alguns navegadores só iniciam o arraste se houver carga definida.
        e.dataTransfer.setData('text/plain', demanda.id);
        aoIniciarArraste();
      }}
      onDragEnd={aoTerminarArraste}
      onClick={aoAbrir}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoAbrir(); }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${demanda.titulo}. Entrega em ${formatarDiaCurto(prazo)}.`}
    >
      <div className="quadro-cartao-topo">
        <h3 className="quadro-cartao-titulo">{demanda.titulo}</h3>
        {demanda.categoria && (
          <span className="selo selo-categoria quadro-cartao-categoria">{demanda.categoria}</span>
        )}
      </div>

      {demanda.descricao && <p className="quadro-cartao-desc">{demanda.descricao}</p>}

      {/* Prioridade e prazo dividem a mesma linha: juntos ocupam pouco e
          garantem que nenhum cartão fique reduzido só ao título. */}
      <div className="quadro-cartao-meta">
        <span className={`selo selo-${demanda.prioridade}`}>
          {ROTULO_PRIORIDADE[demanda.prioridade as Prioridade] ?? demanda.prioridade}
        </span>
        <span className={`quadro-cartao-prazo${atrasada ? ' vencido' : ''}`}>
          <IconeCalendarioMini />
          {atrasada ? `Venceu em ${formatarDiaCurto(prazo)}` : formatarDiaCurto(prazo)}
        </span>
      </div>

      {mostrarAutor && (
        <div className="quadro-cartao-rodape">
          <Avatar nome={demanda.autor.nome} tamanho="sm" />
          <span className="quadro-cartao-autor">{demanda.autor.nome}</span>
        </div>
      )}
    </article>
  );
}

/** Calendário pequeno do rodapé do cartão — 15px, para não competir com o texto. */
function IconeCalendarioMini() {
  return (
    <svg
      width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden
    >
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

export function QuadroDemandas({
  sessao,
  itens,
  aoAbrirDemanda,
  aoNovaDemanda,
  aoMoverDemanda,
  hoje,
}: {
  sessao: SessaoUI;
  itens: { d: Demanda; situacao: Situacao }[];
  aoAbrirDemanda: (d: Demanda) => void;
  aoNovaDemanda: (prazo: string) => void;
  aoMoverDemanda: (d: Demanda, status: string) => void;
  hoje: string;
}) {
  const [arrastado, setArrastado] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<Situacao | null>(null);
  /** Contador de enter/leave: o dragleave dos filhos não pode apagar o realce. */
  const profundidade = useRef(0);

  const porColuna = useMemo(() => {
    const mapa = new Map<Situacao, Demanda[]>(COLUNAS.map((c) => [c.situacao, []]));
    for (const { d, situacao } of itens) {
      // Canceladas não têm coluna própria; ficam fora do quadro.
      mapa.get(situacao)?.push(d);
    }
    return mapa;
  }, [itens]);

  const podeEditar = (d: Demanda) => sessao.perfil === 'ADMIN' || d.autorId === sessao.id;

  function soltar(coluna: Coluna) {
    const item = itens.find(({ d }) => d.id === arrastado);
    setArrastado(null);
    setAlvo(null);
    profundidade.current = 0;
    if (!item || !coluna.statusAlvo || item.situacao === coluna.situacao) return;
    if (!podeEditar(item.d)) return;
    aoMoverDemanda(item.d, coluna.statusAlvo);
  }

  return (
    <div className="quadro">
      {COLUNAS.map((coluna) => {
        const lista = porColuna.get(coluna.situacao) ?? [];
        const aceita = coluna.statusAlvo !== null;
        const ativa = aceita && alvo === coluna.situacao && arrastado !== null;

        return (
          <section
            key={coluna.situacao}
            className={`quadro-coluna sit-${coluna.situacao}${ativa ? ' alvo' : ''}`}
            onDragOver={(e) => {
              if (!arrastado || !aceita) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDragEnter={() => {
              if (!arrastado || !aceita) return;
              profundidade.current += 1;
              setAlvo(coluna.situacao);
            }}
            onDragLeave={() => {
              profundidade.current -= 1;
              if (profundidade.current <= 0) {
                profundidade.current = 0;
                setAlvo((a) => (a === coluna.situacao ? null : a));
              }
            }}
            onDrop={(e) => { e.preventDefault(); soltar(coluna); }}
          >
            <header className="quadro-coluna-topo">
              <div className="quadro-coluna-titulo">
                <span className="quadro-coluna-icone"><coluna.Icone size={17} /></span>
                <span className="quadro-coluna-nome">{coluna.rotulo}</span>
                <span className="quadro-coluna-contador">{lista.length}</span>
              </div>
              <p className="quadro-coluna-desc">{coluna.descricao}</p>
            </header>

            <div className="quadro-coluna-corpo">
              {lista.map((d) => (
                <Cartao
                  key={d.id}
                  demanda={d}
                  situacao={coluna.situacao}
                  mostrarAutor={sessao.perfil === 'ADMIN'}
                  podeArrastar={podeEditar(d)}
                  arrastando={arrastado === d.id}
                  aoAbrir={() => aoAbrirDemanda(d)}
                  aoIniciarArraste={() => setArrastado(d.id)}
                  aoTerminarArraste={() => {
                    setArrastado(null);
                    setAlvo(null);
                    profundidade.current = 0;
                  }}
                />
              ))}

              {lista.length === 0 && (
                <p className="quadro-coluna-vazia">
                  {arrastado && aceita ? 'Solte aqui' : 'Nada por aqui'}
                </p>
              )}

              {coluna.situacao !== 'CONCLUIDA' && (
                <button className="quadro-adicionar" onClick={() => aoNovaDemanda(hoje)}>
                  <IconeMais size={15} /> Nova demanda
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
