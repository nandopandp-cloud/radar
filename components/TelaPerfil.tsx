'use client';

import { useRef, useState } from 'react';
import { IconeCheck, IconeUsuario } from '@/components/icones';
import { CampoSenha } from '@/components/CampoSenha';
import { Avatar } from '@/components/Avatar';
import { prepararAvatar } from '@/lib/imagem';
import type { Notificar, SessaoUI } from '@/lib/tipos';

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

  const [avatar, setAvatar] = useState<string | null>(sessao.avatar ?? null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);

  const [senhas, setSenhas] = useState({ atual: '', nova: '', confirma: '' });
  const [trocando, setTrocando] = useState(false);

  async function gravarAvatar(valor: string | null, mensagem: string) {
    setEnviandoFoto(true);
    try {
      const res = await fetch(`/api/usuarios/${sessao.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ avatar: valor }),
      });
      const corpo = await res.json();
      if (!res.ok) throw new Error(corpo.erro ?? 'Não foi possível salvar a foto.');
      setAvatar(valor);
      notificar(mensagem, 'ok');
      await aoAtualizar();
    } catch (erro) {
      notificar(erro instanceof Error ? erro.message : 'Erro.', 'erro');
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function escolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    // Limpa o input para permitir reenviar o mesmo arquivo depois de um erro.
    e.target.value = '';
    if (!arquivo) return;

    setEnviandoFoto(true);
    try {
      const pronto = await prepararAvatar(arquivo);
      setEnviandoFoto(false);
      await gravarAvatar(pronto, 'Foto atualizada.');
    } catch (erro) {
      setEnviandoFoto(false);
      notificar(erro instanceof Error ? erro.message : 'Erro ao processar a imagem.', 'erro');
    }
  }

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
              <div className="perfil-foto">
                <Avatar nome={sessao.nome} avatar={avatar} tamanho="lg" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{sessao.nome}</div>
                  <div className="texto-suave">
                    {sessao.perfil === 'ADMIN' ? 'Administrador' : 'Analista da MSA'}
                  </div>
                  <div className="perfil-foto-acoes">
                    <button
                      type="button"
                      className="btn btn-mini btn-secundario"
                      disabled={enviandoFoto}
                      onClick={() => inputFoto.current?.click()}
                    >
                      {enviandoFoto ? 'Processando…' : avatar ? 'Trocar foto' : 'Enviar foto'}
                    </button>
                    {avatar && (
                      <button
                        type="button"
                        className="btn btn-mini btn-perigo"
                        disabled={enviandoFoto}
                        onClick={() => gravarAvatar(null, 'Foto removida.')}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <div className="texto-suave" style={{ fontSize: 12, marginTop: 6 }}>
                    JPG, PNG ou GIF.
                  </div>
                </div>
                <input
                  ref={inputFoto}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={escolherFoto}
                  hidden
                />
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
              <CampoSenha
                id="s-atual" required
                autoComplete="current-password" placeholder="••••••"
                value={senhas.atual}
                onChange={(e) => setSenhas({ ...senhas, atual: e.target.value })}
              />
            </div>
            <div className="campo">
              <label className="rotulo" htmlFor="s-nova">Nova senha</label>
              <CampoSenha
                id="s-nova" required minLength={6}
                autoComplete="new-password" placeholder="Mínimo 6 caracteres"
                value={senhas.nova}
                onChange={(e) => setSenhas({ ...senhas, nova: e.target.value })}
              />
            </div>
            <div className="campo">
              <label className="rotulo" htmlFor="s-conf">Confirmar nova senha</label>
              <CampoSenha
                id="s-conf" required
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
