'use client';

import { useRef, useState } from 'react';
import { IconeBaixar, IconeClipe, IconeEnviar, IconeLixeira } from '@/components/icones';
import { LogoDrive } from '@/components/LogoDrive';
import { SeletorDrive } from '@/components/SeletorDrive';
import { tamanhoLegivel, type ArquivoDrive } from '@/lib/drive-demo';
import { formatarTamanho, MAXIMO_POR_DEMANDA, TAMANHO_MAXIMO, TAMANHO_MAXIMO_TEXTO } from '@/lib/anexos';
import { useDialogo } from '@/components/Dialogo';
import type { Anexo, Notificar } from '@/lib/tipos';

/** O que a API precisa para registrar um arquivo que já subiu para o R2. */
export type AnexoEnviado = { chave: string; nome: string; tipo: string };

/** Extensão em caixa alta para o quadradinho da lista: PDF, DOCX, CSV. */
function extensao(nome: string): string {
  const partes = nome.split('.');
  if (partes.length < 2) return 'ARQ';
  return partes.pop()!.slice(0, 4).toUpperCase();
}

/** Barra antes de subir o que o servidor recusaria de qualquer forma. */
function cabeNoLimite(arquivos: File[], jaTem: number, notificar: Notificar): boolean {
  if (arquivos.length === 0) return false;
  if (jaTem + arquivos.length > MAXIMO_POR_DEMANDA) {
    notificar(`Cada demanda aceita no máximo ${MAXIMO_POR_DEMANDA} anexos.`, 'erro');
    return false;
  }
  const grande = arquivos.find((a) => a.size > TAMANHO_MAXIMO);
  if (grande) {
    notificar(`"${grande.name}" passa de ${TAMANHO_MAXIMO_TEXTO}. Envie um arquivo menor.`, 'erro');
    return false;
  }
  const vazio = arquivos.find((a) => a.size === 0);
  if (vazio) {
    notificar(`"${vazio.name}" está vazio.`, 'erro');
    return false;
  }
  return true;
}

/**
 * Sobe os arquivos direto no R2, por links que o Radar assina. Sem passar pela
 * Vercel, o limite de 4,5MB por requisição deixa de valer.
 */
export async function subirArquivos(arquivos: File[]): Promise<AnexoEnviado[]> {
  const res = await fetch('/api/anexos/envio', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ arquivos: arquivos.map((a) => ({ nome: a.name, tamanho: a.size })) }),
  });
  const links = await res.json();
  if (!res.ok) throw new Error(links.erro ?? 'Não foi possível preparar o envio.');

  return Promise.all(
    arquivos.map(async (arquivo, i) => {
      const r = await fetch(links[i].url, { method: 'PUT', body: arquivo }).catch(() => null);
      if (!r?.ok) throw new Error(`Não foi possível enviar "${arquivo.name}". Tente novamente.`);
      return { chave: links[i].chave, nome: arquivo.name, tipo: arquivo.type };
    }),
  );
}

/**
 * Um arquivo do Drive vira um anexo-referência: enquanto a integração não
 * existe, não há bytes para copiar, então o que fica na demanda é um cartão
 * que aponta para o arquivo no Drive. É deliberadamente um texto legível —
 * quem abrir entende que é um vínculo, não uma cópia do documento.
 */
function referenciaDoDrive(a: ArquivoDrive): File {
  const texto = [
    'Referência a um arquivo do Google Drive.',
    '',
    `Arquivo: ${a.nome}`,
    `Proprietário: ${a.proprietario}`,
    `Tamanho no Drive: ${tamanhoLegivel(a.tamanho)}`,
    '',
    'O conteúdo continua no Drive. A cópia para dentro do Radar acontece',
    'quando a conexão com o Google estiver ativa.',
  ].join('\n');

  return new File([texto], `${a.nome}.link.txt`, { type: 'text/plain' });
}

/** Área de escolher/arrastar arquivos, comum aos dois modos. */
function AreaDeEnvio({
  enviando,
  aoEscolher,
  aoEscolherDoDrive,
  mostrarDrive,
}: {
  enviando: boolean;
  aoEscolher: (arquivos: FileList | File[]) => void;
  aoEscolherDoDrive: (arquivos: ArquivoDrive[]) => void;
  /** O Drive só aparece para quem está com os recursos em avaliação liberados. */
  mostrarDrive: boolean;
}) {
  const [arrastando, setArrastando] = useState(false);
  const [drive, setDrive] = useState(false);
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
              <span className="anexo-dica">Qualquer formato, até {TAMANHO_MAXIMO_TEXTO} cada</span>
            </span>
          </>
        )}
      </button>

      {mostrarDrive && (
        <button
          type="button"
          className="btn btn-secundario btn-bloco anexo-drive"
          disabled={enviando}
          onClick={() => setDrive(true)}
        >
          <LogoDrive size={17} /> Escolher do Google Drive
        </button>
      )}

      {drive && (
        <SeletorDrive
          aoFechar={() => setDrive(false)}
          aoConfirmar={(escolhidos) => {
            setDrive(false);
            aoEscolherDoDrive(escolhidos);
          }}
        />
      )}
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
  mostrarDrive = false,
}: {
  anexos: File[];
  aoMudar: (anexos: File[]) => void;
  notificar: Notificar;
  mostrarDrive?: boolean;
}) {
  function escolher(arquivos: FileList | File[]) {
    const lista = Array.from(arquivos);
    if (cabeNoLimite(lista, anexos.length, notificar)) aoMudar([...anexos, ...lista]);
  }

  return (
    <div className="anexos">
      {anexos.length > 0 && (
        <ul className="anexo-lista">
          {anexos.map((a, i) => (
            <li key={`${a.name}-${i}`} className="anexo-item">
              <span className="anexo-ext" aria-hidden="true">{extensao(a.name)}</span>
              <span className="anexo-texto">
                <span className="anexo-nome" title={a.name}>{a.name}</span>
                <span className="anexo-meta">{formatarTamanho(a.size)}</span>
              </span>
              <button
                type="button"
                className="btn-icone anexo-acao"
                onClick={() => aoMudar(anexos.filter((_, j) => j !== i))}
                title="Remover"
                aria-label={`Remover ${a.name}`}
              >
                <IconeLixeira size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <AreaDeEnvio
        enviando={false}
        aoEscolher={escolher}
        mostrarDrive={mostrarDrive}
        aoEscolherDoDrive={(arquivos) => {
          if (!cabeNoLimite(arquivos.map(referenciaDoDrive), anexos.length, notificar)) return;
          aoMudar([...anexos, ...arquivos.map(referenciaDoDrive)]);
          notificar(
            arquivos.length === 1
              ? 'Arquivo do Drive vinculado à demanda.'
              : `${arquivos.length} arquivos do Drive vinculados.`,
            'ok',
          );
        }}
      />
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
  mostrarDrive = false,
}: {
  demandaId: string;
  anexos: Anexo[];
  /** Falso quando o usuário não pode editar a demanda. */
  podeMexer: boolean;
  aoMudar: (anexos: Anexo[]) => void;
  notificar: Notificar;
  mostrarDrive?: boolean;
}) {
  const { confirmar } = useDialogo();
  const [enviando, setEnviando] = useState(false);

  /** Arquivos comuns e vínculos do Drive sobem pelo mesmo caminho. */
  async function enviar(arquivos: File[], doDrive = false) {
    if (!cabeNoLimite(arquivos, anexos.length, notificar)) return;
    setEnviando(true);
    try {
      const enviados = await subirArquivos(arquivos);
      const res = await fetch(`/api/demandas/${demandaId}/anexos`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ anexos: enviados }),
      });
      const corpo = await res.json();
      if (!res.ok) throw new Error(corpo.erro ?? 'Não foi possível anexar.');
      aoMudar(corpo);
      const n = arquivos.length;
      notificar(
        doDrive
          ? n === 1 ? 'Arquivo do Drive vinculado à demanda.' : `${n} arquivos do Drive vinculados.`
          : n === 1 ? 'Arquivo anexado.' : `${n} arquivos anexados.`,
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

      {podeMexer && (
        <AreaDeEnvio
          enviando={enviando}
          aoEscolher={(arquivos) => void enviar(Array.from(arquivos))}
          mostrarDrive={mostrarDrive}
          aoEscolherDoDrive={(arquivos) => void enviar(arquivos.map(referenciaDoDrive), true)}
        />
      )}

      {anexos.length === 0 && !podeMexer && (
        <p className="anexo-vazio"><IconeClipe size={16} /> Nenhum arquivo anexado.</p>
      )}
    </div>
  );
}
