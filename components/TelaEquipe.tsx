'use client';

import { useEffect, useState } from 'react';
import { IconeMais } from '@/components/icones';
import { Avatar } from '@/components/Avatar';
import { useDialogo } from '@/components/Dialogo';
import type { LinkAcesso, Notificar, SessaoUI, Usuario } from '@/lib/tipos';

/** "em 14 min", "expirado" — quanto ainda resta de um link. */
function restante(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expirado';
  const min = Math.ceil(ms / 60_000);
  return min === 1 ? 'expira em 1 min' : `expira em ${min} min`;
}

function quandoCurto(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

/** O estado de um link, para o histórico. */
function situacao(l: LinkAcesso): { texto: string; classe: string } {
  if (l.usadoEm) return { texto: `usado ${quandoCurto(l.usadoEm)}`, classe: 'selo-CONCLUIDA' };
  if (l.revogadoEm) return { texto: 'revogado', classe: 'selo-CANCELADA' };
  if (new Date(l.expiraEm) < new Date()) return { texto: 'expirado', classe: 'selo-neutro' };
  return { texto: restante(l.expiraEm), classe: 'selo-categoria' };
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
  const { confirmar, pedirTexto } = useDialogo();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', equipe: '', perfil: 'ANALISTA' });
  const [salvando, setSalvando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkAcesso[]>([]);
  /** Link recém-gerado. O token só existe aqui — recarregar a página o perde. */
  const [novoLink, setNovoLink] = useState<{ url: string; alvo: string; expiraEm: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function carregarLinks() {
    if (!admin) return;
    try {
      const res = await fetch('/api/links-acesso');
      if (res.ok) setLinks(await res.json());
    } catch {
      // Histórico é acessório: falhar aqui não atrapalha o resto da tela.
    }
  }

  useEffect(() => {
    carregarLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin]);

  async function gerarLink(u: Usuario) {
    const segue = await confirmar({
      titulo: `Acessar a conta de ${u.nome}?`,
      mensagem: 'Você vai entrar no Radar como esta pessoa, para dar suporte.',
      detalhes: [
        'Tudo que você fizer ficará registrado com o nome dela.',
        'O link vale 15 minutos e só pode ser usado uma vez.',
        'O acesso fica registrado no histórico, com data e IP.',
      ],
      confirmar: 'Gerar link',
      tom: 'aviso',
    });
    if (!segue) return;

    setOcupado(u.id);
    try {
      const res = await fetch('/api/links-acesso', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ alvoId: u.id }),
      });
      const corpo = await res.json();
      if (!res.ok) throw new Error(corpo.erro ?? 'Não foi possível gerar.');
      setNovoLink({ url: corpo.url, alvo: corpo.alvo, expiraEm: corpo.expiraEm });
      setCopiado(false);
      await carregarLinks();
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro.', 'erro');
    } finally {
      setOcupado(null);
    }
  }

  async function copiarLink() {
    if (!novoLink) return;
    try {
      await navigator.clipboard.writeText(novoLink.url);
      setCopiado(true);
      notificar('Link copiado.', 'ok');
    } catch {
      notificar('Não foi possível copiar — selecione e copie manualmente.', 'erro');
    }
  }

  async function revogar(l: LinkAcesso) {
    try {
      const res = await fetch(`/api/links-acesso/${l.id}`, { method: 'DELETE' });
      const corpo = await res.json();
      if (!res.ok) throw new Error(corpo.erro ?? 'Não foi possível revogar.');
      notificar('Link revogado.', 'ok');
      if (novoLink && l.alvo.id) setNovoLink(null);
      await carregarLinks();
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro.', 'erro');
    }
  }

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
    const senha = await pedirTexto({
      titulo: `Redefinir a senha de ${u.nome}`,
      mensagem: 'A pessoa passa a entrar com esta senha. Combine com ela como vai recebê-la.',
      rotulo: 'Nova senha',
      placeholder: 'Mínimo 5 caracteres',
      segredo: true,
      confirmar: 'Redefinir',
      validar: (v) => (v.length < 5 ? 'A senha precisa de ao menos 5 caracteres.' : null),
    });
    if (!senha) return;
    await alterar(u, { senha }, 'Senha redefinida.');
  }

  async function excluir(u: Usuario) {
    const n = u._count?.demandas ?? 0;
    const segue = await confirmar({
      titulo: `Excluir a conta de ${u.nome}?`,
      mensagem: 'Esta ação não pode ser desfeita.',
      detalhes: n > 0
        ? [`As ${n} demanda(s) dessa pessoa também serão removidas.`]
        : undefined,
      confirmar: 'Excluir conta',
      tom: 'perigo',
    });
    if (!segue) return;
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
                        <Avatar nome={u.nome} avatar={u.avatar} tamanho="sm" />
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
                              {u.ativo && (
                                <button
                                  className="btn btn-mini btn-secundario"
                                  disabled={ocupado === u.id}
                                  title={`Gerar link para entrar como ${u.nome}`}
                                  onClick={() => gerarLink(u)}
                                >
                                  Acessar
                                </button>
                              )}
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

      {admin && (
        <div className="cartao" style={{ marginTop: 22 }}>
          <div className="cartao-cabecalho com-linha">
            <div>
              <div className="cartao-titulo">Links de acesso</div>
              <div className="cartao-desc">
                Entrar na conta de um analista para dar suporte. Use o botão
                “Acessar” na lista acima.
              </div>
            </div>
          </div>
          <div className="cartao-corpo">
            {/* O token aparece uma única vez. Saiu daqui, não há como recuperá-lo. */}
            {novoLink && (
              <div className="link-gerado">
                <div className="link-gerado-topo">
                  <strong>Link para a conta de {novoLink.alvo}</strong>
                  <span className="selo selo-categoria">{restante(novoLink.expiraEm)}</span>
                </div>
                <p className="link-gerado-aviso">
                  Copie agora — por segurança, ele não será mostrado de novo. Vale
                  uma única vez e some ao ser usado.
                </p>
                <div className="link-gerado-campo">
                  <input className="entrada" readOnly value={novoLink.url} onFocus={(e) => e.target.select()} />
                  <button className="btn btn-primario" onClick={copiarLink}>
                    {copiado ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <button className="btn btn-mini btn-secundario" onClick={() => setNovoLink(null)}>
                  Ocultar
                </button>
              </div>
            )}

            {links.length === 0 ? (
              <p className="anexo-vazio">Nenhum link gerado ainda.</p>
            ) : (
              <div className="tabela-envolvente">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Conta acessada</th>
                      <th className="col-estreita">Gerado por</th>
                      <th className="col-estreita">Quando</th>
                      <th className="col-estreita">Situação</th>
                      <th className="col-estreita" style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((l) => {
                      const st = situacao(l);
                      const pendente = !l.usadoEm && !l.revogadoEm && new Date(l.expiraEm) > new Date();
                      return (
                        <tr key={l.id}>
                          <td className="celula-titulo">{l.alvo.nome}</td>
                          <td className="col-estreita texto-suave">{l.admin.nome}</td>
                          <td className="col-estreita texto-suave">{quandoCurto(l.criadoEm)}</td>
                          <td className="col-estreita">
                            <span className={`selo ${st.classe}`}>{st.texto}</span>
                            {l.usadoIp && (
                              <div className="celula-sub">IP {l.usadoIp}</div>
                            )}
                          </td>
                          <td className="col-estreita" style={{ textAlign: 'right' }}>
                            {pendente && (
                              <button className="btn btn-mini btn-perigo" onClick={() => revogar(l)}>
                                Revogar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
