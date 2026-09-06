'use client';

import { useState } from 'react';
import { IconeCheck, IconeUsuario } from '@/components/icones';
import type { Notificar, SessaoUI } from '@/lib/tipos';

function iniciais(nome: string) {
  return nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function TelaPerfil({
  sessao,
  aoAtualizar,
  notificar,
}: {
  sessao: SessaoUI;
  aoAtualizar: () => Promise<void> | void;
  notificar: Notificar;
}) {
  const [nome, setNome] = useState(sessao.nome);
  const [salvandoNome, setSalvandoNome] = useState(false);

  const [senhas, setSenhas] = useState({ atual: '', nova: '', confirma: '' });
  const [trocando, setTrocando] = useState(false);

  async function salvarNome(e: React.FormEvent) {
    e.preventDefault();
    if (salvandoNome || !nome.trim()) return;
    setSalvandoNome(true);
    try {
      const res = await fetch(`/api/usuarios/${sessao.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim() }),
      });
      const corpo = await res.json();
      if (!res.ok) throw new Error(corpo.erro ?? 'Não foi possível salvar.');
      notificar('Nome atualizado. Recarregue para ver em todo lugar.', 'ok');
      await aoAtualizar();
    } catch (erro) {
      notificar(erro instanceof Error ? erro.message : 'Erro.', 'erro');
    } finally {
      setSalvandoNome(false);
    }
  }

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault();
    if (trocando) return;

    if (senhas.nova !== senhas.confirma) {
      return notificar('A confirmação não confere com a nova senha.', 'erro');
    }
    if (senhas.nova.length < 6) {
      return notificar('A nova senha precisa de ao menos 6 caracteres.', 'erro');
    }

    setTrocando(true);
    try {
      const res = await fetch('/api/auth/senha', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ atual: senhas.atual, nova: senhas.nova }),
      });
      const corpo = await res.json();
      if (!res.ok) throw new Error(corpo.erro ?? 'Não foi possível trocar a senha.');

      notificar('Senha alterada. Entre novamente.', 'ok');
      setTimeout(() => { window.location.href = '/login'; }, 1400);
    } catch (erro) {
      notificar(erro instanceof Error ? erro.message : 'Erro.', 'erro');
      setTrocando(false);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <h1 className="saudacao">Minha conta</h1>
        <p className="saudacao-sub">Seus dados de acesso ao Radar.</p>
      </div>

      <div className="grade-calendario">
        <div className="pilha">
          <form className="cartao" onSubmit={salvarNome}>
            <div className="cartao-cabecalho com-linha">
              <div>
                <div className="cartao-titulo">Dados pessoais</div>
                <div className="cartao-desc">Como você aparece para o time</div>
              </div>
            </div>
            <div className="cartao-corpo">
              <div className="linha" style={{ gap: 14, marginBottom: 20 }}>
                <div className="avatar avatar-lg">{iniciais(sessao.nome)}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{sessao.nome}</div>
                  <div className="texto-suave">
                    {sessao.perfil === 'ADMIN' ? 'Administrador' : 'Analista da MSA'}
                  </div>
                </div>
              </div>

              <div className="campo">
                <label className="rotulo" htmlFor="p-nome">Nome</label>
                <input
                  id="p-nome" className="entrada" required maxLength={120}
                  value={nome} onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div className="campo">
                <label className="rotulo" htmlFor="p-email">E-mail</label>
                <input id="p-email" className="entrada" value={sessao.email} disabled />
                <div className="texto-suave" style={{ marginTop: 6 }}>
                  É para cá que vão os alertas de prazo vencido. Para alterar, peça a um
                  administrador.
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primario"
                disabled={salvandoNome || nome.trim() === sessao.nome}
              >
                {salvandoNome ? <><span className="girando">⏳</span> Salvando…</> : <><IconeCheck size={17} /> Salvar</>}
              </button>
            </div>
          </form>
        </div>

        <form className="cartao" onSubmit={trocarSenha}>
          <div className="cartao-cabecalho com-linha">
            <div>
              <div className="cartao-titulo">Alterar senha</div>
              <div className="cartao-desc">Você precisará entrar de novo depois</div>
            </div>
          </div>
          <div className="cartao-corpo">
            <div className="campo">
              <label className="rotulo" htmlFor="s-atual">Senha atual</label>
              <input
                id="s-atual" type="password" className="entrada" required
                autoComplete="current-password" placeholder="••••••"
                value={senhas.atual}
                onChange={(e) => setSenhas({ ...senhas, atual: e.target.value })}
              />
            </div>
            <div className="campo">
              <label className="rotulo" htmlFor="s-nova">Nova senha</label>
              <input
                id="s-nova" type="password" className="entrada" required minLength={6}
                autoComplete="new-password" placeholder="Mínimo 6 caracteres"
                value={senhas.nova}
                onChange={(e) => setSenhas({ ...senhas, nova: e.target.value })}
              />
            </div>
            <div className="campo">
              <label className="rotulo" htmlFor="s-conf">Confirmar nova senha</label>
              <input
                id="s-conf" type="password" className="entrada" required
                autoComplete="new-password" placeholder="Repita a nova senha"
                value={senhas.confirma}
                onChange={(e) => setSenhas({ ...senhas, confirma: e.target.value })}
              />
              {senhas.confirma && senhas.nova !== senhas.confirma && (
                <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--atrasada)' }}>
                  A confirmação não confere.
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primario btn-bloco"
              disabled={trocando || !senhas.atual || !senhas.nova || senhas.nova !== senhas.confirma}
            >
              {trocando ? <><span className="girando">⏳</span> Alterando…</> : <><IconeUsuario size={17} /> Alterar senha</>}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
