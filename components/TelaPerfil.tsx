'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Emblema, IconeAlvo, IconeBandeira, IconeBarrinhas, IconeCadeado, IconeCalendario,
  IconeCamera, IconeCelular, IconeChama, IconeChave, IconeCheck, IconeCheckCirculo,
  IconeCoroa, IconeDireita, IconeEnvelope, IconeEquipe, IconeEscudo, IconeEstrela,
  IconeFoguete, IconeGota, IconeGrade, IconeInfo, IconeLapis,
  IconeMonitor, IconePredio, IconeRelogio, IconeTrofeu,
} from '@/components/icones';
import { CampoSenha } from '@/components/CampoSenha';
import { Avatar } from '@/components/Avatar';
import { lerParaEditor } from '@/lib/imagem';
import { EditorFoto } from '@/components/EditorFoto';
import type { Notificar, SessaoUI } from '@/lib/tipos';
import type { PerfilGamificado } from '@/lib/perfil';
import type { ConquistaApurada, MissaoApurada } from '@/lib/gamificacao';

/**
 * As quatro abas do perfil, na ordem em que aparecem.
 *
 * A gamificação é exclusiva dos analistas: para o admin sobra a Segurança,
 * e as abas somem em vez de mostrarem um progresso que não é dele.
 */
const ABAS = [
  { id: 'geral', rotulo: 'Visão geral', gamificada: true },
  { id: 'conquistas', rotulo: 'Conquistas', gamificada: true },
  { id: 'missoes', rotulo: 'Missões', gamificada: true },
  { id: 'seguranca', rotulo: 'Segurança', gamificada: false },
] as const;

type AbaId = (typeof ABAS)[number]['id'];

/** Ícone do miolo de cada emblema, pela chave do catálogo. */
function iconeDaConquista(icone: ConquistaApurada['icone'], size = 26) {
  const mapa = {
    chama: IconeChama, calendario: IconeCalendario, gota: IconeGota,
    estrela: IconeEstrela, check: IconeCheck, equipe: IconeEquipe,
    alvo: IconeAlvo, coroa: IconeCoroa,
  };
  const Componente = mapa[icone] ?? IconeEstrela;
  return <Componente size={size} />;
}

/** Ícone da missão, no quadradinho colorido à esquerda. */
function iconeDaMissao(icone: MissaoApurada['icone']) {
  const mapa = { alvo: IconeAlvo, chama: IconeChama, grade: IconeGrade };
  const Componente = mapa[icone] ?? IconeAlvo;
  return <Componente size={22} />;
}

/** dd/mm/aaaa a partir de um ISO. */
function dataCurta(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/** Texto do estado vazio, que muda conforme o motivo de não haver nada. */
function textoVazio(
  estado: 'carregando' | 'pronto' | 'indisponivel',
  oQue: 'conquista' | 'missão',
): string {
  if (estado === 'carregando') return 'Carregando…';
  if (estado === 'indisponivel') {
    return `Não foi possível carregar suas ${oQue}s agora. Tente recarregar a página.`;
  }
  return `Nenhuma ${oQue} neste filtro.`;
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
  /* O admin não participa da gamificação: entra direto na Segurança. */
  const jogando = sessao.perfil !== 'ADMIN';
  const abasVisiveis = ABAS.filter((a) => jogando || !a.gamificada);

  const [aba, setAba] = useState<AbaId>(jogando ? 'geral' : 'seguranca');
  const [perfil, setPerfil] = useState<PerfilGamificado | null>(null);
  /* 'carregando' → 'pronto' | 'indisponivel'. Sem isso a tela fica presa em
     "Carregando…" quando a API falha, e a lista vazia não se explica. */
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'indisponivel'>('carregando');

  const [nome, setNome] = useState(sessao.nome);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [editandoDados, setEditandoDados] = useState(false);

  const [avatar, setAvatar] = useState<string | null>(sessao.avatar ?? null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  /* Foto escolhida aguardando enquadramento no editor. */
  const [fotoParaEditar, setFotoParaEditar] = useState<string | null>(null);
  const inputFoto = useRef<HTMLInputElement>(null);

  const [senhas, setSenhas] = useState({ atual: '', nova: '', confirma: '' });
  const [trocando, setTrocando] = useState(false);

  /* Filtros das abas de conquistas e missões. */
  const [filtroConquista, setFiltroConquista] = useState<'todas' | 'conquistada' | 'progresso' | 'bloqueada'>('todas');
  const [filtroMissao, setFiltroMissao] = useState<'ativas' | 'concluidas' | 'todas'>('ativas');

  useEffect(() => {
    if (!jogando) return;
    let vivo = true;
    fetch('/api/perfil')
      .then((r) => (r.ok ? r.json() : null))
      .then((dados) => {
        if (!vivo) return;
        if (dados) { setPerfil(dados); setEstado('pronto'); }
        else setEstado('indisponivel');
      })
      .catch(() => { if (vivo) setEstado('indisponivel'); });
    return () => { vivo = false; };
  }, [jogando]);

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
      const { dataUri, editavel } = await lerParaEditor(arquivo);
      setEnviandoFoto(false);
      // GIF vai direto: passar pelo canvas do editor mataria a animação.
      if (editavel) setFotoParaEditar(dataUri);
      else await gravarAvatar(dataUri, 'Foto atualizada.');
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


  const cargo = sessao.perfil === 'ADMIN' ? 'Administrador' : 'Analista da MSA';
  const nivel = perfil?.nivel;

  const conquistas = perfil?.conquistas ?? [];
  const contagem = {
    todas: conquistas.length,
    conquistada: conquistas.filter((c) => c.estado === 'conquistada').length,
    progresso: conquistas.filter((c) => c.estado === 'progresso').length,
    bloqueada: conquistas.filter((c) => c.estado === 'bloqueada').length,
  };
  const conquistasVisiveis = filtroConquista === 'todas'
    ? conquistas
    : conquistas.filter((c) => c.estado === filtroConquista);

  const missoes = perfil?.missoes ?? [];
  const missoesVisiveis = filtroMissao === 'todas'
    ? missoes
    : missoes.filter((m) => (filtroMissao === 'concluidas' ? m.concluida : !m.concluida));

  return (
    <>
      <div className="pf-topo">
        <div>
          <h1 className="saudacao">Meu perfil</h1>
          <p className="saudacao-sub">Seus dados, conquistas e evolução no Radar.</p>
        </div>
        <button
          type="button"
          className="btn btn-secundario"
          onClick={() => { setAba('geral'); setEditandoDados(true); }}
        >
          <IconeLapis size={17} /> Editar perfil
        </button>
      </div>

      {/* ── Cartão de identidade + nível ─────────────────── */}
      <div className="cartao pf-cabecalho">
        <div className="pf-identidade">
          <div className="pf-retrato">
            <Avatar nome={sessao.nome} avatar={avatar} tamanho="lg" />
            <button
              type="button"
              className="pf-trocar-foto"
              aria-label={avatar ? 'Trocar foto' : 'Enviar foto'}
              disabled={enviandoFoto}
              onClick={() => inputFoto.current?.click()}
            >
              <IconeCamera size={17} />
            </button>
            <input
              ref={inputFoto}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              onChange={escolherFoto}
              hidden
            />
          </div>

          <div className="pf-dados">
            <h2 className="pf-nome">{sessao.nome}</h2>
            <p className="pf-cargo">{cargo}</p>
            <p className="pf-contato"><IconeEnvelope size={17} /> {sessao.email}</p>
            {/* A sessão não carrega a equipe; a empresa do produto é sempre a MSA. */}
            <p className="pf-contato"><IconePredio size={17} /> MSA</p>

            <button
              type="button"
              className="btn btn-secundario pf-editar"
              onClick={() => setEditandoDados((v) => !v)}
            >
              <IconeLapis size={16} /> Editar meus dados
            </button>
          </div>
        </div>

        {jogando && <div className="pf-nivel">
          <div className="pf-nivel-topo">
            <Emblema tom="ambar" size={58}><IconeEstrela size={24} /></Emblema>
            <div className="pf-nivel-barra">
              <div className="pf-nivel-rotulos">
                <span className="pf-nivel-titulo">Nível {nivel?.nivel ?? 1}</span>
                <span className="pf-nivel-xp">
                  {nivel ? `${nivel.xpNoNivel} / ${nivel.xpDoNivel} XP` : '—'}
                </span>
              </div>
              <span className="barra">
                <span className="barra-preenchida" style={{ width: `${nivel?.progresso ?? 0}%` }} />
              </span>
              <p className="pf-nivel-falta">
                {nivel
                  ? `Mais ${nivel.falta} XP para o nível ${nivel.nivel + 1}`
                  : estado === 'indisponivel' ? 'Progresso indisponível agora' : 'Carregando…'}
              </p>
            </div>
          </div>

          <div className="pf-atalhos">
            <button type="button" className="pf-atalho" onClick={() => setAba('geral')}>
              <span className="pf-atalho-icone laranja"><IconeFoguete size={24} /></span>
              <span>
                <strong>{perfil?.ofensiva.atual ?? 0}</strong>
                <small>dias de ofensiva</small>
              </span>
              <IconeDireita size={15} className="pf-atalho-seta" />
            </button>
            <button type="button" className="pf-atalho" onClick={() => setAba('conquistas')}>
              <span className="pf-atalho-icone azul"><IconeAlvo size={22} /></span>
              <span>
                <strong>{contagem.conquistada}</strong>
                <small>conquistas</small>
              </span>
              <IconeDireita size={15} className="pf-atalho-seta" />
            </button>
            <button type="button" className="pf-atalho" onClick={() => setAba('missoes')}>
              <span className="pf-atalho-icone roxo"><IconeBandeira size={22} /></span>
              <span>
                <strong>{missoes.filter((m) => !m.concluida).length}</strong>
                <small>missões ativas</small>
              </span>
              <IconeDireita size={15} className="pf-atalho-seta" />
            </button>
          </div>
        </div>}
      </div>

      {/* ── Abas ─────────────────────────────────────────── */}
      <div className="pf-abas" role="tablist">
        {abasVisiveis.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={aba === a.id}
            className={`pf-aba${aba === a.id ? ' ativa' : ''}`}
            onClick={() => setAba(a.id)}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {/* Edição dos dados pessoais, aberta pelo botão do cabeçalho. */}
      {editandoDados && (
        <form className="cartao pf-editar-dados" onSubmit={salvarNome}>
          <div className="pf-bloco-topo">
            <span className="pf-bloco-icone azul"><IconeLapis size={20} /></span>
            <div>
              <div className="cartao-titulo">Editar meus dados</div>
              <div className="cartao-desc">Como você aparece para o time.</div>
            </div>
            <button
              type="button"
              className="pf-vertodas"
              onClick={() => { setEditandoDados(false); setNome(sessao.nome); }}
            >
              Fechar
            </button>
          </div>

          <div className="pf-editar-campos">
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
          </div>

          <div className="pf-editar-acoes">
            {avatar && (
              <button
                type="button"
                className="btn btn-secundario"
                disabled={enviandoFoto}
                onClick={() => gravarAvatar(null, 'Foto removida.')}
              >
                Remover foto
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primario"
              disabled={salvandoNome || nome.trim() === sessao.nome}
            >
              {salvandoNome
                ? <><span className="girando">⏳</span> Salvando…</>
                : <><IconeCheck size={17} /> Salvar</>}
            </button>
          </div>
        </form>
      )}

      {/* ── Visão geral ──────────────────────────────────── */}
      {aba === 'geral' && (
        <div className="pf-grade">
          <div className="cartao pf-bloco">
            <div className="pf-bloco-topo">
              <span className="pf-bloco-icone azul"><IconeBarrinhas size={22} /></span>
              <div>
                <div className="cartao-titulo">Minha evolução</div>
                <div className="cartao-desc">Acompanhe sua consistência no Radar.</div>
              </div>
            </div>

            {/* Mapa de calor: uma coluna por semana, um quadradinho por dia. */}
            <div className="pf-mapa" aria-hidden="true">
              {Array.from({ length: 26 }, (_, semana) => (
                <div className="pf-mapa-semana" key={semana}>
                  {Array.from({ length: 7 }, (_, dia) => {
                    const item = perfil?.evolucao[semana * 7 + dia];
                    return (
                      <span
                        key={dia}
                        className={`pf-mapa-dia${item?.ativo ? ' ativo' : ''}`}
                        title={item?.dia}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="pf-mapa-meses">
              {perfil && [0, 5, 10, 15, 20, 25].map((s) => {
                const item = perfil.evolucao[s * 7];
                if (!item) return null;
                const mes = new Date(`${item.dia}T00:00:00Z`)
                  .toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' });
                return <span key={s}>{mes.replace('.', '').replace(/^./, (c) => c.toUpperCase())}</span>;
              })}
            </div>

            <div className="pf-numeros">
              <div>
                <strong>{perfil?.resumo.diasAtivos ?? 0}</strong>
                <small>dias ativos</small>
              </div>
              <div>
                <strong>{perfil?.resumo.concluidas ?? 0}</strong>
                <small>demandas concluídas</small>
              </div>
              <div>
                <strong>{perfil?.resumo.taxaConclusao ?? 0}%</strong>
                <small>taxa de conclusão</small>
              </div>
              <div>
                <strong>{perfil?.resumo.semanasSeguidas ?? 0}</strong>
                <small>semanas seguidas</small>
              </div>
            </div>
          </div>

          <div className="cartao pf-bloco">
            <div className="pf-bloco-topo">
              <span className="pf-bloco-icone laranja"><IconeFoguete size={24} /></span>
              <div>
                <div className="cartao-titulo">Ofensiva Radar</div>
                <div className="cartao-desc">{perfil?.ofensiva.atual ?? 0} dias de consistência</div>
              </div>
            </div>
            <p className="pf-texto">
              Use o Radar por 15 dias consecutivos e conquiste um novo marco.
            </p>

            <div className="pf-trilha">
              <div className="pf-trilha-bolas">
                {Array.from({ length: 10 }, (_, i) => {
                  const feito = i < (perfil?.ofensiva.atual ?? 0);
                  return (
                    <span key={i} className={`pf-bola${feito ? ' feita' : ''}`}>
                      {feito && <IconeCheck size={15} />}
                    </span>
                  );
                })}
              </div>
              <span className="pf-trilha-valor">{perfil?.ofensiva.atual ?? 0}/15</span>
            </div>

            <div className="pf-aviso">
              <IconeFoguete size={20} />
              <span>
                Faltam apenas <strong>{Math.max(0, 15 - (perfil?.ofensiva.atual ?? 0))} dias</strong> para
                você completar a meta!
              </span>
            </div>
          </div>

          <div className="cartao pf-bloco">
            <div className="pf-bloco-topo">
              <span className="pf-bloco-icone ambar"><IconeTrofeu size={22} /></span>
              <div>
                <div className="cartao-titulo">Minhas conquistas</div>
                <div className="cartao-desc">Marcos que você já alcançou no Radar.</div>
              </div>
              <button type="button" className="pf-vertodas" onClick={() => setAba('conquistas')}>
                Ver todas <IconeDireita size={15} />
              </button>
            </div>

            <div className="pf-emblemas">
              {conquistas.slice(0, 5).map((c) => (
                <div className="pf-emblema" key={c.chave}>
                  <Emblema tom={c.tom} apagado={c.estado !== 'conquistada'}>
                    {iconeDaConquista(c.icone)}
                  </Emblema>
                  <span className="pf-emblema-nome">{c.titulo}</span>
                  {c.emQue
                    ? <span className="pf-emblema-data">{dataCurta(c.emQue)}</span>
                    : <span className="pf-emblema-cadeado"><IconeCadeado size={15} /></span>}
                </div>
              ))}
            </div>
          </div>

          <div className="cartao pf-bloco">
            <div className="pf-bloco-topo">
              <span className="pf-bloco-icone roxo"><IconeBandeira size={22} /></span>
              <div>
                <div className="cartao-titulo">Minhas missões</div>
                <div className="cartao-desc">Desafios que rendem XP.</div>
              </div>
              <button type="button" className="pf-vertodas" onClick={() => setAba('missoes')}>
                Ver todas <IconeDireita size={15} />
              </button>
            </div>

            <div className="pf-missoes-mini">
              {missoes.map((m) => (
                <div className="pf-missao-mini" key={m.chave}>
                  <span className={`pf-missao-estado${m.concluida ? ' ok' : ''}`}>
                    {m.concluida ? <IconeCheck size={16} /> : <IconeInfo size={16} />}
                  </span>
                  <div className="pf-missao-corpo">
                    <span className="pf-missao-titulo">{m.titulo}</span>
                    <span className="barra fina">
                      <span
                        className={`barra-preenchida${m.concluida ? ' verde' : ''}`}
                        style={{ width: `${(m.progresso / m.meta) * 100}%` }}
                      />
                    </span>
                  </div>
                  <span className="pf-missao-contagem">{m.progresso}/{m.meta}</span>
                  <span className="pf-missao-xp">+{m.xp} XP</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Conquistas ───────────────────────────────────── */}
      {aba === 'conquistas' && (
        <div className="cartao pf-bloco">
          <div className="pf-bloco-topo">
            <span className="pf-bloco-icone ambar"><IconeTrofeu size={22} /></span>
            <div>
              <div className="cartao-titulo">Minhas conquistas</div>
              <div className="cartao-desc">Marcos que você já alcançou no Radar.</div>
            </div>
            <div className="pf-filtros">
              {([
                ['todas', `Todas (${contagem.todas})`],
                ['conquistada', `Conquistadas (${contagem.conquistada})`],
                ['progresso', `Em progresso (${contagem.progresso})`],
                ['bloqueada', `Bloqueadas (${contagem.bloqueada})`],
              ] as const).map(([id, rotulo]) => (
                <button
                  key={id}
                  type="button"
                  className={`pf-filtro${filtroConquista === id ? ' ativo' : ''}`}
                  onClick={() => setFiltroConquista(id)}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </div>

          <div className="pf-cards">
            {conquistasVisiveis.map((c) => (
              <div className="pf-card" key={c.chave}>
                <Emblema tom={c.tom} apagado={c.estado !== 'conquistada'} size={70}>
                  {iconeDaConquista(c.icone, 30)}
                </Emblema>
                <h3 className="pf-card-titulo">{c.titulo}</h3>
                <p className="pf-card-desc">{c.descricao}</p>

                {c.estado === 'conquistada' ? (
                  <>
                    <span className="pf-card-data">{c.emQue && dataCurta(c.emQue)}</span>
                    <span className="selo verde"><IconeCheckCirculo size={16} /> Conquistada</span>
                  </>
                ) : (
                  <>
                    <div className="pf-card-barra">
                      <IconeCadeado size={15} />
                      <span className="barra fina">
                        <span
                          className="barra-preenchida"
                          style={{ width: `${(c.atual / c.meta) * 100}%` }}
                        />
                      </span>
                      <span className="pf-card-valor">{c.atual}/{c.meta}</span>
                    </div>
                    <span className={`selo${c.estado === 'progresso' ? ' azul' : ' cinza'}`}>
                      {c.estado === 'progresso'
                        ? <><IconeRelogio size={16} /> Em progresso</>
                        : <><IconeCadeado size={15} /> Bloqueada</>}
                    </span>
                  </>
                )}
              </div>
            ))}
            {conquistasVisiveis.length === 0 && (
              <p className="pf-vazio">{textoVazio(estado, 'conquista')}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Missões ──────────────────────────────────────── */}
      {aba === 'missoes' && (
        <div className="cartao pf-bloco">
          <div className="pf-bloco-topo">
            <span className="pf-bloco-icone roxo"><IconeBandeira size={22} /></span>
            <div>
              <div className="cartao-titulo">Minhas missões</div>
              <div className="cartao-desc">Complete desafios, ganhe XP e contribua para grandes resultados.</div>
            </div>
            <div className="pf-filtros">
              {([
                ['ativas', `Ativas (${missoes.filter((m) => !m.concluida).length})`],
                ['concluidas', `Concluídas (${missoes.filter((m) => m.concluida).length})`],
                ['todas', `Todas (${missoes.length})`],
              ] as const).map(([id, rotulo]) => (
                <button
                  key={id}
                  type="button"
                  className={`pf-filtro${filtroMissao === id ? ' ativo' : ''}`}
                  onClick={() => setFiltroMissao(id)}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </div>

          <div className="pf-missoes">
            {missoesVisiveis.map((m) => (
              <div className="pf-missao" key={m.chave}>
                <span className={`pf-missao-icone ${m.tom}`}>{iconeDaMissao(m.icone)}</span>

                <div className="pf-missao-info">
                  <h3 className="pf-missao-nome">{m.titulo}</h3>
                  <p className="pf-missao-desc">{m.descricao}</p>
                  <div className="pf-missao-etiquetas">
                    <span className={`etiqueta ${m.tom}`}>{m.categoria}</span>
                    <span className="etiqueta xp">+{m.xp} XP</span>
                  </div>
                </div>

                <div className="pf-missao-progresso">
                  <span className="pf-missao-valor">{m.progresso}/{m.meta}</span>
                  <span className="barra">
                    <span
                      className={`barra-preenchida${m.concluida ? ' verde' : ''}`}
                      style={{ width: `${(m.progresso / m.meta) * 100}%` }}
                    />
                  </span>
                  {m.restante && <span className="pf-missao-falta">{m.restante}</span>}
                </div>

                {m.concluida && (
                  <span className="selo verde"><IconeCheckCirculo size={16} /> Concluída</span>
                )}
              </div>
            ))}
            {missoesVisiveis.length === 0 && (
              <p className="pf-vazio">{textoVazio(estado, 'missão')}</p>
            )}
          </div>

          <div className="pf-rodape-missoes">
            <IconeFoguete size={26} />
            <div>
              <strong>Complete suas missões e evolua mais rápido!</strong>
              <p>As missões são atualizadas toda semana. Fique atento aos novos desafios.</p>
            </div>
          </div>
        </div>
      )}

      {fotoParaEditar && (
        <EditorFoto
          arquivo={fotoParaEditar}
          aoCancelar={() => setFotoParaEditar(null)}
          aoConfirmar={async (recortada) => {
            setFotoParaEditar(null);
            await gravarAvatar(recortada, 'Foto atualizada.');
          }}
        />
      )}

      {/* ── Segurança ────────────────────────────────────── */}
      {aba === 'seguranca' && (
        <div className="cartao pf-bloco">
          <div className="pf-bloco-topo">
            <span className="pf-bloco-icone azul"><IconeEscudo size={22} /></span>
            <div>
              <div className="cartao-titulo">Segurança da conta</div>
              <div className="cartao-desc">Gerencie sua senha e mantenha sua conta segura.</div>
            </div>
          </div>

          <div className="pf-seguranca">
            <form className="pf-caixa" onSubmit={trocarSenha}>
              <div className="pf-caixa-topo">
                <span className="pf-bloco-icone azul"><IconeChave size={20} /></span>
                <div>
                  <div className="cartao-titulo">Alterar senha</div>
                  <div className="cartao-desc">Defina uma nova senha para sua conta.</div>
                </div>
              </div>

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
                  <div className="campo-erro">A confirmação não confere.</div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primario btn-bloco"
                disabled={trocando || !senhas.atual || !senhas.nova || senhas.nova !== senhas.confirma}
              >
                {trocando
                  ? <><span className="girando">⏳</span> Alterando…</>
                  : <><IconeCadeado size={17} /> Alterar senha</>}
              </button>
            </form>

            <div className="pilha">
              {/* Sessões e 2FA ainda não existem no backend. Em vez de mostrar
                  dispositivos inventados — informação de segurança falsa é pior
                  que informação nenhuma — a seção fica visível e desabilitada. */}
              <div className="pf-caixa indisponivel">
                <div className="pf-caixa-topo">
                  <span className="pf-bloco-icone azul"><IconeCelular size={20} /></span>
                  <div>
                    <div className="cartao-titulo">Dispositivos ativos</div>
                    <div className="cartao-desc">Veja onde sua conta está conectada.</div>
                  </div>
                  <span className="selo cinza">Em breve</span>
                </div>
                <p className="pf-indisponivel-texto">
                  O Radar ainda não registra as sessões abertas. Assim que registrar, os
                  aparelhos conectados aparecem aqui e você poderá encerrá-los.
                </p>
                <div className="pf-dispositivos-fantasma" aria-hidden="true">
                  <span><IconeMonitor size={18} /> Computador</span>
                  <span><IconeCelular size={18} /> Celular</span>
                </div>
              </div>

              <div className="pf-caixa indisponivel">
                <div className="pf-caixa-topo">
                  <span className="pf-bloco-icone azul"><IconeEscudo size={20} /></span>
                  <div>
                    <div className="cartao-titulo">Autenticação em duas etapas (2FA)</div>
                    <div className="cartao-desc">Adicione uma camada extra de segurança à sua conta.</div>
                  </div>
                  <span className="selo cinza">Em breve</span>
                </div>
                <p className="pf-indisponivel-texto">
                  Ainda não está disponível. Enquanto isso, uma senha forte e exclusiva é a
                  melhor proteção da sua conta.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
