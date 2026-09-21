'use client';

import { useMemo, useState } from 'react';
import { ArquivoIcone } from '@/components/ArquivoIcone';
import { PainelArquivo } from '@/components/PainelArquivo';
import {
  IconeBaixo, IconeBusca, IconeDireita, IconeEnviar, IconeFiltro,
  IconeGrade, IconeLink, IconeLista, IconeMais, IconeMaisTres, IconeMarcador,
  IconeNuvem, IconeOrdenar, IconePasta, IconeRelogio, IconeEquipe, IconeEstrela,
  IconeLixeira,
} from '@/components/icones';
import { LogoDrive } from '@/components/LogoDrive';
import {
  ARMAZENAMENTO, CATALOGO, caminhoDe, conteudoDe, contarArquivos, dataLegivel,
  documentosDoRadar, pastasDaRaiz, RAIZ, tamanhoLegivel, type ArquivoDrive,
  type OrigemArquivo, type TipoArquivo,
} from '@/lib/drive-demo';
import type { Notificar, SessaoUI } from '@/lib/tipos';

type AbaArquivos =
  | 'todos' | 'pastas' | 'radar' | 'compartilhados' | 'recentes' | 'favoritos';

const ABAS: { id: AbaArquivos; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos os arquivos' },
  { id: 'pastas', rotulo: 'Pastas do Drive' },
  { id: 'radar', rotulo: 'Documentos do Radar' },
  { id: 'compartilhados', rotulo: 'Compartilhados comigo' },
  { id: 'recentes', rotulo: 'Recentes' },
  { id: 'favoritos', rotulo: 'Favoritos' },
];

const ROTULO_ORIGEM: Record<OrigemArquivo, string> = {
  drive: 'Drive', upload: 'Upload', radar: 'Radar',
};

const ROTULO_TIPO_FILTRO: { id: TipoArquivo | 'todos'; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'planilha', rotulo: 'Planilhas' },
  { id: 'documento', rotulo: 'Documentos' },
  { id: 'apresentacao', rotulo: 'Apresentações' },
  { id: 'pdf', rotulo: 'PDF' },
  { id: 'imagem', rotulo: 'Imagens' },
  { id: 'outro', rotulo: 'Outros' },
];

/**
 * "Meus arquivos": o Drive da MSA dentro do Radar.
 *
 * Os dados são fictícios (lib/drive-demo.ts) enquanto a experiência está em
 * avaliação — a tela é a pergunta, não a resposta. Por isso as ações que
 * mexeriam em arquivo de verdade avisam que dependem da conexão com o Google,
 * em vez de simular um sucesso que não existe.
 */
export function TelaArquivos({
  sessao,
  notificar,
}: {
  sessao: SessaoUI;
  notificar: Notificar;
}) {
  const [aba, setAba] = useState<AbaArquivos>('todos');
  const [pastaAtual, setPastaAtual] = useState<string>(RAIZ);
  const [selecionado, setSelecionado] = useState<ArquivoDrive | null>(null);
  const [busca, setBusca] = useState('');
  const [emGrade, setEmGrade] = useState(false);
  const [abertas, setAbertas] = useState<Set<string>>(new Set([RAIZ]));

  /* Filtros da aba "Documentos do Radar". */
  const [origem, setOrigem] = useState<OrigemArquivo | 'todas'>('todas');
  const [tipoFiltro, setTipoFiltro] = useState<TipoArquivo | 'todos'>('todos');
  const [demandaFiltro, setDemandaFiltro] = useState<string>('todas');
  const [buscaDemanda, setBuscaDemanda] = useState('');

  const pastas = pastasDaRaiz();
  const caminho = pastaAtual === RAIZ ? [] : caminhoDe(pastaAtual);

  function aindaNao(acao: string) {
    notificar(`${acao} estará disponível quando o Google Drive for conectado.`, 'info');
  }

  function abrir(item: ArquivoDrive) {
    if (item.tipo === 'pasta') {
      setPastaAtual(item.id);
      setSelecionado(null);
      setAbertas((a) => new Set(a).add(item.id));
    } else {
      setSelecionado(item);
    }
  }

  /** O que a lista da aba atual mostra, já com a busca aplicada. */
  const itens = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    let base: ArquivoDrive[];

    switch (aba) {
      case 'pastas':
        base = pastaAtual === RAIZ ? pastas : conteudoDe(pastaAtual);
        break;
      case 'radar':
        base = documentosDoRadar().filter((a) => {
          if (origem !== 'todas' && a.origem !== origem) return false;
          if (tipoFiltro !== 'todos' && a.tipo !== tipoFiltro) return false;
          if (demandaFiltro === 'sem' && a.demanda) return false;
          if (demandaFiltro !== 'todas' && demandaFiltro !== 'sem' && a.demanda !== demandaFiltro) {
            return false;
          }
          return true;
        });
        break;
      case 'compartilhados':
        base = CATALOGO.filter((a) => a.compartilhado);
        break;
      case 'recentes':
        base = [...CATALOGO]
          .filter((a) => a.tipo !== 'pasta')
          .sort((a, b) => b.modificadoEm.localeCompare(a.modificadoEm))
          .slice(0, 10);
        break;
      case 'favoritos':
        base = CATALOGO.filter((a) => a.favorito);
        break;
      default:
        base = conteudoDe(pastaAtual);
    }

    if (!termo) return base;
    return base.filter((a) => a.nome.toLowerCase().includes(termo));
  }, [aba, pastaAtual, pastas, busca, origem, tipoFiltro, demandaFiltro]);

  /** As demandas que aparecem no filtro lateral, com a contagem de cada uma. */
  const demandas = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const a of documentosDoRadar()) {
      if (a.demanda) mapa.set(a.demanda, (mapa.get(a.demanda) ?? 0) + 1);
    }
    const termo = buscaDemanda.trim().toLowerCase();
    return [...mapa.entries()]
      .filter(([nome]) => !termo || nome.toLowerCase().includes(termo))
      .sort((a, b) => b[1] - a[1]);
  }, [buscaDemanda]);

  const totalRadar = documentosDoRadar().length;
  const semDemanda = documentosDoRadar().filter((a) => !a.demanda).length;

  return (
    <div className="arq">
      <div className="arq-topo">
        <div>
          <h1 className="saudacao">Meus arquivos</h1>
          <p className="saudacao-sub">
            Seus documentos do Google Drive, organizados e sempre à mão.
          </p>
        </div>

        <div className="arq-topo-direita">
          <div className="arq-busca">
            <IconeBusca size={17} />
            <input
              className="entrada"
              placeholder="Buscar arquivos, pastas ou demandas…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <button
            className="btn-icone arq-btn-filtro"
            onClick={() => aindaNao('O filtro avançado')}
            aria-label="Filtros"
            title="Filtros"
          >
            <IconeFiltro size={18} />
          </button>
          <div className="arq-conta">
            <LogoDrive size={26} />
            <div>
              <div className="arq-conta-estado">
                <span className="arq-ponto-verde" aria-hidden="true" />
                Google Drive conectado
              </div>
              <div className="arq-conta-email">{sessao.email}</div>
            </div>
          </div>
        </div>
      </div>

      <nav className="arq-abas" role="tablist">
        {ABAS.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={aba === a.id}
            className={`arq-aba${aba === a.id ? ' ativa' : ''}`}
            onClick={() => {
              setAba(a.id);
              setSelecionado(null);
              if (a.id !== 'pastas' && a.id !== 'todos') setPastaAtual(RAIZ);
            }}
          >
            {a.rotulo}
          </button>
        ))}
      </nav>

      <div className="arq-acoes-barra">
        {aba === 'pastas' ? (
          <>
            <button className="btn btn-primario" onClick={() => aindaNao('Criar pasta')}>
              <IconeMais size={17} /> Nova pasta <IconeBaixo size={15} />
            </button>
            <button className="btn btn-secundario" onClick={() => aindaNao('O atalho')}>
              <IconeMarcador size={17} /> Adicionar atalho no Radar
            </button>
            <button className="btn btn-plano" onClick={() => aindaNao('Conectar outra conta')}>
              <IconeLink size={17} /> Conectar outra conta
            </button>
          </>
        ) : aba === 'radar' ? (
          <>
            <button className="btn btn-primario" onClick={() => aindaNao('Criar arquivo')}>
              <IconeMais size={17} /> Novo <IconeBaixo size={15} />
            </button>
            <button className="btn btn-secundario" onClick={() => aindaNao('Adicionar do Drive')}>
              <LogoDrive size={17} /> Adicionar do Google Drive
            </button>
            <button className="btn btn-secundario" onClick={() => aindaNao('O upload')}>
              <IconeNuvem size={17} /> Upload do computador
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-primario" onClick={() => aindaNao('Criar arquivo')}>
              <IconeMais size={17} /> Novo <IconeBaixo size={15} />
            </button>
            <button className="btn btn-secundario" onClick={() => aindaNao('O upload')}>
              <IconeEnviar size={17} /> Carregar arquivo
            </button>
            <button className="btn btn-secundario" onClick={() => aindaNao('Adicionar do Drive')}>
              <LogoDrive size={17} /> Adicionar do Google Drive <IconeBaixo size={15} />
            </button>
          </>
        )}

        <div className="arq-visao">
          <button
            className={`arq-visao-btn${!emGrade ? ' ativa' : ''}`}
            onClick={() => setEmGrade(false)}
            aria-label="Ver em lista" title="Ver em lista"
          >
            <IconeLista size={17} />
          </button>
          <button
            className={`arq-visao-btn${emGrade ? ' ativa' : ''}`}
            onClick={() => setEmGrade(true)}
            aria-label="Ver em grade" title="Ver em grade"
          >
            <IconeGrade size={17} />
          </button>
        </div>
      </div>

      <div className={`arq-corpo${selecionado ? ' com-painel' : ''}`}>
        <aside className="arq-lateral">
          {aba === 'radar' ? (
            <FiltrosDoRadar
              origem={origem} aoMudarOrigem={setOrigem}
              tipo={tipoFiltro} aoMudarTipo={setTipoFiltro}
              demandas={demandas} demandaAtual={demandaFiltro}
              aoMudarDemanda={setDemandaFiltro}
              busca={buscaDemanda} aoBuscar={setBuscaDemanda}
              total={totalRadar} semDemanda={semDemanda}
            />
          ) : (
            <ArvoreDoDrive
              pastas={pastas}
              pastaAtual={pastaAtual}
              abertas={abertas}
              aoAbrirPasta={(id) => { setPastaAtual(id); setSelecionado(null); }}
              aoAlternar={(id) => setAbertas((a) => {
                const nova = new Set(a);
                if (nova.has(id)) nova.delete(id); else nova.add(id);
                return nova;
              })}
              aoIrPara={(destino) => { setAba(destino); setSelecionado(null); }}
            />
          )}
        </aside>

        <section className="arq-lista-area">
          {aba === 'pastas' && pastaAtual === RAIZ ? (
            <GradeDePastas
              pastas={itens}
              aoAbrir={abrir}
              selecionado={selecionado}
            />
          ) : aba === 'radar' ? (
            <ListaDoRadar itens={itens} selecionado={selecionado} aoSelecionar={setSelecionado} />
          ) : (
            <>
              <div className="arq-caminho">
                <button className="arq-caminho-item" onClick={() => setPastaAtual(RAIZ)}>
                  Meu Drive
                </button>
                {caminho.map((p) => (
                  <span key={p.id} className="arq-caminho-parte">
                    <IconeDireita size={14} />
                    <button
                      className={`arq-caminho-item${p.id === pastaAtual ? ' atual' : ''}`}
                      onClick={() => setPastaAtual(p.id)}
                    >
                      {p.nome}
                    </button>
                  </span>
                ))}
              </div>

              {emGrade ? (
                <GradeDePastas pastas={itens} aoAbrir={abrir} selecionado={selecionado} />
              ) : (
                <ListaDeArquivos
                  itens={itens}
                  selecionado={selecionado}
                  aoAbrir={abrir}
                  aoMenu={() => aindaNao('Este menu')}
                />
              )}
            </>
          )}
        </section>

        {selecionado && (
          <PainelArquivo
            arquivo={selecionado}
            aoFechar={() => setSelecionado(null)}
            notificar={notificar}
          />
        )}
      </div>
    </div>
  );
}

/* ══ Árvore lateral ══════════════════════════════════════════════════════ */

function ArvoreDoDrive({
  pastas,
  pastaAtual,
  abertas,
  aoAbrirPasta,
  aoAlternar,
  aoIrPara,
}: {
  pastas: ArquivoDrive[];
  pastaAtual: string;
  abertas: Set<string>;
  aoAbrirPasta: (id: string) => void;
  aoAlternar: (id: string) => void;
  aoIrPara: (aba: AbaArquivos) => void;
}) {
  const raizAberta = abertas.has(RAIZ);

  return (
    <>
      <div className="arq-bloco">
        <div className="arq-bloco-titulo">
          <LogoDrive size={20} /> Google Drive · MSA
        </div>

        <ul className="arq-arvore">
          <li>
            <div className={`arq-no${pastaAtual === RAIZ ? ' ativo' : ''}`}>
              <button
                className="arq-no-seta"
                onClick={() => aoAlternar(RAIZ)}
                aria-label={raizAberta ? 'Recolher' : 'Expandir'}
              >
                {raizAberta ? <IconeBaixo size={14} /> : <IconeDireita size={14} />}
              </button>
              <button className="arq-no-rotulo" onClick={() => aoAbrirPasta(RAIZ)}>
                <IconePasta size={16} /> Meu Drive
              </button>
            </div>

            {raizAberta && (
              <ul className="arq-arvore-filhos">
                {pastas.map((p) => (
                  <li key={p.id}>
                    <div className={`arq-no${pastaAtual === p.id ? ' ativo' : ''}`}>
                      <button
                        className="arq-no-seta"
                        onClick={() => aoAlternar(p.id)}
                        aria-label="Expandir"
                      >
                        <IconeDireita size={14} />
                      </button>
                      <button className="arq-no-rotulo" onClick={() => aoAbrirPasta(p.id)}>
                        <IconePasta size={16} /> {p.nome.replace(/^\d+ - /, '')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </li>
        </ul>

        <ul className="arq-arvore arq-arvore-extra">
          <li>
            <button className="arq-no-rotulo" onClick={() => aoIrPara('compartilhados')}>
              <IconeEquipe size={16} /> Compartilhados comigo
            </button>
          </li>
          <li>
            <button className="arq-no-rotulo" onClick={() => aoIrPara('recentes')}>
              <IconeRelogio size={16} /> Recentes
            </button>
          </li>
          <li>
            <button className="arq-no-rotulo" onClick={() => aoIrPara('favoritos')}>
              <IconeEstrela size={16} /> Com estrela
            </button>
          </li>
          <li>
            <span className="arq-no-rotulo arq-no-inerte">
              <IconeLixeira size={16} /> Lixeira
            </span>
          </li>
        </ul>
      </div>

      <div className="arq-bloco">
        <div className="arq-bloco-titulo simples">Pastas do Radar</div>
        <ul className="arq-arvore arq-arvore-extra">
          <li>
            <button className="arq-no-rotulo" onClick={() => aoIrPara('radar')}>
              <IconePasta size={16} /> Documentos das Demandas
            </button>
          </li>
          <li>
            <button className="arq-no-rotulo" onClick={() => aoIrPara('favoritos')}>
              <IconePasta size={16} /> Favoritos
            </button>
          </li>
          <li>
            <button className="arq-no-rotulo" onClick={() => aoIrPara('todos')}>
              <IconePasta size={16} /> Meus Arquivos
            </button>
          </li>
        </ul>
      </div>

      <div className="arq-armazenamento">
        <div className="arq-armazenamento-topo">Armazenamento (Google Drive)</div>
        <div className="arq-armazenamento-trilho">
          <span
            className="arq-armazenamento-barra"
            style={{ width: `${(ARMAZENAMENTO.usado / ARMAZENAMENTO.total) * 100}%` }}
          />
        </div>
        <div className="arq-armazenamento-texto">{ARMAZENAMENTO.rotulo}</div>
      </div>
    </>
  );
}

/* ══ Lista de arquivos ═══════════════════════════════════════════════════ */

function ListaDeArquivos({
  itens,
  selecionado,
  aoAbrir,
  aoMenu,
}: {
  itens: ArquivoDrive[];
  selecionado: ArquivoDrive | null;
  aoAbrir: (a: ArquivoDrive) => void;
  aoMenu: () => void;
}) {
  if (itens.length === 0) {
    return (
      <div className="vazio">
        <div className="vazio-icone">📁</div>
        <div className="vazio-titulo">Nada por aqui</div>
        <p className="vazio-texto">Nenhum arquivo corresponde ao que você procurou.</p>
      </div>
    );
  }

  return (
    <div className="tabela-envolvente">
      <table className="tabela arq-tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th className="col-estreita">Última modificação</th>
            <th className="col-estreita">Tamanho</th>
            <th className="col-estreita" />
          </tr>
        </thead>
        <tbody>
          {itens.map((a) => (
            <tr
              key={a.id}
              className={`linha-clicavel${selecionado?.id === a.id ? ' arq-linha-ativa' : ''}`}
              onClick={() => aoAbrir(a)}
            >
              <td>
                <span className="arq-nome-celula">
                  <ArquivoIcone tipo={a.tipo} size={17} />
                  <span className="arq-nome">{a.nome}</span>
                </span>
              </td>
              <td className="col-estreita texto-suave">{dataLegivel(a.modificadoEm)}</td>
              <td className="col-estreita texto-suave">{tamanhoLegivel(a.tamanho)}</td>
              <td className="col-estreita">
                <button
                  className="btn-icone"
                  onClick={(e) => { e.stopPropagation(); aoMenu(); }}
                  aria-label={`Ações de ${a.nome}`}
                >
                  <IconeMaisTres size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ══ Grade de pastas ═════════════════════════════════════════════════════ */

function GradeDePastas({
  pastas,
  aoAbrir,
  selecionado,
}: {
  pastas: ArquivoDrive[];
  aoAbrir: (a: ArquivoDrive) => void;
  selecionado: ArquivoDrive | null;
}) {
  if (pastas.length === 0) {
    return (
      <div className="vazio">
        <div className="vazio-icone">📁</div>
        <div className="vazio-titulo">Nada por aqui</div>
        <p className="vazio-texto">Nenhuma pasta corresponde ao que você procurou.</p>
      </div>
    );
  }

  return (
    <>
      <div className="arq-grade-topo">
        <span className="arq-grade-titulo">
          <ArquivoIcone tipo="pasta" size={18} />
          <span>
            <strong>MSA</strong>
            <span className="arq-grade-sub">
              Pasta no Google Drive · {pastas.filter((p) => p.tipo === 'pasta').length} pastas,{' '}
              {pastas.reduce((s, p) => s + contarArquivos(p.id), 0)} arquivos
            </span>
          </span>
        </span>
        <span className="arq-ordenar">
          Última modificação <IconeOrdenar size={15} />
        </span>
      </div>

      <div className="arq-grade">
        {pastas.map((p) => (
          <button
            key={p.id}
            className={`arq-cartao${selecionado?.id === p.id ? ' ativo' : ''}`}
            onClick={() => aoAbrir(p)}
          >
            <ArquivoIcone tipo={p.tipo} size={26} />
            <span className="arq-cartao-nome">{p.nome}</span>
            <span className="arq-cartao-meta">
              {p.tipo === 'pasta'
                ? `${contarArquivos(p.id)} ${contarArquivos(p.id) === 1 ? 'arquivo' : 'arquivos'}`
                : tamanhoLegivel(p.tamanho)}
              {' · '}{dataLegivel(p.modificadoEm).slice(0, 10)}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

/* ══ Documentos do Radar ═════════════════════════════════════════════════ */

function FiltrosDoRadar({
  origem, aoMudarOrigem,
  tipo, aoMudarTipo,
  demandas, demandaAtual, aoMudarDemanda,
  busca, aoBuscar,
  total, semDemanda,
}: {
  origem: OrigemArquivo | 'todas';
  aoMudarOrigem: (o: OrigemArquivo | 'todas') => void;
  tipo: TipoArquivo | 'todos';
  aoMudarTipo: (t: TipoArquivo | 'todos') => void;
  demandas: [string, number][];
  demandaAtual: string;
  aoMudarDemanda: (d: string) => void;
  busca: string;
  aoBuscar: (b: string) => void;
  total: number;
  semDemanda: number;
}) {
  const porOrigem = (o: OrigemArquivo) => documentosDoRadar().filter((a) => a.origem === o).length;
  const porTipo = (t: TipoArquivo) => documentosDoRadar().filter((a) => a.tipo === t).length;

  return (
    <>
      <div className="arq-bloco">
        <div className="arq-bloco-titulo simples">Origem</div>
        <ul className="arq-filtros">
          <li>
            <button
              className={`arq-filtro${origem === 'todas' ? ' ativo' : ''}`}
              onClick={() => aoMudarOrigem('todas')}
            >
              <span>Todos</span><span className="arq-filtro-conta">{total}</span>
            </button>
          </li>
          {(['upload', 'radar', 'drive'] as OrigemArquivo[]).map((o) => (
            <li key={o}>
              <button
                className={`arq-filtro${origem === o ? ' ativo' : ''}`}
                onClick={() => aoMudarOrigem(o)}
              >
                <span>
                  {o === 'upload' ? 'Anexos de demandas'
                    : o === 'radar' ? 'Criados no Radar'
                    : 'Importados do Drive'}
                </span>
                <span className="arq-filtro-conta">{porOrigem(o)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="arq-bloco">
        <div className="arq-bloco-titulo simples">Tipo de arquivo</div>
        <ul className="arq-filtros">
          {ROTULO_TIPO_FILTRO.map((t) => (
            <li key={t.id}>
              <button
                className={`arq-filtro${tipo === t.id ? ' ativo' : ''}`}
                onClick={() => aoMudarTipo(t.id)}
              >
                <span>{t.rotulo}</span>
                <span className="arq-filtro-conta">
                  {t.id === 'todos' ? total : porTipo(t.id as TipoArquivo)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="arq-bloco">
        <div className="arq-bloco-titulo simples">Demandas</div>
        <div className="arq-busca arq-busca-lateral">
          <IconeBusca size={15} />
          <input
            className="entrada"
            placeholder="Buscar demanda…"
            value={busca}
            onChange={(e) => aoBuscar(e.target.value)}
          />
        </div>
        <ul className="arq-filtros">
          <li>
            <button
              className={`arq-filtro${demandaAtual === 'todas' ? ' ativo' : ''}`}
              onClick={() => aoMudarDemanda('todas')}
            >
              <span>Todas as demandas</span><span className="arq-filtro-conta">{total}</span>
            </button>
          </li>
          {demandas.map(([nome, quantos]) => (
            <li key={nome}>
              <button
                className={`arq-filtro${demandaAtual === nome ? ' ativo' : ''}`}
                onClick={() => aoMudarDemanda(nome)}
                title={nome}
              >
                <span className="arq-filtro-nome">{nome}</span>
                <span className="arq-filtro-conta">{quantos}</span>
              </button>
            </li>
          ))}
          <li>
            <button
              className={`arq-filtro${demandaAtual === 'sem' ? ' ativo' : ''}`}
              onClick={() => aoMudarDemanda('sem')}
            >
              <span>Sem demanda</span><span className="arq-filtro-conta">{semDemanda}</span>
            </button>
          </li>
        </ul>
      </div>
    </>
  );
}

function ListaDoRadar({
  itens,
  selecionado,
  aoSelecionar,
}: {
  itens: ArquivoDrive[];
  selecionado: ArquivoDrive | null;
  aoSelecionar: (a: ArquivoDrive) => void;
}) {
  return (
    <>
      <div className="arq-radar-cabecalho">
        <ArquivoIcone tipo="pasta" size={20} />
        <div>
          <div className="arq-radar-titulo">Documentos do Radar</div>
          <div className="arq-radar-sub">
            Arquivos organizados por demanda, que você adicionou ou criou no Radar.
          </div>
        </div>
      </div>

      {itens.length === 0 ? (
        <div className="vazio">
          <div className="vazio-icone">📄</div>
          <div className="vazio-titulo">Nenhum documento</div>
          <p className="vazio-texto">Nenhum arquivo corresponde aos filtros escolhidos.</p>
        </div>
      ) : (
        <div className="tabela-envolvente">
          <table className="tabela arq-tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th className="col-estreita">Demanda</th>
                <th className="col-estreita">Origem</th>
                <th className="col-estreita">Data</th>
                <th className="col-estreita">Tamanho</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((a) => (
                <tr
                  key={a.id}
                  className={`linha-clicavel${selecionado?.id === a.id ? ' arq-linha-ativa' : ''}`}
                  onClick={() => aoSelecionar(a)}
                >
                  <td>
                    <span className="arq-nome-celula">
                      <ArquivoIcone tipo={a.tipo} size={17} />
                      <span className="arq-nome">{a.nome}</span>
                    </span>
                  </td>
                  <td className="col-estreita texto-suave">{a.demanda ?? '—'}</td>
                  <td className="col-estreita">
                    <span className={`arq-selo-origem origem-${a.origem}`}>
                      {ROTULO_ORIGEM[a.origem]}
                    </span>
                  </td>
                  <td className="col-estreita texto-suave">
                    {dataLegivel(a.modificadoEm).slice(0, 10)}
                  </td>
                  <td className="col-estreita texto-suave">{tamanhoLegivel(a.tamanho)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
