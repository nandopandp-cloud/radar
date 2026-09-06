'use client';

import { useMemo, useState } from 'react';
import { IconeMais } from '@/components/icones';
import {
  COR_SITUACAO, PESO_SITUACAO, ROTULO_PRIORIDADE, ROTULO_SITUACAO,
  situacaoDe, type Prioridade, type Situacao,
} from '@/lib/dominio';
import { formatarDiaCurto } from '@/lib/datas';
import type { Demanda, SessaoUI, Usuario } from '@/lib/tipos';

type Filtro = 'ATRASADAS' | 'ABERTAS' | 'CONCLUIDAS' | 'TODAS';

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'ATRASADAS', rotulo: 'Atrasadas' },
  { id: 'ABERTAS', rotulo: 'Em aberto' },
  { id: 'CONCLUIDAS', rotulo: 'Concluídas' },
  { id: 'TODAS', rotulo: 'Todas' },
];

export function TelaDemandas({
  sessao,
  demandas,
  equipe,
  hoje,
  autorFiltro,
  aoMudarAutor,
  aoAbrirDemanda,
  aoNovaDemanda,
}: {
  sessao: SessaoUI;
  demandas: Demanda[];
  equipe: Usuario[];
  hoje: string;
  autorFiltro: string;
  aoMudarAutor: (id: string) => void;
  aoAbrirDemanda: (d: Demanda) => void;
  aoNovaDemanda: (prazo: string) => void;
}) {
  const [filtro, setFiltro] = useState<Filtro>('ATRASADAS');

  const visiveis = useMemo(() => {
    const comSituacao = demandas.map((d) => ({
      d,
      situacao: situacaoDe(d.status, d.prazo.slice(0, 10), hoje),
    }));
    const lista = comSituacao.filter(({ situacao }) => {
      if (filtro === 'ATRASADAS') return situacao === 'ATRASADA';
      if (filtro === 'ABERTAS') return ['PENDENTE', 'EM_ANDAMENTO', 'ATRASADA'].includes(situacao);
      if (filtro === 'CONCLUIDAS') return situacao === 'CONCLUIDA';
      return true;
    });
    return lista.sort((a, b) => {
      const p = PESO_SITUACAO[a.situacao] - PESO_SITUACAO[b.situacao];
      return p !== 0 ? p : a.d.prazo.localeCompare(b.d.prazo);
    });
  }, [demandas, filtro, hoje]);

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
            {FILTROS.map((f) => (
              <button
                key={f.id}
                className={`btn btn-mini ${filtro === f.id ? 'btn-primario' : 'btn-secundario'}`}
                onClick={() => setFiltro(f.id)}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
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

        {visiveis.length === 0 ? (
          <div className="vazio">
            <div className="vazio-icone">{filtro === 'ATRASADAS' ? '🎉' : '📋'}</div>
            <div className="vazio-titulo">
              {filtro === 'ATRASADAS' ? 'Nada atrasado' : 'Nenhuma demanda aqui'}
            </div>
            <p className="vazio-texto">
              {filtro === 'ATRASADAS'
                ? 'Todos os prazos estão em dia. Nenhum alerta será enviado.'
                : 'Crie uma demanda pelo calendário ou pelo botão acima.'}
            </p>
          </div>
        ) : (
          <div className="tabela-envolvente">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Demanda</th>
                  {sessao.perfil === 'ADMIN' && <th>Responsável</th>}
                  <th className="col-estreita">Categoria</th>
                  <th className="col-estreita">Prioridade</th>
                  <th className="col-estreita">Prazo</th>
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
