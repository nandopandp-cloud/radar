'use client';

import { useEffect, useState } from 'react';
import {
  IconeAlerta, IconeBandeira, IconeCalendario, IconeCheck, IconeCheckCirculo,
  IconeCirculo, IconeDocumento, IconeEtiqueta, IconeLapis, IconeLixeira,
  IconeUsuario, IconeX,
} from '@/components/icones';
import {
  CATEGORIAS, PRIORIDADES, ROTULO_PRIORIDADE, ROTULO_SITUACAO, STATUS,
  ROTULO_STATUS, situacaoDe, type Prioridade, type Status,
} from '@/lib/dominio';
import { formatarDiaExtenso } from '@/lib/datas';
import type { Demanda, Notificar } from '@/lib/tipos';

export function GavetaDemanda({
  demanda,
  hoje,
  podeEditar,
  aoFechar,
  aoAtualizar,
  notificar,
}: {
  demanda: Demanda;
  hoje: string;
  podeEditar: boolean;
  aoFechar: () => void;
  aoAtualizar: () => Promise<void> | void;
  notificar: Notificar;
}) {
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
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

  async function excluir() {
    if (!confirm(`Excluir "${demanda.titulo}"? Esta ação não pode ser desfeita.`)) return;
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
        </div>

        <div className="gaveta-corpo">
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
        </div>

        {podeEditar && (
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
