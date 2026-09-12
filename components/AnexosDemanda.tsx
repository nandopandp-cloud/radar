'use client';

import { useRef, useState } from 'react';
import { IconeBaixar, IconeClipe, IconeEnviar, IconeLixeira } from '@/components/icones';
import { formatarTamanho, TAMANHO_MAXIMO } from '@/lib/anexos';
import type { Anexo, Notificar } from '@/lib/tipos';

/** Lê um arquivo como data URI, o formato que a API grava. */
function lerComoDataURI(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error(`Não foi possível ler "${arquivo.name}".`));
    leitor.readAsDataURL(arquivo);
  });
}

/** Extensão em caixa alta para o quadradinho da lista: PDF, DOCX, CSV. */
function extensao(nome: string): string {
  const partes = nome.split('.');
  if (partes.length < 2) return 'ARQ';
  return partes.pop()!.slice(0, 4).toUpperCase();
}

export function AnexosDemanda({
  demandaId,
  anexos,
  podeMexer,
  aoMudar,
  notificar,
}: {
  demandaId: string;
  anexos: Anexo[];
  /** Falso enquanto a demanda não existe ou o usuário não pode editá-la. */
  podeMexer: boolean;
  aoMudar: (anexos: Anexo[]) => void;
  notificar: Notificar;
}) {
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  async function enviar(arquivos: FileList | File[]) {
    const lista = Array.from(arquivos);
    if (lista.length === 0) return;

    // Barra o tamanho aqui também: evita subir 1MB para receber 400 de volta.
    const grande = lista.find((a) => a.size > TAMANHO_MAXIMO);
    if (grande) {
      return notificar(`"${grande.name}" passa de 1MB. Envie um arquivo menor.`, 'erro');
    }

    setEnviando(true);
    try {
      const prontos = await Promise.all(
        lista.map(async (a) => ({
          nome: a.name,
          conteudo: await lerComoDataURI(a),
        })),
      );
      const res = await fetch(`/api/demandas/${demandaId}/anexos`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ anexos: prontos }),
      });
      const corpo = await res.json();
      if (!res.ok) throw new Error(corpo.erro ?? 'Não foi possível anexar.');
      aoMudar(corpo);
      notificar(
        lista.length === 1 ? 'Arquivo anexado.' : `${lista.length} arquivos anexados.`,
        'ok',
      );
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro ao anexar.', 'erro');
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = '';
    }
  }

  async function remover(anexo: Anexo) {
    if (!confirm(`Remover "${anexo.nome}"?`)) return;
    try {
      const res = await fetch(`/api/anexos/${anexo.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const corpo = await res.json().catch(() => ({}));
        throw new Error(corpo.erro ?? 'Não foi possível remover.');
      }
      aoMudar(anexos.filter((a) => a.id !== anexo.id));
      notificar('Anexo removido.', 'ok');
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro ao remover.', 'erro');
    }
  }

  return (
    <div className="anexos">
      {anexos.length > 0 && (
        <ul className="anexo-lista">
          {anexos.map((a) => (
            <li key={a.id} className="anexo-item">
              <span className="anexo-ext" aria-hidden="true">{extensao(a.nome)}</span>
              <span className="anexo-texto">
                <a
                  className="anexo-nome"
                  href={`/api/anexos/${a.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={a.nome}
                >
                  {a.nome}
                </a>
                <span className="anexo-meta">
                  {formatarTamanho(a.tamanho)} · {a.autorNome}
                </span>
              </span>
              <a
                className="btn-icone anexo-acao"
                href={`/api/anexos/${a.id}?baixar=1`}
                title="Baixar"
                aria-label={`Baixar ${a.nome}`}
              >
                <IconeBaixar size={16} />
              </a>
              {podeMexer && (
                <button
                  className="btn-icone anexo-acao"
                  onClick={() => remover(a)}
                  title="Remover"
                  aria-label={`Remover ${a.nome}`}
                >
                  <IconeLixeira size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {podeMexer && (
        <>
          <input
            ref={entrada}
            type="file"
            multiple
            hidden
            onChange={(e) => e.target.files && enviar(e.target.files)}
          />
          <button
            type="button"
            className={`anexo-solta${arrastando ? ' sobre' : ''}`}
            disabled={enviando}
            onClick={() => entrada.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastando(false);
              if (e.dataTransfer.files.length) enviar(e.dataTransfer.files);
            }}
          >
            {enviando ? (
              <>Enviando…</>
            ) : (
              <>
                <IconeEnviar size={17} />
                <span>
                  <strong>Escolha um arquivo</strong> ou arraste aqui
                  <span className="anexo-dica">Qualquer formato, até 1MB cada</span>
                </span>
              </>
            )}
          </button>
        </>
      )}

      {anexos.length === 0 && !podeMexer && (
        <p className="anexo-vazio"><IconeClipe size={16} /> Nenhum arquivo anexado.</p>
      )}
    </div>
  );
}
