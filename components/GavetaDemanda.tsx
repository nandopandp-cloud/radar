'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  IconeAlerta, IconeBalao, IconeBandeira, IconeCalendario, IconeCheck, IconeCheckCirculo,
  IconeCirculo, IconeClipe, IconeDocumento, IconeEtiqueta, IconeLapis, IconeLixeira,
  IconeRepetir, IconeUsuario, IconeX,
} from '@/components/icones';
import { AnexosDemanda } from '@/components/AnexosDemanda';
import { resumoDaRegra, type Frequencia } from '@/lib/recorrencia';
import { ComentariosDemanda } from '@/components/ComentariosDemanda';
import {
  CATEGORIAS, PRIORIDADES, ROTULO_PRIORIDADE, ROTULO_SITUACAO, STATUS,
  ROTULO_STATUS, situacaoDe, type Prioridade, type Status,
} from '@/lib/dominio';
import { formatarDiaExtenso } from '@/lib/datas';
import { useDialogo } from '@/components/Dialogo';
import type { Anexo, Comentario, Demanda, Notificar, SessaoUI } from '@/lib/tipos';

export function GavetaDemanda({
  demanda,
  hoje,
  sessao,
  podeEditar,
  aoFechar,
  aoAtualizar,
  notificar,
}: {
  demanda: Demanda;
  hoje: string;
  sessao: SessaoUI;
  podeEditar: boolean;
  aoFechar: () => void;
  aoAtualizar: () => Promise<void> | void;
  notificar: Notificar;
}) {
  const { confirmar } = useDialogo();
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState<'detalhes' | 'anexos' | 'comentarios'>('detalhes');
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [form, setForm] = useState({
    titulo: demanda.titulo,
    descricao: demanda.descricao ?? '',
    inicio: demanda.inicio?.slice(0, 10) ?? '',
    prazo: demanda.prazo.slice(0, 10),
    prioridade: demanda.prioridade,
    status: demanda.status,
    categoria: demanda.categoria ?? '',
  });

  // Esc fecha a gaveta.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aoFechar]);

  /*
   * Anexos e comentários vêm juntos ao abrir, para as abas já mostrarem a
   * contagem. Se a busca falhar, as listas ficam vazias e a gaveta continua
   * utilizável — o detalhe da demanda não depende delas.
   */
  const carregarExtras = useCallback(async () => {
    try {
      const [ra, rc] = await Promise.all([
        fetch(`/api/demandas/${demanda.id}/anexos`),
        fetch(`/api/demandas/${demanda.id}/comentarios`),
      ]);
      if (ra.ok) setAnexos(await ra.json());
      if (rc.ok) setComentarios(await rc.json());
    } catch {
      // Silencioso de propósito: um aviso aqui atrapalharia mais que ajudaria.
    }
  }, [demanda.id]);

  useEffect(() => { carregarExtras(); }, [carregarExtras]);

  const prazo = demanda.prazo.slice(0, 10);
  const inicio = demanda.inicio?.slice(0, 10) ?? null;
  const situacao = situacaoDe(demanda.status, prazo, hoje);
  const diasVencido = Math.round(
    (Date.parse(`${hoje}T00:00:00Z`) - Date.parse(`${prazo}T00:00:00Z`)) / 86_400_000,
  );

  async function salvar(dados: Record<string, unknown>, mensagem: string) {
    setSalvando(true);
    try {
      const res = await fetch(`/api/demandas/${demanda.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(dados),
      });
      const corpo = await res.json();
      if (!res.ok) throw new Error(corpo.erro ?? 'Não foi possível salvar.');
      notificar(mensagem, 'ok');
      await aoAtualizar();
      setEditando(false);
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  /** Encerra a série: as demandas já criadas ficam, novas deixam de nascer. */
  async function pararRecorrencia() {
    if (!demanda.recorrencia) return;
    const segue = await confirmar({
      titulo: 'Parar esta recorrência?',
      mensagem: 'As demandas já criadas continuam como estão.',
      detalhes: ['Novas demandas deixam de ser geradas por esta regra.'],
      confirmar: 'Parar recorrência',
      tom: 'aviso',
    });
    if (!segue) return;
    setSalvando(true);
    try {
      const res = await fetch(`/api/recorrencias/${demanda.recorrencia.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ativa: false }),
      });
      if (!res.ok) {
        const corpo = await res.json().catch(() => ({}));
        throw new Error(corpo.erro ?? 'Não foi possível parar a recorrência.');
      }
      notificar('Recorrência encerrada.', 'ok');
      await aoAtualizar();
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    const segue = await confirmar({
      titulo: 'Excluir esta demanda?',
      mensagem: `“${demanda.titulo}” será removida, junto com seus anexos e comentários.`,
      detalhes: ['Esta ação não pode ser desfeita.'],
      confirmar: 'Excluir demanda',
      tom: 'perigo',
    });
    if (!segue) return;
    setSalvando(true);
    try {
      const res = await fetch(`/api/demandas/${demanda.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Não foi possível excluir.');
      notificar('Demanda excluída.', 'ok');
      await aoAtualizar();
      aoFechar();
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro.', 'erro');
      setSalvando(false);
    }
  }

  const faixa =
    situacao === 'ATRASADA'
      ? {
          classe: '',
          titulo: diasVencido === 1 ? 'Prazo vencido há 1 dia' : `Prazo vencido há ${diasVencido} dias`,
          texto: `Esta demanda deveria ter sido entregue em ${formatarDiaExtenso(prazo)}.`,
        }
      : situacao === 'CONCLUIDA'
        ? { classe: ' ok', titulo: 'Demanda concluída', texto: `Entregue dentro do prazo de ${formatarDiaExtenso(prazo)}.` }
        : {
            classe: ' neutra',
            titulo: prazo === hoje ? 'Vence hoje' : 'Dentro do prazo',
            texto: `Prazo de entrega: ${formatarDiaExtenso(prazo)}.`,
          };

  return (
    <>
      <div className="veu" onClick={aoFechar} />
      <aside className="gaveta" role="dialog" aria-label="Detalhe da demanda">
        <div className="gaveta-topo">
          <button className="btn-icone gaveta-fechar" onClick={aoFechar} aria-label="Fechar">
            <IconeX size={20} />
          </button>

          {editando ? (
            <input
              className="entrada"
              style={{ fontSize: 18, fontWeight: 700 }}
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          ) : (
            <div className="linha" style={{ gap: 10, paddingRight: 36 }}>
              <span className="gaveta-titulo" style={{ padding: 0 }}>{demanda.titulo}</span>
              <span className={`selo selo-${situacao}`}>{ROTULO_SITUACAO[situacao]}</span>
            </div>
          )}
          <div className="gaveta-meta">
            Criada em {formatarDiaExtenso(demanda.criadoEm.slice(0, 10))}
            {demanda.vezesAlertada > 0 &&
              ` · ${demanda.vezesAlertada} ${demanda.vezesAlertada === 1 ? 'aviso enviado' : 'avisos enviados'}`}
          </div>

          {/* Nasceu de uma regra: o selo diz qual, e deixa parar a série. */}
          {demanda.recorrencia && (
            <div className={`selo-recorrencia${demanda.recorrencia.ativa ? '' : ' encerrada'}`}>
              <IconeRepetir size={15} />
              <span className="selo-recorrencia-texto">
                {resumoDaRegra({
                  frequencia: demanda.recorrencia.frequencia as Frequencia,
                  intervalo: demanda.recorrencia.intervalo,
                  diasSemana: demanda.recorrencia.diasSemana,
                  diaDoMes: demanda.recorrencia.diaDoMes,
                  apenasDiasUteis: demanda.recorrencia.apenasDiasUteis,
                  inicio: demanda.recorrencia.inicio.slice(0, 10),
                  fim: null,
                  maximo: null,
                })}
                {!demanda.recorrencia.ativa && ' · encerrada'}
              </span>
              {podeEditar && demanda.recorrencia.ativa && (
                <button
                  type="button"
                  className="selo-recorrencia-parar"
                  disabled={salvando}
                  onClick={pararRecorrencia}
                >
                  Parar
                </button>
              )}
            </div>
          )}

          {/* Editar ocupa a gaveta inteira; as abas só fazem sentido fora dele. */}
          {!editando && (
            <div className="gaveta-abas" role="tablist">
              <button
                role="tab" aria-selected={aba === 'detalhes'}
                className={`gaveta-aba${aba === 'detalhes' ? ' ativa' : ''}`}
                onClick={() => setAba('detalhes')}
              >
                <IconeDocumento size={16} /> Detalhes
              </button>
              <button
                role="tab" aria-selected={aba === 'anexos'}
                className={`gaveta-aba${aba === 'anexos' ? ' ativa' : ''}`}
                onClick={() => setAba('anexos')}
              >
                <IconeClipe size={16} /> Anexos
                {anexos.length > 0 && <span className="gaveta-aba-conta">{anexos.length}</span>}
              </button>
              <button
                role="tab" aria-selected={aba === 'comentarios'}
                className={`gaveta-aba${aba === 'comentarios' ? ' ativa' : ''}`}
                onClick={() => setAba('comentarios')}
              >
                <IconeBalao size={16} /> Comentários
                {comentarios.length > 0 && (
                  <span className="gaveta-aba-conta">{comentarios.length}</span>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="gaveta-corpo">
          {aba === 'anexos' && !editando && (
            <AnexosDemanda
              demandaId={demanda.id}
              anexos={anexos}
              podeMexer={podeEditar}
              aoMudar={setAnexos}
              notificar={notificar}
              mostrarDrive={sessao.recursosExperimentais === true}
            />
          )}

          {aba === 'comentarios' && !editando && (
            <ComentariosDemanda
              demandaId={demanda.id}
              comentarios={comentarios}
              sessao={sessao}
              aoMudar={setComentarios}
              notificar={notificar}
            />
          )}

          {(aba === 'detalhes' || editando) && (
          <>
          <div className={`faixa-prazo${faixa.classe}`}>
            <span className="aviso-icone">
              {situacao === 'ATRASADA' ? <IconeAlerta size={20} />
                : situacao === 'CONCLUIDA' ? <IconeCheckCirculo size={20} />
                : <IconeCalendario size={20} />}
            </span>
            <div>
              <div className="faixa-titulo">{faixa.titulo}</div>
              <div className="faixa-texto">{faixa.texto}</div>
            </div>
          </div>

          {editando ? (
            <div className="pilha" style={{ gap: 0 }}>
              <div className="campo">
                <label className="rotulo">Descrição</label>
                <textarea
                  className="area"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
              <div className="campo linha-campos">
                <div>
                  <label className="rotulo">Data de início</label>
                  <input
                    type="date" className="entrada" value={form.inicio}
                    max={form.prazo || undefined}
                    onChange={(e) => {
                      const valor = e.target.value;
                      // Empurra a entrega junto se o início passar dela.
                      setForm((f) => ({
                        ...f,
                        inicio: valor,
                        prazo: valor && valor > f.prazo ? valor : f.prazo,
                      }));
                    }}
                  />
                </div>
                <div>
                  <label className="rotulo">Data de entrega</label>
                  <input
                    type="date" className="entrada" value={form.prazo}
                    min={form.inicio || undefined}
                    onChange={(e) => setForm({ ...form, prazo: e.target.value })}
                  />
                </div>
              </div>
              <div className="campo">
                <label className="rotulo">Categoria</label>
                <select
                  className="selecao" value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                >
                  <option value="">Sem categoria</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="campo linha-campos">
                <div>
                  <label className="rotulo">Prioridade</label>
                  <select
                    className="selecao" value={form.prioridade}
                    onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
                  >
                    {PRIORIDADES.map((p) => <option key={p} value={p}>{ROTULO_PRIORIDADE[p]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="rotulo">Status</label>
                  <select
                    className="selecao" value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    {STATUS.map((s) => <option key={s} value={s}>{ROTULO_STATUS[s]}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="propriedades">
                {inicio && (
                  <div className="propriedade">
                    <span className="propriedade-icone"><IconeCalendario size={18} /></span>
                    <span className="propriedade-rotulo">Data de início</span>
                    <span className="propriedade-valor">{formatarDiaExtenso(inicio)}</span>
                  </div>
                )}
                <div className="propriedade">
                  <span className="propriedade-icone"><IconeCalendario size={18} /></span>
                  <span className="propriedade-rotulo">Data de entrega</span>
                  <span
                    className="propriedade-valor"
                    style={{ color: situacao === 'ATRASADA' ? 'var(--atrasada)' : undefined }}
                  >
                    {formatarDiaExtenso(prazo)}
                  </span>
                </div>
                <div className="propriedade">
                  <span className="propriedade-icone"><IconeUsuario size={18} /></span>
                  <span className="propriedade-rotulo">Responsável</span>
                  <span className="propriedade-valor">{demanda.autor.nome}</span>
                </div>
                {demanda.categoria && (
                  <div className="propriedade">
                    <span className="propriedade-icone"><IconeEtiqueta size={18} /></span>
                    <span className="propriedade-rotulo">Categoria</span>
                    <span className="propriedade-valor">
                      <span className="selo selo-categoria">{demanda.categoria}</span>
                    </span>
                  </div>
                )}
                <div className="propriedade">
                  <span className="propriedade-icone"><IconeBandeira size={18} /></span>
                  <span className="propriedade-rotulo">Prioridade</span>
                  <span className="propriedade-valor">
                    <span className={`selo selo-${demanda.prioridade}`}>
                      {ROTULO_PRIORIDADE[demanda.prioridade as Prioridade] ?? demanda.prioridade}
                    </span>
                  </span>
                </div>
                <div className="propriedade">
                  <span className="propriedade-icone"><IconeCirculo size={18} /></span>
                  <span className="propriedade-rotulo">Status</span>
                  <span className="propriedade-valor">
                    {ROTULO_STATUS[demanda.status as Status] ?? demanda.status}
                  </span>
                </div>
                {demanda.solicitante && (
                  <div className="propriedade">
                    <span className="propriedade-icone"><IconeUsuario size={18} /></span>
                    <span className="propriedade-rotulo">Solicitante</span>
                    <span className="propriedade-valor">{demanda.solicitante}</span>
                  </div>
                )}
              </div>

              {demanda.descricao && (
                <>
                  <div className="secao-titulo"><IconeDocumento size={18} /> Descrição</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--tinta-media)' }}>
                    {demanda.descricao}
                  </p>
                </>
              )}
            </>
          )}
          </>
          )}
        </div>

        {podeEditar && (aba === 'detalhes' || editando) && (
          <div className="gaveta-rodape">
            {editando ? (
              <>
                <button
                  className="btn btn-primario"
                  style={{ flex: 1 }}
                  disabled={salvando}
                  onClick={() => {
                    if (form.inicio && form.inicio > form.prazo) {
                      return notificar('A data de início não pode ser depois da data de entrega.', 'erro');
                    }
                    salvar(form, 'Demanda atualizada.');
                  }}
                >
                  <IconeCheck size={17} /> Salvar
                </button>
                <button className="btn btn-secundario" onClick={() => setEditando(false)}>
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-secundario" onClick={() => setEditando(true)}>
                  <IconeLapis size={17} /> Editar
                </button>
                {demanda.status !== 'CONCLUIDA' ? (
                  <button
                    className="btn btn-sucesso"
                    style={{ flex: 1 }}
                    disabled={salvando}
                    onClick={() => salvar({ status: 'CONCLUIDA' }, 'Demanda concluída.')}
                  >
                    <IconeCheck size={17} /> Marcar como concluída
                  </button>
                ) : (
                  <button
                    className="btn btn-secundario"
                    style={{ flex: 1 }}
                    disabled={salvando}
                    onClick={() => salvar({ status: 'ABERTA' }, 'Demanda reaberta.')}
                  >
                    Reabrir
                  </button>
                )}
                <button className="btn btn-perigo" disabled={salvando} onClick={excluir}>
                  <IconeLixeira size={17} />
                </button>
              </>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
