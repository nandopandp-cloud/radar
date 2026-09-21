'use client';

import { useRef, useState } from 'react';
import { IconeBaixar, IconeClipe, IconeEnviar, IconeLixeira } from '@/components/icones';
import {
  dividirEmLotes, formatarTamanho, MAXIMO_POR_DEMANDA, TAMANHO_MAXIMO,
} from '@/lib/anexos';
import { useDialogo } from '@/components/Dialogo';
import type { Anexo, AnexoPendente, Notificar } from '@/lib/tipos';

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

/**
 * Converte os arquivos escolhidos, barrando o que passa de 1MB antes de ler —
 * evita torrar memória e subir só para receber 400 de volta.
 */
async function prepararArquivos(
  arquivos: FileList | File[],
  notificar: Notificar,
): Promise<AnexoPendente[] | null> {
  const lista = Array.from(arquivos);
  if (lista.length === 0) return null;

  const grande = lista.find((a) => a.size > TAMANHO_MAXIMO);
  if (grande) {
    notificar(`"${grande.name}" passa de 1MB. Envie um arquivo menor.`, 'erro');
    return null;
  }

  return Promise.all(
    lista.map(async (a) => ({
      nome: a.name,
      tipo: a.type || 'application/octet-stream',
      tamanho: a.size,
      conteudo: await lerComoDataURI(a),
    })),
  );
}

/** Área de escolher/arrastar arquivos, comum aos dois modos. */
function AreaDeEnvio({
  enviando,
  aoEscolher,
}: {
  enviando: boolean;
  aoEscolher: (arquivos: FileList | File[]) => void;
}) {
  const [arrastando, setArrastando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={entrada}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) aoEscolher(e.target.files);
          e.target.value = '';
        }}
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
          if (e.dataTransfer.files.length) aoEscolher(e.dataTransfer.files);
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
  );
}

/**
 * Anexos de uma demanda que ainda não existe: ficam em memória e sobem depois
 * que ela é criada, porque só então há um id para vinculá-los.
 */
export function AnexosPendentes({
  anexos,
  aoMudar,
  notificar,
}: {
  anexos: AnexoPendente[];
  aoMudar: (anexos: AnexoPendente[]) => void;
  notificar: Notificar;
}) {
  const [lendo, setLendo] = useState(false);

  async function escolher(arquivos: FileList | File[]) {
    if (anexos.length + Array.from(arquivos).length > MAXIMO_POR_DEMANDA) {
      return notificar(`Cada demanda aceita no máximo ${MAXIMO_POR_DEMANDA} anexos.`, 'erro');
    }
    setLendo(true);
    try {
      const prontos = await prepararArquivos(arquivos, notificar);
      if (prontos) aoMudar([...anexos, ...prontos]);
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro ao ler o arquivo.', 'erro');
    } finally {
      setLendo(false);
    }
  }

  return (
    <div className="anexos">
      {anexos.length > 0 && (
        <ul className="anexo-lista">
          {anexos.map((a, i) => (
            <li key={`${a.nome}-${i}`} className="anexo-item">
              <span className="anexo-ext" aria-hidden="true">{extensao(a.nome)}</span>
              <span className="anexo-texto">
                <span className="anexo-nome" title={a.nome}>{a.nome}</span>
                <span className="anexo-meta">{formatarTamanho(a.tamanho)}</span>
              </span>
              <button
                type="button"
                className="btn-icone anexo-acao"
                onClick={() => aoMudar(anexos.filter((_, j) => j !== i))}
                title="Remover"
                aria-label={`Remover ${a.nome}`}
              >
                <IconeLixeira size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <AreaDeEnvio enviando={lendo} aoEscolher={escolher} />
    </div>
  );
}

/** Anexos de uma demanda já existente: cada arquivo sobe na hora. */
export function AnexosDemanda({
  demandaId,
  anexos,
  podeMexer,
  aoMudar,
  notificar,
}: {
  demandaId: string;
  anexos: Anexo[];
  /** Falso quando o usuário não pode editar a demanda. */
  podeMexer: boolean;
  aoMudar: (anexos: Anexo[]) => void;
  notificar: Notificar;
}) {
  const { confirmar } = useDialogo();
  const [enviando, setEnviando] = useState(false);

  async function enviar(arquivos: FileList | File[]) {
    setEnviando(true);
    try {
      const prontos = await prepararArquivos(arquivos, notificar);
      if (!prontos) return;

      // Em lotes: vários arquivos de 1MB em base64 estouram o corpo da requisição.
      let atualizados: Anexo[] = anexos;
      for (const lote of dividirEmLotes(prontos)) {
        const res = await fetch(`/api/demandas/${demandaId}/anexos`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ anexos: lote }),
        });
        const corpo = await res.json();
        if (!res.ok) throw new Error(corpo.erro ?? 'Não foi possível anexar.');
        atualizados = corpo;
      }
      aoMudar(atualizados);
      notificar(
        prontos.length === 1 ? 'Arquivo anexado.' : `${prontos.length} arquivos anexados.`,
        'ok',
      );
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro ao anexar.', 'erro');
    } finally {
      setEnviando(false);
    }
  }

  async function remover(anexo: Anexo) {
    const segue = await confirmar({
      titulo: 'Remover este anexo?',
      mensagem: `“${anexo.nome}” será apagado da demanda e não poderá ser recuperado.`,
      confirmar: 'Remover',
      tom: 'perigo',
    });
    if (!segue) return;
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
                  type="button"
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

      {podeMexer && <AreaDeEnvio enviando={enviando} aoEscolher={enviar} />}

      {anexos.length === 0 && !podeMexer && (
        <p className="anexo-vazio"><IconeClipe size={16} /> Nenhum arquivo anexado.</p>
      )}
    </div>
  );
}
