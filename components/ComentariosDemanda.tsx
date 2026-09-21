'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { useDialogo } from '@/components/Dialogo';
import { IconeBalao, IconeLixeira } from '@/components/icones';
import type { Comentario, Mencionavel, Notificar, SessaoUI } from '@/lib/tipos';

/** "agora há pouco", "há 3 h", "12/09/2026" — o suficiente para situar. */
function quando(iso: string): string {
  const data = new Date(iso);
  const minutos = Math.floor((Date.now() - data.getTime()) / 60_000);
  if (minutos < 1) return 'agora há pouco';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return dias === 1 ? 'ontem' : `há ${dias} dias`;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(data);
}

/** Tira acento e caixa, para "jose" encontrar "José". */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * O "@" que o cursor está digitando agora, se houver.
 *
 * Vale como menção em andamento quando o @ abre palavra (início do texto ou
 * depois de espaço) e o que veio depois dele ainda não tem quebra de linha —
 * assim um e-mail escrito no meio da frase não abre a lista.
 */
function buscaEmAndamento(texto: string, cursor: string | number): { inicio: number; termo: string } | null {
  const pos = Number(cursor);
  const antes = texto.slice(0, pos);
  const arroba = antes.lastIndexOf('@');
  if (arroba === -1) return null;

  const anterior = arroba > 0 ? antes[arroba - 1] : ' ';
  if (!/\s/.test(anterior)) return null;

  const termo = antes.slice(arroba + 1);
  if (/[\n\r]/.test(termo)) return null;
  // Um nome tem no máximo duas ou três palavras; mais que isso já é frase.
  if (termo.split(/\s+/).length > 3) return null;

  return { inicio: arroba, termo };
}

/** Destaca os "@Nome" já confirmados no texto de um comentário publicado. */
function textoComMencoes(texto: string, nomes: string[]) {
  if (nomes.length === 0) return texto;

  // Do nome mais longo para o mais curto: "Ana Paula" ganha de "Ana".
  const ordenados = [...nomes].sort((a, b) => b.length - a.length);
  const padrao = new RegExp(
    `@(${ordenados.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'g',
  );

  const pedacos: (string | { nome: string })[] = [];
  let ultimo = 0;
  for (const achado of texto.matchAll(padrao)) {
    const inicio = achado.index!;
    if (inicio > ultimo) pedacos.push(texto.slice(ultimo, inicio));
    pedacos.push({ nome: achado[1] });
    ultimo = inicio + achado[0].length;
  }
  if (ultimo < texto.length) pedacos.push(texto.slice(ultimo));

  return pedacos.map((p, i) =>
    typeof p === 'string' ? p : <mark key={i} className="mencao-marca">@{p.nome}</mark>,
  );
}

export function ComentariosDemanda({
  demandaId,
  comentarios,
  sessao,
  aoMudar,
  notificar,
}: {
  demandaId: string;
  comentarios: Comentario[];
  sessao: SessaoUI;
  aoMudar: (comentarios: Comentario[]) => void;
  notificar: Notificar;
}) {
  const { confirmar } = useDialogo();
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pessoas, setPessoas] = useState<Mencionavel[]>([]);
  /** Quem foi escolhido no seletor. É o que vai para a API — o texto é só exibição. */
  const [marcados, setMarcados] = useState<Mencionavel[]>([]);
  const [busca, setBusca] = useState<{ inicio: number; termo: string } | null>(null);
  const [destaque, setDestaque] = useState(0);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // A lista de pessoas é a mesma o tempo todo; uma busca só por demanda basta.
  useEffect(() => {
    let cancelado = false;
    fetch('/api/usuarios/mencionaveis')
      .then((r) => (r.ok ? r.json() : []))
      .then((lista) => {
        if (!cancelado) setPessoas(lista);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  const sugestoes = useMemo(() => {
    if (!busca) return [];
    const termo = normalizar(busca.termo);
    return pessoas
      .filter((p) => p.id !== sessao.id && normalizar(p.nome).includes(termo))
      .slice(0, 6);
  }, [busca, pessoas, sessao.id]);

  useEffect(() => setDestaque(0), [busca?.termo]);

  function aoDigitar(valor: string, cursor: number) {
    setTexto(valor);
    setBusca(buscaEmAndamento(valor, cursor));
  }

  /** Troca o "@parcial" pelo nome completo e registra o id escolhido. */
  function escolher(pessoa: Mencionavel) {
    if (!busca) return;
    const antes = texto.slice(0, busca.inicio);
    const depois = texto.slice(busca.inicio + 1 + busca.termo.length);
    const inserido = `@${pessoa.nome} `;
    const novo = `${antes}${inserido}${depois}`;

    setTexto(novo);
    setBusca(null);
    setMarcados((atuais) =>
      atuais.some((m) => m.id === pessoa.id) ? atuais : [...atuais, pessoa],
    );

    // Devolve o cursor para logo depois do nome inserido.
    const posicao = antes.length + inserido.length;
    requestAnimationFrame(() => {
      const area = areaRef.current;
      if (!area) return;
      area.focus();
      area.setSelectionRange(posicao, posicao);
    });
  }

  async function enviar() {
    const limpo = texto.trim();
    if (!limpo || enviando) return;

    // Só conta quem continua citado no texto: apagar o "@Nome" desmarca a pessoa.
    const mencionados = marcados.filter((m) => limpo.includes(`@${m.nome}`)).map((m) => m.id);

    setEnviando(true);
    try {
      const res = await fetch(`/api/demandas/${demandaId}/comentarios`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ texto: limpo, mencionados }),
      });
      const corpo = await res.json();
      if (!res.ok) throw new Error(corpo.erro ?? 'Não foi possível comentar.');
      aoMudar([...comentarios, corpo]);
      setTexto('');
      setMarcados([]);
      setBusca(null);
      if (mencionados.length > 0) {
        notificar(
          mencionados.length === 1
            ? 'Comentário enviado. A pessoa mencionada foi avisada por e-mail.'
            : `Comentário enviado. ${mencionados.length} pessoas foram avisadas por e-mail.`,
          'ok',
        );
      }
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro ao comentar.', 'erro');
    } finally {
      setEnviando(false);
    }
  }

  async function remover(c: Comentario) {
    const segue = await confirmar({
      titulo: 'Remover este comentário?',
      mensagem: 'Ele sai da demanda para todo mundo e não há como recuperá-lo.',
      confirmar: 'Remover',
      tom: 'perigo',
    });
    if (!segue) return;
    try {
      const res = await fetch(`/api/comentarios/${c.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const corpo = await res.json().catch(() => ({}));
        throw new Error(corpo.erro ?? 'Não foi possível remover.');
      }
      aoMudar(comentarios.filter((x) => x.id !== c.id));
      notificar('Comentário removido.', 'ok');
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro ao remover.', 'erro');
    }
  }

  /** Setas e Enter pilotam a lista quando ela está aberta. */
  function aoTeclar(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (busca && sugestoes.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setDestaque((i) => (i + 1) % sugestoes.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setDestaque((i) => (i - 1 + sugestoes.length) % sugestoes.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        escolher(sugestoes[destaque]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setBusca(null);
        return;
      }
    }

    /* Ctrl/Cmd+Enter envia, como na maioria dos campos de comentário. */
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      enviar();
    }
  }

  return (
    <div className="comentarios">
      {comentarios.length === 0 ? (
        <p className="anexo-vazio">
          <IconeBalao size={16} /> Nenhum comentário ainda. Comece a conversa.
        </p>
      ) : (
        <ul className="comentario-lista">
          {comentarios.map((c) => {
            const meu = c.autorId === sessao.id;
            const nomes = (c.mencoes ?? []).map((m) => m.usuario.nome);
            return (
              <li key={c.id} className="comentario">
                <Avatar nome={c.autorNome} avatar={c.autor?.avatar} tamanho="sm" />
                <div className="comentario-corpo">
                  <div className="comentario-cabecalho">
                    <span className="comentario-autor">{c.autorNome}</span>
                    <span className="comentario-quando">{quando(c.criadoEm)}</span>
                    {(meu || sessao.perfil === 'ADMIN') && (
                      <button
                        className="btn-icone comentario-remover"
                        onClick={() => remover(c)}
                        title="Remover comentário"
                        aria-label="Remover comentário"
                      >
                        <IconeLixeira size={14} />
                      </button>
                    )}
                  </div>
                  {/* Texto puro: quebras viram <br> pelo CSS, sem interpretar HTML.
                      Os "@Nome" confirmados ganham destaque. */}
                  <p className="comentario-texto">{textoComMencoes(c.texto, nomes)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="comentario-novo">
        <Avatar nome={sessao.nome} avatar={sessao.avatar} tamanho="sm" />
        <div className="comentario-campo">
          <div className="comentario-area-wrap">
            <textarea
              ref={areaRef}
              className="area comentario-area"
              placeholder="Escreva um comentário… use @ para mencionar alguém"
              value={texto}
              maxLength={4000}
              onChange={(e) => aoDigitar(e.target.value, e.target.selectionStart)}
              onKeyDown={aoTeclar}
              /* Clicar fora fecha a lista, mas só depois do clique na sugestão. */
              onBlur={() => setTimeout(() => setBusca(null), 150)}
            />

            {busca && sugestoes.length > 0 && (
              <ul className="mencao-lista" role="listbox">
                {sugestoes.map((p, i) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === destaque}
                      className={`mencao-item${i === destaque ? ' mencao-item-ativo' : ''}`}
                      onMouseEnter={() => setDestaque(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => escolher(p)}
                    >
                      <Avatar nome={p.nome} avatar={p.avatar} tamanho="sm" />
                      <span className="mencao-nome">{p.nome}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="comentario-acoes">
            <span className="comentario-atalho">
              {busca && sugestoes.length > 0
                ? '↑↓ para escolher · Enter para marcar'
                : 'Ctrl + Enter para enviar · @ menciona alguém'}
            </span>
            <button
              className="btn btn-primario btn-pequeno"
              disabled={!texto.trim() || enviando}
              onClick={enviar}
            >
              {enviando ? 'Enviando…' : 'Comentar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
