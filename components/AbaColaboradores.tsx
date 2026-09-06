'use client';

import { useState } from 'react';
import type { Colaborador } from '@/components/Painel';
import { Avatar, Vazio } from '@/components/ui';

export function AbaColaboradores({
  colaboradores,
  aoAtualizar,
  notificar,
}: {
  colaboradores: Colaborador[];
  aoAtualizar: () => Promise<void> | void;
  notificar: (texto: string, tipo?: 'ok' | 'erro' | 'info') => void;
}) {
  const [form, setForm] = useState({ nome: '', email: '', equipe: '' });
  const [salvando, setSalvando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando) return;
    setSalvando(true);
    try {
      const res = await fetch('/api/colaboradores', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.erro ?? 'Não foi possível salvar.');
      setForm({ nome: '', email: '', equipe: '' });
      notificar('Colaborador cadastrado.', 'ok');
      await aoAtualizar();
    } catch (erro) {
      notificar(erro instanceof Error ? erro.message : 'Erro.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(c: Colaborador) {
    setOcupado(c.id);
    try {
      const res = await fetch(`/api/colaboradores/${c.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ativo: !c.ativo }),
      });
      if (!res.ok) throw new Error('Não foi possível atualizar.');
      notificar(c.ativo ? 'Colaborador desativado.' : 'Colaborador reativado.', 'ok');
      await aoAtualizar();
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro.', 'erro');
    } finally {
      setOcupado(null);
    }
  }

  async function excluir(c: Colaborador) {
    const qtd = c._count?.demandas ?? 0;
    const aviso = qtd > 0
      ? `Excluir ${c.nome}? As ${qtd} demanda(s) vinculadas também serão removidas.`
      : `Excluir ${c.nome}?`;
    if (!confirm(aviso)) return;

    setOcupado(c.id);
    try {
      const res = await fetch(`/api/colaboradores/${c.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Não foi possível excluir.');
      notificar('Colaborador excluído.', 'ok');
      await aoAtualizar();
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro.', 'erro');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="grade-1-2">
      <form className="cartao" onSubmit={adicionar}>
        <div className="cartao-cabecalho">
          <div>
            <div className="cartao-titulo">Novo colaborador</div>
            <div className="cartao-desc">Quem recebe os alertas por e-mail</div>
          </div>
        </div>
        <div className="cartao-corpo">
          <div className="campo">
            <label className="rotulo" htmlFor="c-nome">Nome</label>
            <input
              id="c-nome"
              className="entrada"
              placeholder="Ex.: Ana Ribeiro"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </div>
          <div className="campo">
            <label className="rotulo" htmlFor="c-email">E-mail</label>
            <input
              id="c-email"
              type="email"
              className="entrada"
              placeholder="ana.ribeiro@empresa.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="campo">
            <label className="rotulo" htmlFor="c-equipe">
              Equipe <span className="opcional">(opcional)</span>
            </label>
            <input
              id="c-equipe"
              className="entrada"
              placeholder="Ex.: Operações"
              value={form.equipe}
              onChange={(e) => setForm({ ...form, equipe: e.target.value })}
            />
          </div>
          <div className="divisor" />
          <button type="submit" className="btn btn-primario btn-bloco" disabled={salvando}>
            {salvando ? <><span className="girando">⏳</span> Salvando…</> : '+ Cadastrar'}
          </button>
        </div>
      </form>

      <div className="cartao">
        <div className="cartao-cabecalho">
          <div>
            <div className="cartao-titulo">Equipe</div>
            <div className="cartao-desc">
              {colaboradores.filter((c) => c.ativo).length} ativo(s) de {colaboradores.length}
            </div>
          </div>
        </div>

        {colaboradores.length === 0 ? (
          <Vazio
            icone="👥"
            titulo="Nenhum colaborador"
            texto="Cadastre as pessoas que devem receber os alertas de demandas postergadas."
          />
        ) : (
          <div className="tabela-envolvente">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Colaborador</th><th>Equipe</th><th>Demandas</th>
                  <th>Situação</th><th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {colaboradores.map((c) => (
                  <tr key={c.id} style={ocupado === c.id ? { opacity: 0.5 } : undefined}>
                    <td>
                      <div className="linha" style={{ gap: 10, flexWrap: 'nowrap' }}>
                        <Avatar nome={c.nome} />
                        <div>
                          <div className="celula-titulo">{c.nome}</div>
                          <div className="celula-sub">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="texto-suave">{c.equipe ?? '—'}</td>
                    <td>{c._count?.demandas ?? 0}</td>
                    <td>
                      <span className={`selo ${c.ativo ? 'selo-CONCLUIDA' : 'selo-CANCELADA'}`}>
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-mini btn-secundario"
                        disabled={ocupado === c.id}
                        onClick={() => alternarAtivo(c)}
                      >
                        {c.ativo ? 'Desativar' : 'Reativar'}
                      </button>{' '}
                      <button
                        className="btn btn-mini btn-perigo"
                        disabled={ocupado === c.id}
                        onClick={() => excluir(c)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
