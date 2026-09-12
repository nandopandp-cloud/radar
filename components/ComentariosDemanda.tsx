'use client';

import { useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { IconeBalao, IconeLixeira } from '@/components/icones';
import type { Comentario, Notificar, SessaoUI } from '@/lib/tipos';

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
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    const limpo = texto.trim();
    if (!limpo || enviando) return;

    setEnviando(true);
    try {
      const res = await fetch(`/api/demandas/${demandaId}/comentarios`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ texto: limpo }),
      });
      const corpo = await res.json();
      if (!res.ok) throw new Error(corpo.erro ?? 'Não foi possível comentar.');
      aoMudar([...comentarios, corpo]);
      setTexto('');
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro ao comentar.', 'erro');
    } finally {
      setEnviando(false);
    }
  }

  async function remover(c: Comentario) {
    if (!confirm('Remover este comentário?')) return;
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
                  {/* Texto puro: quebras viram <br> pelo CSS, sem interpretar HTML. */}
                  <p className="comentario-texto">{c.texto}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="comentario-novo">
        <Avatar nome={sessao.nome} avatar={sessao.avatar} tamanho="sm" />
        <div className="comentario-campo">
          <textarea
            className="area comentario-area"
            placeholder="Escreva um comentário…"
            value={texto}
            maxLength={4000}
            onChange={(e) => setTexto(e.target.value)}
            /* Ctrl/Cmd+Enter envia, como na maioria dos campos de comentário. */
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                enviar();
              }
            }}
          />
          <div className="comentario-acoes">
            <span className="comentario-atalho">Ctrl + Enter para enviar</span>
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
