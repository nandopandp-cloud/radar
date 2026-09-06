'use client';

import { useState } from 'react';
import type { Colaborador } from '@/components/Painel';
import { ORIGENS, PRIORIDADES, ROTULO_ORIGEM, ROTULO_PRIORIDADE } from '@/lib/dominio';
import { paraDiaISO } from '@/lib/datas';

const VAZIO = {
  titulo: '',
  descricao: '',
  colaboradorId: '',
  prioridade: 'MEDIA',
  origem: 'MANUAL',
  solicitante: '',
  dataPrevista: paraDiaISO(),
};

export function FormDemanda({
  colaboradores,
  aoSalvar,
  notificar,
}: {
  colaboradores: Colaborador[];
  aoSalvar: () => Promise<void> | void;
  notificar: (texto: string, tipo?: 'ok' | 'erro' | 'info') => void;
}) {
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);

  const ativos = colaboradores.filter((c) => c.ativo);

  function alterar<K extends keyof typeof VAZIO>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando) return;

    if (!form.titulo.trim()) return notificar('Informe o título da demanda.', 'erro');
    if (!form.colaboradorId) return notificar('Selecione o responsável.', 'erro');

    setSalvando(true);
    try {
      const res = await fetch('/api/demandas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.erro ?? 'Não foi possível salvar.');

      // Mantemos responsável e data para agilizar o cadastro em sequência.
      setForm((f) => ({
        ...VAZIO,
        colaboradorId: f.colaboradorId,
        dataPrevista: f.dataPrevista,
      }));
      notificar('Demanda registrada.', 'ok');
      await aoSalvar();
    } catch (erro) {
      notificar(erro instanceof Error ? erro.message : 'Erro ao salvar.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="cartao" onSubmit={enviar}>
      <div className="cartao-cabecalho">
        <div>
          <div className="cartao-titulo">Nova demanda</div>
          <div className="cartao-desc">Em breve alimentada pelo Teams e Google Chat</div>
        </div>
      </div>

      <div className="cartao-corpo">
        <div className="campo">
          <label className="rotulo" htmlFor="titulo">Título</label>
          <input
            id="titulo"
            className="entrada"
            placeholder="Ex.: Revisar contrato do cliente Alfa"
            value={form.titulo}
            onChange={(e) => alterar('titulo', e.target.value)}
            maxLength={180}
            required
          />
        </div>

        <div className="campo">
          <label className="rotulo" htmlFor="descricao">
            Descrição <span className="opcional">(opcional)</span>
          </label>
          <textarea
            id="descricao"
            className="area"
            placeholder="Detalhes, links, contexto…"
            value={form.descricao}
            onChange={(e) => alterar('descricao', e.target.value)}
            maxLength={800}
          />
        </div>

        <div className="campo">
          <label className="rotulo" htmlFor="colaborador">Responsável</label>
          <select
            id="colaborador"
            className="selecao"
            value={form.colaboradorId}
            onChange={(e) => alterar('colaboradorId', e.target.value)}
            required
          >
            <option value="">Selecione…</option>
            {ativos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}{c.equipe ? ` · ${c.equipe}` : ''}
              </option>
            ))}
          </select>
          {ativos.length === 0 && (
            <div className="texto-suave" style={{ marginTop: 5 }}>
              Nenhum colaborador ativo cadastrado.
            </div>
          )}
        </div>

        <div className="campo linha-campos">
          <div>
            <label className="rotulo" htmlFor="prioridade">Prioridade</label>
            <select
              id="prioridade"
              className="selecao"
              value={form.prioridade}
              onChange={(e) => alterar('prioridade', e.target.value)}
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>{ROTULO_PRIORIDADE[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor="data">Prevista para</label>
            <input
              id="data"
              type="date"
              className="entrada"
              value={form.dataPrevista}
              onChange={(e) => alterar('dataPrevista', e.target.value)}
            />
          </div>
        </div>

        <div className="campo linha-campos">
          <div>
            <label className="rotulo" htmlFor="origem">Origem</label>
            <select
              id="origem"
              className="selecao"
              value={form.origem}
              onChange={(e) => alterar('origem', e.target.value)}
            >
              {ORIGENS.map((o) => (
                <option key={o} value={o}>{ROTULO_ORIGEM[o]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="rotulo" htmlFor="solicitante">
              Solicitante <span className="opcional">(opcional)</span>
            </label>
            <input
              id="solicitante"
              className="entrada"
              placeholder="Quem pediu"
              value={form.solicitante}
              onChange={(e) => alterar('solicitante', e.target.value)}
              maxLength={120}
            />
          </div>
        </div>

        <div className="divisor" />

        <button
          type="submit"
          className="btn btn-primario btn-bloco"
          disabled={salvando || ativos.length === 0}
        >
          {salvando ? <><span className="girando">⏳</span> Salvando…</> : '+ Registrar demanda'}
        </button>
      </div>
    </form>
  );
}
