'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { IconeAlerta, IconeX } from '@/components/icones';

/**
 * Diálogos do Radar — substituem `confirm()` e `prompt()` do navegador.
 *
 * Os nativos têm três problemas: aparecem com a cara do navegador (e não do
 * produto), travam a aba inteira enquanto abertos, e podem ser silenciosamente
 * bloqueados — caso em que `confirm()` devolve `false` e a ação simplesmente
 * não acontece, sem explicação para quem clicou.
 *
 * A API imita a nativa de propósito: `await confirmar(...)` no lugar de
 * `confirm(...)`, então a conversão de cada chamada é quase direta.
 */

export type TomDialogo = 'perigo' | 'aviso' | 'neutro';

type PedidoConfirmacao = {
  tipo: 'confirmar';
  titulo: string;
  mensagem?: string;
  /** Linhas extras em destaque: consequências que a pessoa deve ler antes. */
  detalhes?: string[];
  confirmar?: string;
  cancelar?: string;
  tom?: TomDialogo;
};

type PedidoTexto = {
  tipo: 'texto';
  titulo: string;
  mensagem?: string;
  rotulo: string;
  valorInicial?: string;
  placeholder?: string;
  /** Campo de senha some da tela e do gerenciador de senhas do navegador. */
  segredo?: boolean;
  confirmar?: string;
  cancelar?: string;
  /** Devolve a mensagem de erro, ou null se o valor serve. */
  validar?: (valor: string) => string | null;
};

type Pedido = PedidoConfirmacao | PedidoTexto;

type Contexto = {
  confirmar: (p: Omit<PedidoConfirmacao, 'tipo'>) => Promise<boolean>;
  pedirTexto: (p: Omit<PedidoTexto, 'tipo'>) => Promise<string | null>;
};

const CtxDialogo = createContext<Contexto | null>(null);

/** Hook de uso: `const { confirmar } = useDialogo()`. */
export function useDialogo(): Contexto {
  const ctx = useContext(CtxDialogo);
  if (!ctx) throw new Error('useDialogo precisa estar dentro de <ProvedorDialogo>.');
  return ctx;
}

export function ProvedorDialogo({ children }: { children: React.ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  /** Resolve a Promise de quem chamou; trocado a cada novo pedido. */
  const resolver = useRef<((r: unknown) => void) | null>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  const confirmarRef = useRef<HTMLButtonElement>(null);

  const fechar = useCallback((resultado: unknown) => {
    resolver.current?.(resultado);
    resolver.current = null;
    setPedido(null);
    setValor('');
    setErro(null);
  }, []);

  const confirmar = useCallback((p: Omit<PedidoConfirmacao, 'tipo'>) => {
    return new Promise<boolean>((res) => {
      resolver.current = res as (r: unknown) => void;
      setPedido({ ...p, tipo: 'confirmar' });
    });
  }, []);

  const pedirTexto = useCallback((p: Omit<PedidoTexto, 'tipo'>) => {
    return new Promise<string | null>((res) => {
      resolver.current = res as (r: unknown) => void;
      setValor(p.valorInicial ?? '');
      setPedido({ ...p, tipo: 'texto' });
    });
  }, []);

  // Foco vai para o campo (ou para o botão) ao abrir, e Esc sempre cancela.
  useEffect(() => {
    if (!pedido) return;
    const alvo = pedido.tipo === 'texto' ? campoRef.current : confirmarRef.current;
    alvo?.focus();

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        fechar(pedido!.tipo === 'texto' ? null : false);
      }
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [pedido, fechar]);

  function enviarTexto() {
    if (!pedido || pedido.tipo !== 'texto') return;
    const limpo = valor.trim();
    const problema = pedido.validar?.(limpo) ?? null;
    if (problema) {
      setErro(problema);
      campoRef.current?.focus();
      return;
    }
    fechar(limpo);
  }

  const tom = pedido && pedido.tipo === 'confirmar' ? (pedido.tom ?? 'neutro') : 'neutro';

  return (
    <CtxDialogo.Provider value={{ confirmar, pedirTexto }}>
      {children}

      {pedido && (
        <>
          {/* Clicar fora cancela, como no modal do dia. */}
          <div className="veu" onClick={() => fechar(pedido.tipo === 'texto' ? null : false)} />
          <div
            className={`dialogo dialogo-${tom}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dialogo-titulo"
          >
            <button
              className="btn-icone dialogo-fechar"
              onClick={() => fechar(pedido.tipo === 'texto' ? null : false)}
              aria-label="Fechar"
            >
              <IconeX size={17} />
            </button>

            <div className="dialogo-corpo">
              {tom !== 'neutro' && (
                <div className="dialogo-icone" aria-hidden="true">
                  <IconeAlerta size={21} />
                </div>
              )}

              <div className="dialogo-texto">
                <h2 className="dialogo-titulo" id="dialogo-titulo">{pedido.titulo}</h2>
                {pedido.mensagem && <p className="dialogo-mensagem">{pedido.mensagem}</p>}

                {pedido.tipo === 'confirmar' && pedido.detalhes && pedido.detalhes.length > 0 && (
                  <ul className="dialogo-detalhes">
                    {pedido.detalhes.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                )}

                {pedido.tipo === 'texto' && (
                  <div className="campo dialogo-campo">
                    <label className="rotulo" htmlFor="dialogo-entrada">{pedido.rotulo}</label>
                    <input
                      id="dialogo-entrada"
                      ref={campoRef}
                      className="entrada"
                      type={pedido.segredo ? 'password' : 'text'}
                      value={valor}
                      placeholder={pedido.placeholder}
                      autoComplete={pedido.segredo ? 'new-password' : 'off'}
                      onChange={(e) => { setValor(e.target.value); setErro(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); enviarTexto(); } }}
                    />
                    {erro && <p className="dialogo-erro">{erro}</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="dialogo-acoes">
              <button
                className="btn btn-secundario"
                onClick={() => fechar(pedido.tipo === 'texto' ? null : false)}
              >
                {pedido.cancelar ?? 'Cancelar'}
              </button>
              <button
                ref={confirmarRef}
                className={`btn ${tom === 'perigo' ? 'btn-perigo' : 'btn-primario'}`}
                onClick={() => (pedido.tipo === 'texto' ? enviarTexto() : fechar(true))}
              >
                {pedido.confirmar ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </>
      )}
    </CtxDialogo.Provider>
  );
}
