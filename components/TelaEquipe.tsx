'use client';

import { useMemo, useRef, useState } from 'react';
import {
  IconeBusca, IconeDocumento, IconeEquipe, IconeFiltro, IconeUsuarioMais,
} from '@/components/icones';
import { Avatar } from '@/components/Avatar';
import { useDialogo } from '@/components/Dialogo';
import { MenuAcoes, type AcaoMenu } from '@/components/MenuAcoes';
import type { Notificar, SessaoUI, Usuario } from '@/lib/tipos';

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
  const { confirmar, pedirTexto, mostrarValor } = useDialogo();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', equipe: '', perfil: 'ANALISTA' });
  const [salvando, setSalvando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  /** "Outra…" escolhida na lista de equipes: vira campo de texto. */
  const [outraEquipe, setOutraEquipe] = useState(false);
  const campoNome = useRef<HTMLInputElement>(null);

  // Só no celular: busca, filtros e ordenação da lista.
  const [busca, setBusca] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [filtroPerfil, setFiltroPerfil] = useState<'TODOS' | 'ADMIN' | 'ANALISTA'>('TODOS');
  const [filtroAtivo, setFiltroAtivo] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS'>('TODOS');
  const [ordem, setOrdem] = useState<'NOME' | 'DEMANDAS' | 'PERFIL'>('NOME');

  const equipesExistentes = useMemo(
    () => [...new Set(equipe.map((u) => u.equipe?.trim()).filter((e): e is string => !!e))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [equipe],
  );

  const listaCelular = useMemo(() => {
    const termo = busca.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return equipe
      .filter((u) => filtroPerfil === 'TODOS' || u.perfil === filtroPerfil)
      .filter((u) => filtroAtivo === 'TODOS' || (filtroAtivo === 'ATIVOS') === u.ativo)
      .filter((u) => !termo || `${u.nome} ${u.email} ${u.equipe ?? ''}`
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(termo))
      .sort((a, b) => {
        if (ordem === 'DEMANDAS') return (b._count?.demandas ?? 0) - (a._count?.demandas ?? 0);
        if (ordem === 'PERFIL' && a.perfil !== b.perfil) return a.perfil === 'ADMIN' ? -1 : 1;
        return a.nome.localeCompare(b.nome, 'pt-BR');
      });
  }, [equipe, busca, filtroPerfil, filtroAtivo, ordem]);

  const filtrosAtivos = (filtroPerfil !== 'TODOS' ? 1 : 0) + (filtroAtivo !== 'TODOS' ? 1 : 0);

  function irParaFormulario() {
    campoNome.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    campoNome.current?.focus({ preventScroll: true });
  }

  function acoesDe(u: Usuario): AcaoMenu[] {
    const eu = u.id === sessao.id;
    return [
      { rotulo: 'Redefinir senha', aoEscolher: () => void redefinirSenha(u) },
      ...(!eu && u.ativo ? [{ rotulo: 'Acessar conta', aoEscolher: () => void gerarLink(u) }] : []),
      ...(!eu
        ? [
            {
              rotulo: u.ativo ? 'Desativar' : 'Reativar',
              aoEscolher: () => void alterar(
                u, { ativo: !u.ativo }, u.ativo ? 'Conta desativada.' : 'Conta reativada.',
              ),
            },
            { rotulo: 'Excluir conta', aoEscolher: () => void excluir(u), perigo: true, separar: true },
          ]
        : []),
    ];
  }
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

      // O link aparece no mesmo fluxo do clique. Ele existe só aqui: o banco
      // guarda apenas o hash, então fechar sem copiar significa gerar outro.
      await mostrarValor({
        titulo: `Link para a conta de ${corpo.alvo}`,
        mensagem: 'Cole no navegador para entrar como esta pessoa.',
        valor: corpo.url,
        detalhes: [
          `Vale ${corpo.validadeMinutos} minutos e abre uma única vez.`,
          'Copie agora — por segurança, ele não será mostrado de novo.',
        ],
      });
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro.', 'erro');
    } finally {
      setOcupado(null);
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
      setOutraEquipe(false);
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
      <div className="eq-cabecalho">
        <h1 className="saudacao">Equipe</h1>
        {admin && (
          <button className="btn btn-primario so-celular" onClick={irParaFormulario}>
            <IconeUsuarioMais size={20} /> Novo analista
          </button>
        )}
        <p className="saudacao-sub">
          {admin
            ? 'Quem tem acesso ao Radar e recebe os alertas de prazo.'
            : 'Os analistas que usam o Radar.'}
        </p>
      </div>

      <div className="so-celular eq-celular">
        <div className="dm-barra">
          <label className="dm-busca">
            <IconeBusca size={19} />
            <input
              type="search" placeholder="Buscar analistas..." value={busca}
              onChange={(e) => setBusca(e.target.value)} aria-label="Buscar analistas"
            />
          </label>
          <button
            className={`dm-chip eq-filtros${filtrosAbertos || filtrosAtivos > 0 ? ' ativo' : ''}`}
            onClick={() => setFiltrosAbertos((a) => !a)}
            aria-expanded={filtrosAbertos}
          >
            <IconeFiltro size={18} /> Filtros
            {filtrosAtivos > 0 && <span className="dm-chip-conta">{filtrosAtivos}</span>}
          </button>
        </div>

        {filtrosAbertos && (
          <div className="cartao dm-filtros">
            <label className="rotulo" htmlFor="eq-perfil">Perfil</label>
            <select
              id="eq-perfil" className="selecao" value={filtroPerfil}
              onChange={(e) => setFiltroPerfil(e.target.value as typeof filtroPerfil)}
            >
              <option value="TODOS">Todos os perfis</option>
              <option value="ADMIN">Administradores</option>
              <option value="ANALISTA">Analistas</option>
            </select>
            <label className="rotulo" htmlFor="eq-ativo">Situação</label>
            <select
              id="eq-ativo" className="selecao" value={filtroAtivo}
              onChange={(e) => setFiltroAtivo(e.target.value as typeof filtroAtivo)}
            >
              <option value="TODOS">Ativos e inativos</option>
              <option value="ATIVOS">Só ativos</option>
              <option value="INATIVOS">Só inativos</option>
            </select>
          </div>
        )}

        <div className="cartao">
          <div className="cartao-cabecalho">
            <div>
              <div className="cartao-titulo">Analistas</div>
              <div className="cartao-desc">
                {equipe.filter((u) => u.ativo).length} ativo(s) de {equipe.length}
              </div>
            </div>
            <select
              className="selecao eq-ordem" value={ordem} aria-label="Ordenar por"
              onChange={(e) => setOrdem(e.target.value as typeof ordem)}
            >
              <option value="NOME">Ordenar por nome</option>
              <option value="DEMANDAS">Mais demandas</option>
              <option value="PERFIL">Perfil</option>
            </select>
          </div>
          <ul className="eq-lista">
            {listaCelular.length === 0 && <li className="eq-vazia">Ninguém encontrado.</li>}
            {listaCelular.map((u) => {
              const n = u._count?.demandas ?? 0;
              return (
                <li key={u.id} className="eq-item" style={ocupado === u.id ? { opacity: 0.5 } : undefined}>
                  <Avatar nome={u.nome} avatar={u.avatar} tamanho="lg" />
                  <div className="eq-item-texto">
                    <div className="eq-item-nome">
                      {u.nome}
                      {u.id === sessao.id && <span className="eq-voce"> (você)</span>}
                    </div>
                    <div className="eq-item-email">{u.email}</div>
                    <div className="eq-item-meta">
                      <span><IconeEquipe size={15} /> {u.equipe ?? '—'}</span>
                      <span><IconeDocumento size={15} /> {n} {n === 1 ? 'demanda' : 'demandas'}</span>
                    </div>
                  </div>
                  <div className="eq-item-selos">
                    <span className={`eq-perfil${u.perfil === 'ADMIN' ? ' admin' : ''}`}>
                      {u.perfil === 'ADMIN' ? 'Admin' : 'Analista'}
                    </span>
                    {!u.ativo && <span className="selo selo-CANCELADA">Inativo</span>}
                  </div>
                  {admin && (
                    <MenuAcoes
                      acoes={acoesDe(u)} rotulo={`Ações de ${u.nome}`} desabilitado={ocupado === u.id}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className={admin ? 'grade-calendario' : ''}>
        <div className="cartao so-desktop">
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
                <div className="cartao-desc">Cria o acesso e o destinatário dos alertas.</div>
              </div>
            </div>
            <div className="cartao-corpo">
              <div className="campo">
                <label className="rotulo" htmlFor="e-nome">Nome</label>
                <input
                  ref={campoNome}
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
                  <select
                    id="e-equipe" className="selecao"
                    value={outraEquipe ? '__outra' : form.equipe}
                    onChange={(e) => {
                      const outra = e.target.value === '__outra';
                      setOutraEquipe(outra);
                      setForm({ ...form, equipe: outra ? '' : e.target.value });
                    }}
                  >
                    <option value="">Selecione uma equipe</option>
                    {equipesExistentes.map((nome) => (
                      <option key={nome} value={nome}>{nome}</option>
                    ))}
                    <option value="__outra">Outra…</option>
                  </select>
                  {outraEquipe && (
                    <input
                      className="entrada" placeholder="Nome da nova equipe" autoFocus
                      style={{ marginTop: 8 }}
                      value={form.equipe} onChange={(e) => setForm({ ...form, equipe: e.target.value })}
                    />
                  )}
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
                {salvando ? <><span className="girando">⏳</span> Criando…</> : (
                  <>
                    <IconeUsuarioMais size={18} /> Cadastrar<span className="so-celular">analista</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

    </>
  );
}
