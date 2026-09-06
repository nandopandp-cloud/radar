'use client';

import { useMemo, useState } from 'react';
import type { Demanda } from '@/components/Painel';
import { SeloPrioridade, SeloStatus, Vazio } from '@/components/ui';
import { STATUS, ROTULO_STATUS, PESO_PRIORIDADE, type Prioridade } from '@/lib/dominio';
import { formatarDiaCurto } from '@/lib/datas';

type Filtro = 'POSTERGADAS' | 'PENDENTES' | 'TODAS' | 'CONCLUIDAS';

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'POSTERGADAS', rotulo: 'Postergadas' },
  { id: 'PENDENTES', rotulo: 'Pendentes' },
  { id: 'CONCLUIDAS', rotulo: 'Concluídas' },
  { id: 'TODAS', rotulo: 'Todas' },
];

export function ListaDemandas({
  demandas,
  proximoDia,
  aoAtualizar,
  notificar,
}: {
  demandas: Demanda[];
  proximoDia: string;
  aoAtualizar: () => Promise<void> | void;
  notificar: (texto: string, tipo?: 'ok' | 'erro' | 'info') => void;
}) {
  const [filtro, setFiltro] = useState<Filtro>('POSTERGADAS');
  const [ocupado, setOcupado] = useState<string | null>(null);

  const visiveis = useMemo(() => {
    const pendente = (d: Demanda) => d.status === 'ABERTA' || d.status === 'EM_ANDAMENTO';
    const lista = demandas.filter((d) => {
      const dia = d.dataPrevista.slice(0, 10);
      if (filtro === 'POSTERGADAS') return pendente(d) && dia < proximoDia;
      if (filtro === 'PENDENTES') return pendente(d);
      if (filtro === 'CONCLUIDAS') return d.status === 'CONCLUIDA';
      return true;
    });

    return lista.sort((a, b) => {
      const da = a.dataPrevista.slice(0, 10);
      const db = b.dataPrevista.slice(0, 10);
      if (da !== db) return da.localeCompare(db);
      const pa = PESO_PRIORIDADE[a.prioridade as Prioridade] ?? 9;
      const pb = PESO_PRIORIDADE[b.prioridade as Prioridade] ?? 9;
      return pa - pb;
    });
  }, [demandas, filtro, proximoDia]);

  async function mudarStatus(id: string, status: string) {
    setOcupado(id);
    try {
      const res = await fetch(`/api/demandas/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Não foi possível atualizar.');
      notificar(`Status alterado para ${ROTULO_STATUS[status as keyof typeof ROTULO_STATUS]}.`, 'ok');
      await aoAtualizar();
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro.', 'erro');
    } finally {
      setOcupado(null);
    }
  }

  async function excluir(id: string, titulo: string) {
    if (!confirm(`Excluir a demanda "${titulo}"? Esta ação não pode ser desfeita.`)) return;
    setOcupado(id);
    try {
      const res = await fetch(`/api/demandas/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Não foi possível excluir.');
      notificar('Demanda excluída.', 'ok');
      await aoAtualizar();
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro.', 'erro');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="cartao">
      <div className="cartao-cabecalho">
        <div>
          <div className="cartao-titulo">Demandas</div>
          <div className="cartao-desc">
            {visiveis.length} {visiveis.length === 1 ? 'registro' : 'registros'} em exibição
          </div>
        </div>
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
      </div>

      {visiveis.length === 0 ? (
        <Vazio
          icone={filtro === 'POSTERGADAS' ? '🎉' : '📋'}
          titulo={filtro === 'POSTERGADAS' ? 'Nada postergado' : 'Nenhuma demanda aqui'}
          texto={
            filtro === 'POSTERGADAS'
              ? 'Nenhuma demanda pendente ficou para trás. Todo o time está em dia.'
              : 'Registre uma demanda no formulário ao lado para vê-la nesta lista.'
          }
        />
      ) : (
        <div className="tabela-envolvente">
          <table className="tabela">
            <thead>
              <tr>
                <th className="col-demanda">Demanda</th>
                <th>Responsável</th>
                <th className="col-estreita">Prioridade</th>
                <th className="col-estreita">Prevista</th>
                <th className="col-estreita">Status</th>
                <th className="col-estreita" style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((d) => {
                const dia = d.dataPrevista.slice(0, 10);
                const atrasada =
                  dia < proximoDia && (d.status === 'ABERTA' || d.status === 'EM_ANDAMENTO');
                return (
                  <tr key={d.id} style={ocupado === d.id ? { opacity: 0.5 } : undefined}>
                    <td className="col-demanda">
                      <div className="celula-titulo">{d.titulo}</div>
                      {d.descricao && <div className="celula-sub">{d.descricao}</div>}
                      {d.solicitante && (
                        <div className="celula-sub">Solicitante: {d.solicitante}</div>
                      )}
                    </td>
                    <td>
                      <div className="celula-titulo">{d.colaborador.nome}</div>
                      <div className="celula-sub">{d.colaborador.email}</div>
                    </td>
                    <td className="col-estreita"><SeloPrioridade valor={d.prioridade} /></td>
                    <td className="col-estreita">
                      <div>{formatarDiaCurto(dia)}</div>
                      {d.vezesAdiada > 0 && (
                        <div className="celula-sub">
                          <span className="selo selo-atraso" style={{ marginTop: 3 }}>
                            adiada {d.vezesAdiada}×
                          </span>
                        </div>
                      )}
                      {atrasada && d.vezesAdiada === 0 && (
                        <div className="celula-sub" style={{ color: 'var(--erro)' }}>
                          em atraso
                        </div>
                      )}
                    </td>
                    <td className="col-estreita">
                      <select
                        className="selecao"
                        style={{ padding: '5px 8px', fontSize: 12.5, minWidth: 128 }}
                        value={d.status}
                        disabled={ocupado === d.id}
                        onChange={(e) => mudarStatus(d.id, e.target.value)}
                      >
                        {STATUS.map((s) => (
                          <option key={s} value={s}>{ROTULO_STATUS[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="col-estreita" style={{ textAlign: 'right' }}>
                      {d.status !== 'CONCLUIDA' && (
                        <button
                          className="btn btn-mini btn-secundario"
                          disabled={ocupado === d.id}
                          onClick={() => mudarStatus(d.id, 'CONCLUIDA')}
                          title="Marcar como concluída"
                        >
                          ✓ Concluir
                        </button>
                      )}{' '}
                      <button
                        className="btn btn-mini btn-perigo"
                        disabled={ocupado === d.id}
                        onClick={() => excluir(d.id, d.titulo)}
                        title="Excluir demanda"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
