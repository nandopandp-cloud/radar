'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconeLista, IconeMais, IconeQuadro } from '@/components/icones';
import { QuadroDemandas } from '@/components/QuadroDemandas';
import {
  COR_SITUACAO, PESO_SITUACAO, ROTULO_PRIORIDADE, ROTULO_SITUACAO,
  situacaoDe, type Prioridade, type Situacao,
} from '@/lib/dominio';
import { fimDoMes, formatarDiaCompleto, formatarDiaCurto, inicioDoMes, somarDias } from '@/lib/datas';
import type { Demanda, SessaoUI, Usuario } from '@/lib/tipos';

type Filtro = 'ATRASADAS' | 'ABERTAS' | 'CONCLUIDAS' | 'TODAS';

/** Como as demandas são exibidas: quadro de cartões ou tabela. */
type Visao = 'QUADRO' | 'LISTA';

/** Guardamos a escolha para que a tela volte do jeito que o usuário deixou. */
const CHAVE_VISAO = 'radar:visao-demandas';

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'ATRASADAS', rotulo: 'Atrasadas' },
  { id: 'ABERTAS', rotulo: 'Em aberto' },
  { id: 'CONCLUIDAS', rotulo: 'Concluídas' },
  { id: 'TODAS', rotulo: 'Todas' },
];

/** Atalhos de período. 'PERSONALIZADO' abre os campos de data. */
type Periodo = 'SEMPRE' | 'HOJE' | 'SEMANA' | 'MES' | 'PERSONALIZADO';

const PERIODOS: { id: Periodo; rotulo: string }[] = [
  { id: 'SEMPRE', rotulo: 'Qualquer data' },
  { id: 'HOJE', rotulo: 'Hoje' },
  { id: 'SEMANA', rotulo: 'Próximos 7 dias' },
  { id: 'MES', rotulo: 'Este mês' },
  { id: 'PERSONALIZADO', rotulo: 'Escolher período' },
];

/**
 * Converte o atalho escolhido em um intervalo de prazo (inclusivo nas pontas).
 * Devolve null quando não há recorte por data.
 */
function intervaloDoPeriodo(
  periodo: Periodo,
  hoje: string,
  de: string,
  ate: string,
): { de: string; ate: string } | null {
  if (periodo === 'HOJE') return { de: hoje, ate: hoje };
  if (periodo === 'SEMANA') return { de: hoje, ate: somarDias(hoje, 6) };
  if (periodo === 'MES') return { de: inicioDoMes(hoje), ate: fimDoMes(hoje) };
  if (periodo === 'PERSONALIZADO') {
    if (!de && !ate) return null;
    // Um lado vazio vira intervalo aberto: "a partir de" ou "até".
    return { de: de || '0000-01-01', ate: ate || '9999-12-31' };
  }
  return null;
}

export function TelaDemandas({
  sessao,
  demandas,
  equipe,
  hoje,
  autorFiltro,
  aoMudarAutor,
  aoAbrirDemanda,
  aoNovaDemanda,
  aoMoverDemanda,
}: {
  sessao: SessaoUI;
  demandas: Demanda[];
  equipe: Usuario[];
  hoje: string;
  autorFiltro: string;
  aoMudarAutor: (id: string) => void;
  aoAbrirDemanda: (d: Demanda) => void;
  aoNovaDemanda: (prazo: string) => void;
  aoMoverDemanda: (d: Demanda, status: string) => void;
}) {
  const [visao, setVisao] = useState<Visao>('QUADRO');
  const [filtro, setFiltro] = useState<Filtro>('ATRASADAS');
  const [periodo, setPeriodo] = useState<Periodo>('SEMPRE');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  // A preferência vem do navegador, então só pode ser lida depois da hidratação.
  useEffect(() => {
    const salva = localStorage.getItem(CHAVE_VISAO);
    if (salva === 'QUADRO' || salva === 'LISTA') setVisao(salva);
  }, []);

  function trocarVisao(nova: Visao) {
    setVisao(nova);
    localStorage.setItem(CHAVE_VISAO, nova);
    // No quadro as colunas já separam a situação; o filtro de situação atrapalharia.
    if (nova === 'QUADRO') setFiltro('TODAS');
  }

  const intervalo = useMemo(
    () => intervaloDoPeriodo(periodo, hoje, de, ate),
    [periodo, hoje, de, ate],
  );

  const visiveis = useMemo(() => {
    const comSituacao = demandas.map((d) => ({
      d,
      situacao: situacaoDe(d.status, d.prazo.slice(0, 10), hoje),
    }));
    const lista = comSituacao.filter(({ d, situacao }) => {
      if (intervalo) {
        // Comparação de strings YYYY-MM-DD funciona como comparação de datas.
        const prazo = d.prazo.slice(0, 10);
        if (prazo < intervalo.de || prazo > intervalo.ate) return false;
      }
      if (filtro === 'ATRASADAS') return situacao === 'ATRASADA';
      if (filtro === 'ABERTAS') return ['PENDENTE', 'EM_ANDAMENTO', 'ATRASADA'].includes(situacao);
      if (filtro === 'CONCLUIDAS') return situacao === 'CONCLUIDA';
      return true;
    });
    return lista.sort((a, b) => {
      const p = PESO_SITUACAO[a.situacao] - PESO_SITUACAO[b.situacao];
      return p !== 0 ? p : a.d.prazo.localeCompare(b.d.prazo);
    });
  }, [demandas, filtro, hoje, intervalo]);

  /** Descrição do recorte ativo, para o cabeçalho e o estado vazio. */
  const rotuloIntervalo = useMemo(() => {
    if (!intervalo) return null;
    if (intervalo.de === intervalo.ate) return formatarDiaCompleto(intervalo.de);
    const inicio = intervalo.de === '0000-01-01' ? null : formatarDiaCompleto(intervalo.de);
    const fim = intervalo.ate === '9999-12-31' ? null : formatarDiaCompleto(intervalo.ate);
    if (inicio && fim) return `${inicio} até ${fim}`;
    if (inicio) return `a partir de ${inicio}`;
    return `até ${fim}`;
  }, [intervalo]);

  return (
    <>
      <div className="espalhar" style={{ marginBottom: 22 }}>
        <div>
          <h1 className="saudacao">
            {sessao.perfil === 'ADMIN' ? 'Demandas' : 'Minhas demandas'}
          </h1>
          <p className="saudacao-sub">
            {sessao.perfil === 'ADMIN'
              ? 'Todas as demandas lançadas pelo time.'
              : 'Tudo que você lançou, em um só lugar.'}
          </p>
        </div>
        <button className="btn btn-primario" onClick={() => aoNovaDemanda(hoje)}>
          <IconeMais size={18} /> Nova demanda
        </button>
      </div>

      <div className="cartao">
        <div className="cartao-cabecalho com-linha">
          <div className="linha">
            {visao === 'LISTA' ? (
              FILTROS.map((f) => (
                <button
                  key={f.id}
                  className={`btn btn-mini ${filtro === f.id ? 'btn-primario' : 'btn-secundario'}`}
                  onClick={() => setFiltro(f.id)}
                >
                  {f.rotulo}
                </button>
              ))
            ) : (
              <span className="texto-suave">
                {visiveis.length} {visiveis.length === 1 ? 'demanda' : 'demandas'} no quadro
                {sessao.perfil === 'ADMIN' ? '' : ' — arraste os cartões para mudar a situação'}
              </span>
            )}
          </div>
          <div className="linha">
            <div className="alternador" role="group" aria-label="Modo de visualização">
              <button
                className="alternador-opcao"
                aria-pressed={visao === 'QUADRO'}
                onClick={() => trocarVisao('QUADRO')}
              >
                <IconeQuadro size={16} /> Kanban
              </button>
              <button
                className="alternador-opcao"
                aria-pressed={visao === 'LISTA'}
                onClick={() => trocarVisao('LISTA')}
              >
                <IconeLista size={16} /> Lista
              </button>
            </div>
            <select
              className="selecao"
              style={{ width: 'auto', minWidth: 160 }}
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as Periodo)}
              aria-label="Filtrar por período de prazo"
            >
              {PERIODOS.map((p) => (
                <option key={p.id} value={p.id}>{p.rotulo}</option>
              ))}
            </select>
            {sessao.perfil === 'ADMIN' && (
              <select
                className="selecao"
                style={{ width: 'auto', minWidth: 180 }}
                value={autorFiltro}
                onChange={(e) => aoMudarAutor(e.target.value)}
              >
                <option value="TODOS">Todos os analistas</option>
                {equipe.map((u) => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {periodo === 'PERSONALIZADO' && (
          <div className="faixa-periodo">
            <div className="linha" style={{ gap: 10 }}>
              <label className="texto-suave" htmlFor="periodo-de">De</label>
              <input
                id="periodo-de"
                type="date"
                className="entrada"
                style={{ width: 'auto' }}
                value={de}
                max={ate || undefined}
                onChange={(e) => setDe(e.target.value)}
              />
              <label className="texto-suave" htmlFor="periodo-ate">até</label>
              <input
                id="periodo-ate"
                type="date"
                className="entrada"
                style={{ width: 'auto' }}
                value={ate}
                min={de || undefined}
                onChange={(e) => setAte(e.target.value)}
              />
              {(de || ate) && (
                <button
                  className="btn btn-mini btn-secundario"
                  onClick={() => { setDe(''); setAte(''); }}
                >
                  Limpar
                </button>
              )}
            </div>
            <span className="texto-suave">
              {rotuloIntervalo
                ? `${visiveis.length} ${visiveis.length === 1 ? 'demanda' : 'demandas'} · ${rotuloIntervalo}`
                : 'Escolha ao menos uma data.'}
            </span>
          </div>
        )}

        {periodo !== 'SEMPRE' && periodo !== 'PERSONALIZADO' && rotuloIntervalo && (
          <div className="faixa-periodo">
            <span className="texto-suave">
              {visiveis.length} {visiveis.length === 1 ? 'demanda' : 'demandas'} com prazo em{' '}
              {rotuloIntervalo}
            </span>
            <button className="btn btn-mini btn-secundario" onClick={() => setPeriodo('SEMPRE')}>
              Remover filtro de data
            </button>
          </div>
        )}

        {visiveis.length === 0 ? (
          <div className="vazio">
            <div className="vazio-icone">
              {intervalo ? '🔍' : filtro === 'ATRASADAS' ? '🎉' : '📋'}
            </div>
            <div className="vazio-titulo">
              {intervalo
                ? 'Nada neste período'
                : filtro === 'ATRASADAS'
                  ? 'Nada atrasado'
                  : 'Nenhuma demanda aqui'}
            </div>
            <p className="vazio-texto">
              {intervalo
                ? `Nenhuma demanda com prazo em ${rotuloIntervalo}. Ajuste o período ou o filtro de situação.`
                : filtro === 'ATRASADAS'
                  ? 'Todos os prazos estão em dia. Nenhum alerta será enviado.'
                  : 'Crie uma demanda pelo calendário ou pelo botão acima.'}
            </p>
          </div>
        ) : visao === 'QUADRO' ? (
          <QuadroDemandas
            sessao={sessao}
            itens={visiveis}
            hoje={hoje}
            aoAbrirDemanda={aoAbrirDemanda}
            aoNovaDemanda={aoNovaDemanda}
            aoMoverDemanda={aoMoverDemanda}
          />
        ) : (
          <div className="tabela-envolvente">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Demanda</th>
                  {sessao.perfil === 'ADMIN' && <th>Responsável</th>}
                  <th className="col-estreita">Categoria</th>
                  <th className="col-estreita">Prioridade</th>
                  <th className="col-estreita">Início</th>
                  <th className="col-estreita">Entrega</th>
                  <th className="col-estreita">Situação</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map(({ d, situacao }) => (
                  <tr
                    key={d.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => aoAbrirDemanda(d)}
                  >
                    <td>
                      <div className="linha" style={{ gap: 9, flexWrap: 'nowrap' }}>
                        <span className="ponto" style={{ background: COR_SITUACAO[situacao] }} />
                        <div>
                          <div className="celula-titulo">{d.titulo}</div>
                          {d.descricao && <div className="celula-sub">{d.descricao}</div>}
                        </div>
                      </div>
                    </td>
                    {sessao.perfil === 'ADMIN' && (
                      <td className="texto-suave">{d.autor.nome}</td>
                    )}
                    <td className="col-estreita">
                      {d.categoria ? (
                        <span className="selo selo-categoria">{d.categoria}</span>
                      ) : (
                        <span className="texto-suave">—</span>
                      )}
                    </td>
                    <td className="col-estreita">
                      <span className={`selo selo-${d.prioridade}`}>
                        {ROTULO_PRIORIDADE[d.prioridade as Prioridade] ?? d.prioridade}
                      </span>
                    </td>
                    <td className="col-estreita">
                      {d.inicio ? (
                        formatarDiaCurto(d.inicio.slice(0, 10))
                      ) : (
                        <span className="texto-suave">—</span>
                      )}
                    </td>
                    <td className="col-estreita">{formatarDiaCurto(d.prazo.slice(0, 10))}</td>
                    <td className="col-estreita">
                      <span className={`selo selo-${situacao}`}>
                        {ROTULO_SITUACAO[situacao as Situacao]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
