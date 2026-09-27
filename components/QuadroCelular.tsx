'use client';

import { useMemo, useState } from 'react';
import {
  IconeAlerta, IconeBalao, IconeBandeira, IconeCalendario, IconeCheck, IconeRelogio, IconeUsuario,
} from '@/components/icones';
import { MenuAcoes, type AcaoMenu } from '@/components/MenuAcoes';
import { ROTULO_PRIORIDADE, type Prioridade, type Situacao } from '@/lib/dominio';
import { rotuloDiaRelativo } from '@/lib/datas';
import type { Demanda, SessaoUI } from '@/lib/tipos';

/** Quantos cartões cada coluna mostra antes do "Ver todas". */
const VISIVEIS_POR_COLUNA = 5;

const COLUNAS: { situacao: Situacao; rotulo: string; Icone: typeof IconeAlerta }[] = [
  { situacao: 'ATRASADA', rotulo: 'Atrasadas', Icone: IconeAlerta },
  { situacao: 'PENDENTE', rotulo: 'Em aberto', Icone: IconeBandeira },
  { situacao: 'CONCLUIDA', rotulo: 'Concluídas', Icone: IconeCheck },
  { situacao: 'EM_ANDAMENTO', rotulo: 'Em andamento', Icone: IconeRelogio },
];

const DESTINOS: { status: string; rotulo: string }[] = [
  { status: 'ABERTA', rotulo: 'Mover para Em aberto' },
  { status: 'EM_ANDAMENTO', rotulo: 'Mover para Em andamento' },
  { status: 'CONCLUIDA', rotulo: 'Mover para Concluída' },
];

function CartaoCelular({
  demanda, situacao, hoje, mostrarAutor, podeMover, aoAbrir, aoMover,
}: {
  demanda: Demanda;
  situacao: Situacao;
  hoje: string;
  mostrarAutor: boolean;
  podeMover: boolean;
  aoAbrir: () => void;
  aoMover: (status: string) => void;
}) {
  /*
   * No celular não há arrastar entre colunas: mudar a situação é pelo menu.
   * Some o destino em que a demanda já está.
   */
  const acoes: AcaoMenu[] = [
    { rotulo: 'Abrir demanda', aoEscolher: aoAbrir },
    ...(podeMover
      ? DESTINOS.filter((d) => d.status !== demanda.status).map((d, i) => ({
          rotulo: d.rotulo, aoEscolher: () => aoMover(d.status), separar: i === 0,
        }))
      : []),
  ];
  const comentarios = demanda._count?.comentarios ?? 0;

  return (
    <article
      className={`qc-cartao sit-${situacao}`}
      role="button"
      tabIndex={0}
      onClick={aoAbrir}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoAbrir(); }
      }}
    >
      <div className="qc-cartao-titulo">
        <span className="ponto" />
        <h3>{demanda.titulo}</h3>
      </div>
      <span className={`qc-prioridade prioridade-${demanda.prioridade}`}>
        {ROTULO_PRIORIDADE[demanda.prioridade as Prioridade] ?? demanda.prioridade}
      </span>
      <div className="qc-cartao-linhas">
        <span><IconeCalendario size={15} /> {rotuloDiaRelativo(demanda.prazo.slice(0, 10), hoje)}</span>
        {mostrarAutor && <span><IconeUsuario size={15} /> {demanda.autor.nome}</span>}
        {comentarios > 0 && <span><IconeBalao size={15} /> {comentarios}</span>}
      </div>
      <MenuAcoes acoes={acoes} rotulo={`Ações de ${demanda.titulo}`} />
    </article>
  );
}

/** Quadro do celular: colunas em duas por linha, com mover pelo menu "...". */
export function QuadroCelular({
  sessao,
  itens,
  hoje,
  aoAbrirDemanda,
  aoMoverDemanda,
}: {
  sessao: SessaoUI;
  itens: { d: Demanda; situacao: Situacao }[];
  hoje: string;
  aoAbrirDemanda: (d: Demanda) => void;
  aoMoverDemanda: (d: Demanda, status: string) => void;
}) {
  const [expandidas, setExpandidas] = useState<Situacao[]>([]);

  const porColuna = useMemo(() => {
    const mapa = new Map<Situacao, Demanda[]>(COLUNAS.map((c) => [c.situacao, []]));
    for (const { d, situacao } of itens) mapa.get(situacao)?.push(d);
    return mapa;
  }, [itens]);

  const podeMover = (d: Demanda) => sessao.perfil === 'ADMIN' || d.autorId === sessao.id;

  return (
    <div className="qc">
      {COLUNAS.map(({ situacao, rotulo, Icone }) => {
        const lista = porColuna.get(situacao) ?? [];
        const aberta = expandidas.includes(situacao);
        const mostradas = aberta ? lista : lista.slice(0, VISIVEIS_POR_COLUNA);
        return (
          <section key={situacao} className={`qc-coluna sit-${situacao}`}>
            <header className="qc-coluna-topo">
              <span className="qc-coluna-icone"><Icone size={15} /></span>
              <h2>{rotulo}</h2>
              <span className="qc-coluna-conta">{lista.length}</span>
            </header>
            <div className="qc-coluna-corpo">
              {mostradas.map((d) => (
                <CartaoCelular
                  key={d.id}
                  demanda={d}
                  situacao={situacao}
                  hoje={hoje}
                  mostrarAutor={sessao.perfil === 'ADMIN'}
                  podeMover={podeMover(d)}
                  aoAbrir={() => aoAbrirDemanda(d)}
                  aoMover={(status) => aoMoverDemanda(d, status)}
                />
              ))}
              {lista.length === 0 && <p className="qc-vazia">Nada por aqui</p>}
              {lista.length > VISIVEIS_POR_COLUNA && (
                <button
                  type="button"
                  className="qc-ver-todas"
                  onClick={() => setExpandidas((e) => (
                    aberta ? e.filter((s) => s !== situacao) : [...e, situacao]
                  ))}
                >
                  {aberta ? 'Ver menos' : `Ver todas (${lista.length})`}
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Lista do celular: os mesmos cartões, numa coluna só. */
export function ListaCelular({
  sessao,
  itens,
  hoje,
  aoAbrirDemanda,
  aoMoverDemanda,
}: {
  sessao: SessaoUI;
  itens: { d: Demanda; situacao: Situacao }[];
  hoje: string;
  aoAbrirDemanda: (d: Demanda) => void;
  aoMoverDemanda: (d: Demanda, status: string) => void;
}) {
  return (
    <div className="qc-lista">
      {itens.map(({ d, situacao }) => (
        <CartaoCelular
          key={d.id}
          demanda={d}
          situacao={situacao}
          hoje={hoje}
          mostrarAutor={sessao.perfil === 'ADMIN'}
          podeMover={sessao.perfil === 'ADMIN' || d.autorId === sessao.id}
          aoAbrir={() => aoAbrirDemanda(d)}
          aoMover={(status) => aoMoverDemanda(d, status)}
        />
      ))}
    </div>
  );
}
