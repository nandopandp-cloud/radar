'use client';

import { useState } from 'react';
import { IconeMais } from '@/components/icones';
import type { Notificar, SessaoUI, Usuario } from '@/lib/tipos';

function iniciais(nome: string) {
  return nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function TelaEquipe({
  sessao,
  equipe,
  aoAtualizar,
  notificar,
}: {
  sessao: SessaoUI;
  equipe: Usuario[];
  aoAtualizar: () => Promise<void> | void;
  notificar: Notificar;
}) {
  const admin = sessao.perfil === 'ADMIN';
  const [form, setForm] = useState({ nome: '', email: '', senha: '', equipe: '', perfil: 'ANALISTA' });
  const [salvando, setSalvando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando) return;
    setSalvando(true);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const corpo = await res.json();
      if (!res.ok) throw new Error(corpo.erro ?? 'Não foi possível criar.');
      setForm({ nome: '', email: '', senha: '', equipe: '', perfil: 'ANALISTA' });
      notificar('Analista cadastrado.', 'ok');
      await aoAtualizar();
    } catch (erro) {
      notificar(erro instanceof Error ? erro.message : 'Erro.', 'erro');
    } finally {
      setSalvando(false);
    }
  }

  async function alterar(u: Usuario, dados: Record<string, unknown>, msg: string) {
    setOcupado(u.id);
    try {
      const res = await fetch(`/api/usuarios/${u.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(dados),
      });
      const corpo = await res.json();
      if (!res.ok) throw new Error(corpo.erro ?? 'Não foi possível atualizar.');
      notificar(msg, 'ok');
      await aoAtualizar();
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro.', 'erro');
    } finally {
      setOcupado(null);
    }
  }

  async function redefinirSenha(u: Usuario) {
    const senha = prompt(`Nova senha para ${u.nome} (mínimo 5 caracteres):`);
    if (!senha) return;
    if (senha.length < 5) return notificar('A senha precisa de ao menos 5 caracteres.', 'erro');
    await alterar(u, { senha }, 'Senha redefinida.');
  }

  async function excluir(u: Usuario) {
    const n = u._count?.demandas ?? 0;
    if (!confirm(n > 0
      ? `Excluir ${u.nome}? As ${n} demanda(s) dessa pessoa também serão removidas.`
      : `Excluir ${u.nome}?`)) return;
    setOcupado(u.id);
    try {
      const res = await fetch(`/api/usuarios/${u.id}`, { method: 'DELETE' });
      const corpo = await res.json();
      if (!res.ok) throw new Error(corpo.erro ?? 'Não foi possível excluir.');
      notificar('Conta excluída.', 'ok');
      await aoAtualizar();
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro.', 'erro');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <h1 className="saudacao">Equipe</h1>
        <p className="saudacao-sub">
          {admin
            ? 'Quem tem acesso ao Radar e recebe os alertas de prazo.'
            : 'Os analistas que usam o Radar.'}
        </p>
      </div>

      <div className={admin ? 'grade-calendario' : ''}>
        <div className="cartao">
          <div className="cartao-cabecalho com-linha">
            <div>
              <div className="cartao-titulo">Analistas</div>
              <div className="cartao-desc">
                {equipe.filter((u) => u.ativo).length} ativo(s) de {equipe.length}
              </div>
            </div>
          </div>
          <div className="tabela-envolvente">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Analista</th>
                  <th className="col-estreita">Equipe</th>
                  <th className="col-estreita">Demandas</th>
                  <th className="col-estreita">Perfil</th>
                  {admin && <th className="col-estreita" style={{ textAlign: 'right' }}>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {equipe.map((u) => (
                  <tr key={u.id} style={ocupado === u.id ? { opacity: 0.5 } : undefined}>
                    <td>
                      <div className="linha" style={{ gap: 11, flexWrap: 'nowrap' }}>
                        <div className="avatar avatar-sm">{iniciais(u.nome)}</div>
                        <div>
                          <div className="celula-titulo">
                            {u.nome}
                            {u.id === sessao.id && <span className="texto-suave"> (você)</span>}
                          </div>
                          <div className="celula-sub">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="col-estreita texto-suave">{u.equipe ?? '—'}</td>
                    <td className="col-estreita">{u._count?.demandas ?? 0}</td>
                    <td className="col-estreita">
                      <span className={`selo ${u.perfil === 'ADMIN' ? 'selo-categoria' : 'selo-neutro'}`}>
                        {u.perfil === 'ADMIN' ? 'Admin' : 'Analista'}
                      </span>
                      {!u.ativo && <span className="selo selo-CANCELADA" style={{ marginLeft: 6 }}>Inativo</span>}
                    </td>
                    {admin && (
                      <td className="col-estreita" style={{ textAlign: 'right' }}>
                        <div className="acoes-linha">
                          <button
                            className="btn btn-mini btn-secundario"
                            disabled={ocupado === u.id}
                            onClick={() => redefinirSenha(u)}
                          >
                            Senha
                          </button>
                          {u.id !== sessao.id && (
                            <>
                              <button
                                className="btn btn-mini btn-secundario"
                                disabled={ocupado === u.id}
                                onClick={() => alterar(u, { ativo: !u.ativo }, u.ativo ? 'Conta desativada.' : 'Conta reativada.')}
                              >
                                {u.ativo ? 'Desativar' : 'Reativar'}
                              </button>
                              <button
                                className="btn btn-mini btn-perigo"
                                disabled={ocupado === u.id}
                                onClick={() => excluir(u)}
                              >
                                Excluir
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {admin && (
          <form className="cartao" onSubmit={criar}>
            <div className="cartao-cabecalho com-linha">
              <div>
                <div className="cartao-titulo">Novo analista</div>
                <div className="cartao-desc">Cria o acesso e o destinatário dos alertas</div>
              </div>
            </div>
            <div className="cartao-corpo">
              <div className="campo">
                <label className="rotulo" htmlFor="e-nome">Nome</label>
                <input
                  id="e-nome" className="entrada" required placeholder="Ex.: Ana Ribeiro"
                  value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="campo">
                <label className="rotulo" htmlFor="e-email">E-mail</label>
                <input
                  id="e-email" type="email" className="entrada" required
                  placeholder="ana@msa.com"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="campo">
                <label className="rotulo" htmlFor="e-senha">Senha provisória</label>
                <input
                  id="e-senha" type="text" className="entrada" required minLength={5}
                  placeholder="Mínimo 5 caracteres"
                  value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })}
                />
              </div>
              <div className="campo linha-campos">
                <div>
                  <label className="rotulo" htmlFor="e-equipe">
                    Equipe <span className="opcional">(opcional)</span>
                  </label>
                  <input
                    id="e-equipe" className="entrada" placeholder="Ex.: Operações"
                    value={form.equipe} onChange={(e) => setForm({ ...form, equipe: e.target.value })}
                  />
                </div>
                <div>
                  <label className="rotulo" htmlFor="e-perfil">Perfil</label>
                  <select
                    id="e-perfil" className="selecao" value={form.perfil}
                    onChange={(e) => setForm({ ...form, perfil: e.target.value })}
                  >
                    <option value="ANALISTA">Analista</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primario btn-bloco" disabled={salvando}>
                {salvando ? <><span className="girando">⏳</span> Criando…</> : <><IconeMais size={17} /> Cadastrar</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
