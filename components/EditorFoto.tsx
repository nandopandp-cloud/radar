'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconeCheck, IconeRepetir, IconeX } from '@/components/icones';
import { LADO_MAXIMO, TAMANHO_MAXIMO } from '@/lib/avatar';

/**
 * Editor da foto de perfil: enquadra a imagem antes de salvar.
 *
 * Existe porque o recorte automático pelo centro corta mal a maioria das
 * fotos — rostos raramente estão no centro geométrico. Aqui a pessoa arrasta,
 * amplia e gira até o enquadramento ficar certo, e só o que aparece dentro do
 * círculo é gravado.
 */

/** Lado da área de recorte na tela, em px. */
const PALCO = 300;

/** Limites do zoom, como múltiplo do tamanho que preenche o círculo. */
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;

type Ponto = { x: number; y: number };

export function EditorFoto({
  arquivo,
  aoConfirmar,
  aoCancelar,
}: {
  /** A imagem escolhida, já lida como data URI. */
  arquivo: string;
  aoConfirmar: (dataUri: string) => void;
  aoCancelar: () => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [giro, setGiro] = useState(0);
  const [pos, setPos] = useState<Ponto>({ x: 0, y: 0 });
  const [salvando, setSalvando] = useState(false);

  const arrastando = useRef(false);
  const ultimo = useRef<Ponto>({ x: 0, y: 0 });

  useEffect(() => {
    const el = new Image();
    el.onload = () => setImg(el);
    el.onerror = () => setErro('Não foi possível abrir esta imagem.');
    el.src = arquivo;
  }, [arquivo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && aoCancelar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aoCancelar]);

  /**
   * Escala que faz a imagem cobrir o círculo por inteiro, já considerando o
   * giro: virada 90°, é a altura que precisa cobrir a largura.
   */
  const escalaBase = useCallback(() => {
    if (!img) return 1;
    const virada = giro % 180 !== 0;
    const larg = virada ? img.height : img.width;
    const alt = virada ? img.width : img.height;
    return PALCO / Math.min(larg, alt);
  }, [img, giro]);

  /**
   * Impede que o arrasto revele fundo vazio: a imagem sempre cobre o círculo.
   */
  const limitar = useCallback(
    (p: Ponto, z: number): Ponto => {
      if (!img) return p;
      const escala = escalaBase() * z;
      const virada = giro % 180 !== 0;
      const larg = (virada ? img.height : img.width) * escala;
      const alt = (virada ? img.width : img.height) * escala;
      const folgaX = Math.max(0, (larg - PALCO) / 2);
      const folgaY = Math.max(0, (alt - PALCO) / 2);
      return {
        x: Math.min(folgaX, Math.max(-folgaX, p.x)),
        y: Math.min(folgaY, Math.max(-folgaY, p.y)),
      };
    },
    [img, giro, escalaBase],
  );

  // Ao girar, o enquadramento antigo deixa de valer: recentraliza.
  useEffect(() => { setPos({ x: 0, y: 0 }); }, [giro]);

  function iniciarArrasto(e: React.PointerEvent) {
    arrastando.current = true;
    ultimo.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function arrastar(e: React.PointerEvent) {
    if (!arrastando.current) return;
    const dx = e.clientX - ultimo.current.x;
    const dy = e.clientY - ultimo.current.y;
    ultimo.current = { x: e.clientX, y: e.clientY };
    setPos((p) => limitar({ x: p.x + dx, y: p.y + dy }, zoom));
  }

  function soltarArrasto(e: React.PointerEvent) {
    arrastando.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }

  function mudarZoom(novo: number) {
    const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, novo));
    setZoom(z);
    setPos((p) => limitar(p, z));
  }

  /** Redesenha só o que está dentro do círculo, no tamanho final. */
  function confirmar() {
    if (!img) return;
    setSalvando(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = LADO_MAXIMO;
      canvas.height = LADO_MAXIMO;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.');

      // Do palco para o tamanho final: tudo é feito na mesma proporção.
      const k = LADO_MAXIMO / PALCO;
      const escala = escalaBase() * zoom * k;

      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, LADO_MAXIMO, LADO_MAXIMO);

      ctx.save();
      ctx.translate(LADO_MAXIMO / 2 + pos.x * k, LADO_MAXIMO / 2 + pos.y * k);
      ctx.rotate((giro * Math.PI) / 180);
      ctx.scale(escala, escala);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      const saida = canvas.toDataURL('image/jpeg', 0.85);
      if (saida.length > TAMANHO_MAXIMO) {
        throw new Error('A imagem ficou pesada demais. Tente reduzir o zoom.');
      }
      aoConfirmar(saida);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível recortar a imagem.');
      setSalvando(false);
    }
  }

  const escala = escalaBase() * zoom;

  return (
    <>
      <div className="veu" onClick={aoCancelar} />
      <div className="foto-editor" role="dialog" aria-modal="true" aria-label="Enquadrar foto">
        <div className="foto-editor-topo">
          <div>
            <h2 className="cartao-titulo">Enquadrar foto</h2>
            <p className="cartao-desc">Arraste para posicionar. Só o que estiver no círculo é salvo.</p>
          </div>
          <button className="btn-icone" onClick={aoCancelar} aria-label="Fechar">
            <IconeX size={20} />
          </button>
        </div>

        {erro ? (
          <p className="foto-editor-erro">{erro}</p>
        ) : (
          <>
            <div
              className="foto-palco"
              style={{ width: PALCO, height: PALCO }}
              onPointerDown={iniciarArrasto}
              onPointerMove={arrastar}
              onPointerUp={soltarArrasto}
              onPointerCancel={soltarArrasto}
            >
              {img && (
                <img
                  src={arquivo}
                  alt=""
                  draggable={false}
                  className="foto-palco-imagem"
                  style={{
                    width: img.width,
                    height: img.height,
                    transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) rotate(${giro}deg) scale(${escala})`,
                  }}
                />
              )}
              {/* Máscara circular: escurece o que ficará de fora. */}
              <div className="foto-mascara" aria-hidden="true" />
            </div>

            <div className="foto-controles">
              <label className="foto-zoom">
                <span className="rotulo">Zoom</span>
                <input
                  type="range"
                  min={ZOOM_MIN}
                  max={ZOOM_MAX}
                  step={0.02}
                  value={zoom}
                  onChange={(e) => mudarZoom(Number(e.target.value))}
                />
              </label>

              <div className="foto-botoes-giro">
                <button
                  type="button"
                  className="btn btn-secundario btn-mini"
                  onClick={() => setGiro((g) => (g - 90 + 360) % 360)}
                >
                  <IconeRepetir size={16} className="espelhado" /> Girar
                </button>
                <button
                  type="button"
                  className="btn btn-secundario btn-mini"
                  onClick={() => setGiro((g) => (g + 90) % 360)}
                >
                  <IconeRepetir size={16} /> Girar
                </button>
                <button
                  type="button"
                  className="btn btn-secundario btn-mini"
                  onClick={() => { setZoom(1); setGiro(0); setPos({ x: 0, y: 0 }); }}
                >
                  Reiniciar
                </button>
              </div>
            </div>
          </>
        )}

        <div className="foto-editor-acoes">
          <button type="button" className="btn btn-secundario" onClick={aoCancelar}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primario"
            onClick={confirmar}
            disabled={!img || salvando || !!erro}
          >
            {salvando ? <><span className="girando">⏳</span> Salvando…</> : <><IconeCheck size={17} /> Usar esta foto</>}
          </button>
        </div>
      </div>
    </>
  );
}
