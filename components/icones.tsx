'use client';

import { useId } from 'react';

/** Ícones em traço, no estilo das referências. Tamanho padrão 19px. */
type P = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const IconeCalendario = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
  </svg>
);

/** Calendário com o dia de hoje marcado — usado no botão "Hoje". */
export const IconeCalendarioHoje = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    <rect x="7" y="12.5" width="4.5" height="4" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconeLista = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="4" y="3" width="16" height="18" rx="2.5" />
    <path d="M8.5 8.5h7M8.5 12.5h7M8.5 16.5h4" />
  </svg>
);

export const IconeSino = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M18 8.5a6 6 0 1 0-12 0c0 6-2 7.5-2 7.5h16s-2-1.5-2-7.5Z" />
    <path d="M10.3 20a2 2 0 0 0 3.4 0" />
  </svg>
);

export const IconeEquipe = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M16 20v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.6A3.6 3.6 0 0 0 3 18.2V20" />
    <circle cx="9.5" cy="7.5" r="3.4" />
    <path d="M21 20v-1.8a3.6 3.6 0 0 0-2.7-3.5M15.5 4.2a3.6 3.6 0 0 1 0 6.6" />
  </svg>
);

export const IconeMais = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 5v14M5 12h14" /></svg>
);

export const IconeX = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}><path d="M18 6 6 18M6 6l12 12" /></svg>
);

export const IconeEsquerda = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}><path d="M15 18l-6-6 6-6" /></svg>
);

export const IconeDireita = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}><path d="M9 18l6-6-6-6" /></svg>
);

/** "i" em círculo — avisos informativos. */
export const IconeInfo = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.8v.1" />
  </svg>
);

/** Setas em ciclo — demanda recorrente. */
export const IconeRepetir = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M17 2.5l3 3-3 3" />
    <path d="M4 12V11a4.5 4.5 0 0 1 4.5-4.5H20" />
    <path d="M7 21.5l-3-3 3-3" />
    <path d="M20 12v1a4.5 4.5 0 0 1-4.5 4.5H4" />
  </svg>
);

/** Calendário com ciclo — cartão de frequência. */
export const IconeCalendarioRepetir = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    <path d="M9 15.5a3 3 0 0 1 5-2.2M15 15.5a3 3 0 0 1-5 2.2" />
  </svg>
);

/** Régua e lápis — regra personalizada. */
export const IconeAjustes = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9.5h18" />
    <path d="M12 13v3.5M10.2 14.8h3.6" />
  </svg>
);

/**
 * Foguete da Ofensiva Radar. Preenchido e com gradiente, diferente dos ícones
 * de traço do resto do app — é um selo, não um controle.
 */
export const IconeFoguete = ({ size = 28, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
    <defs>
      <linearGradient id="og-corpo" x1="10" y1="4" x2="24" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60a5fa" /><stop offset="1" stopColor="#2563eb" />
      </linearGradient>
      <linearGradient id="og-aba" x1="6" y1="14" x2="16" y2="26" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4f46e5" /><stop offset="1" stopColor="#4338ca" />
      </linearGradient>
      <linearGradient id="og-chama" x1="6" y1="22" x2="12" y2="29" gradientUnits="userSpaceOnUse">
        <stop stopColor="#93c5fd" /><stop offset="1" stopColor="#60a5fa" />
      </linearGradient>
    </defs>
    {/* Corpo apontando para o canto superior direito. */}
    <path d="M26.6 5.4c.3 3.9-1 7.6-3.9 10.9l-4.2 4.7-6.5-6.5 4.7-4.2c3.3-2.9 7-4.2 10.9-3.9Z" fill="url(#og-corpo)" />
    {/* Abas laterais. */}
    <path d="M12 14.5 8.6 15c-1 .2-1.7 1.5-.9 2.4l2.3 2.3 2-5.2ZM17.5 20l.5 3.4c.2 1-.4 2-1.4 1.4l-2.6-2 3.5-2.8Z" fill="url(#og-aba)" />
    {/* Rastro de propulsão. */}
    <path d="M9.6 22.4c-1 1-1.6 3.4-1.9 5 1.6-.3 4-.9 5-1.9 1-1 1-2.2 0-3.1-.9-1-2.1-1-3.1 0Z" fill="url(#og-chama)" />
    <circle cx="20.2" cy="11.8" r="2.3" fill="#fff" fillOpacity=".95" />
  </svg>
);

/** Alvo com flecha — meta da ofensiva. */
export const IconeAlvo = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="11" cy="13" r="8" /><circle cx="11" cy="13" r="3.4" />
    <path d="M15.5 8.5 21 3M17.5 3h3.5v3.5" />
  </svg>
);

/** Troféu — aviso de marco próximo. */
export const IconeTrofeu = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4.5v1A3.5 3.5 0 0 0 7 10.4M17 6h2.5v1a3.5 3.5 0 0 1-2.5 3.4" />
    <path d="M10 14v3h4v-3M8 20h8" />
  </svg>
);

/** Barras curtas — bloco de sequência. */
export const IconeBarrinhas = ({ size = 19, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="3" y="14" width="4.5" height="7" rx="1.4" />
    <rect x="9.7" y="9" width="4.5" height="12" rx="1.4" />
    <rect x="16.4" y="4" width="4.5" height="17" rx="1.4" />
  </svg>
);


/**
 * Foguete do modal de comemoração, quase em pé.
 *
 * O volume vem de camadas, não de um gradiente só: cilindro com aresta de
 * luz à esquerda e sombra à direita, bico com topo iluminado, abas com
 * dobra interna e escotilha em cúpula. Os IDs levam sufixo único porque
 * dois foguetes na mesma página colidiriam nos gradientes.
 */
export const IconeFogueteVertical = ({ size = 120, className }: { size?: number; className?: string }) => {
  const u = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 120 130" fill="none" className={className}>
      <defs>
        {/* Cilindro: luz à esquerda, meio claro, sombra fria à direita. */}
        <linearGradient id={`fv-corpo-${u}`} x1="39" y1="0" x2="81" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#dae7f8" /><stop offset=".18" stopColor="#fff" />
          <stop offset=".58" stopColor="#f4f8fe" /><stop offset=".85" stopColor="#cfdef4" />
          <stop offset="1" stopColor="#b3c8e6" />
        </linearGradient>
        {/* Bico: mesma leitura cilíndrica, em azul. */}
        <linearGradient id={`fv-bico-${u}`} x1="39" y1="0" x2="81" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2f6ae0" /><stop offset=".22" stopColor="#4f8bf5" />
          <stop offset=".6" stopColor="#2a6ae8" /><stop offset="1" stopColor="#1546b4" />
        </linearGradient>
        {/* Abas: face externa e dobra interna mais escura. */}
        <linearGradient id={`fv-aba-${u}`} x1="20" y1="60" x2="44" y2="98" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5b93f6" /><stop offset="1" stopColor="#1d55c8" />
        </linearGradient>
        <linearGradient id={`fv-aba2-${u}`} x1="100" y1="60" x2="76" y2="98" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3f7cee" /><stop offset="1" stopColor="#14409f" />
        </linearGradient>
        {/* Cúpula da escotilha: reflexo no alto, fundo escuro embaixo. */}
        <radialGradient id={`fv-vidro-${u}`} cx=".36" cy=".3" r=".85">
          <stop stopColor="#4a6b8f" /><stop offset=".45" stopColor="#173352" />
          <stop offset="1" stopColor="#0a1a2e" />
        </radialGradient>
        <linearGradient id={`fv-aro-${u}`} x1="47" y1="42" x2="73" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5d9bff" /><stop offset=".5" stopColor="#1e62ef" /><stop offset="1" stopColor="#0f3fae" />
        </linearGradient>
        {/* Cinta: metal escuro com brilho no topo. */}
        <linearGradient id={`fv-cinta-${u}`} x1="44" y1="0" x2="76" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2b3444" /><stop offset=".2" stopColor="#59637a" />
          <stop offset=".65" stopColor="#333d4f" /><stop offset="1" stopColor="#1b2230" />
        </linearGradient>
        {/* Chama: núcleo quente por dentro, laranja nas bordas. */}
        <radialGradient id={`fv-fogo-${u}`} cx=".5" cy=".24" r=".8">
          <stop stopColor="#fff3b0" /><stop offset=".35" stopColor="#fdc023" />
          <stop offset=".72" stopColor="#f97316" /><stop offset="1" stopColor="#ea5a09" />
        </radialGradient>
        <radialGradient id={`fv-fogo2-${u}`} cx=".5" cy=".2" r=".75">
          <stop stopColor="#fffbeb" /><stop offset=".5" stopColor="#fde68a" />
          <stop offset="1" stopColor="#fbbf24" />
        </radialGradient>
      </defs>

      {/* Quase em pé: só uma leve inclinação, como na referência. */}
      <g transform="rotate(8 60 66)">
        {/* Chama, atrás de tudo. */}
        <path d="M60 130c-10-11-15-21-15-30 0-7 3-13 9-17 .5 6 2 9.5 4.5 11.5 2.5-8 2-15 .5-21 11 8 16 17 16 26 0 10-5 20-15 30.5Z" fill={`url(#fv-fogo-${u})`} />
        <path d="M60 120c-6-7-9-13-9-19 0-4 1.6-8 5-10.5 .3 4 1 6.5 2.5 8 1.6-5 1.2-9.5 .6-13 6.6 5 9.9 11 9.9 17 0 6-3 12-9 17.5Z" fill={`url(#fv-fogo2-${u})`} />

        {/* Abas com dobra: a face de trás aparece mais escura na base. */}
        <path d="M41 62c-11 7-17 18-19 34 5 2 9 1 13-2 6-5 9-12 10-20l-4-12Z" fill={`url(#fv-aba-${u})`} />
        <path d="M41 62c-9 6-14.5 15.5-17 28 1.5-11 6.5-19.5 14-25.5l3-2.5Z" fill="#8fb6fb" opacity=".75" />
        <path d="M41 62c-4 9-5 19-4 32 2 1 5 1 7-1 1-8 1-17 1-23l-4-8Z" fill="#1c4fbe" opacity=".55" />
        <path d="M79 62c11 7 17 18 19 34-5 2-9 1-13-2-6-5-9-12-10-20l4-12Z" fill={`url(#fv-aba2-${u})`} />
        <path d="M79 62c8 6 13 15 15.5 26-2-10-6.5-18-13-23.5l-2.5-2.5Z" fill="#6f9ef7" opacity=".5" />
        <path d="M79 62c4 9 5 19 4 32-2 1-5 1-7-1-1-8-1-17-1-23l4-8Z" fill="#0d3792" opacity=".5" />

        {/* Corpo. */}
        <path d="M56.5 6.5a5 5 0 0 1 7 0c12 14 17.5 31 17.5 48.5v25c0 8-9 13-21 13s-21-5-21-13V55c0-17.5 5.5-34.5 17.5-48.5Z" fill={`url(#fv-corpo-${u})`} />
        {/* Aresta de luz, colada na borda esquerda. */}
        <path d="M50 22c-4 9-6.5 20-6.5 33v25c0 3 1 5 3 6.5-.6-3-.8-6-.8-9V55c0-12 1.5-23 4.3-33Z" fill="#fff" opacity=".9" />
        {/* Bico e a linha de junção com o corpo. */}
        <path d="M56.5 6.5a5 5 0 0 1 7 0c9.5 11 15 23.5 17.5 34.5a70 70 0 0 0-42 0C41.5 30 47 17.5 56.5 6.5Z" fill={`url(#fv-bico-${u})`} />
        <path d="M60 3.6c1.2 0 2.4.5 3.4 1.5a5 5 0 0 0-6.9 0c1-1 2.2-1.5 3.5-1.5Z" fill="#7fb0ff" opacity=".7" />
        <path d="M39 41.5a70 70 0 0 1 42 0l.5 2.2a72 72 0 0 0-43 0l.5-2.2Z" fill="#0f3aa0" opacity=".28" />

        {/* Escotilha: aro em anel, vidro em cúpula e dois reflexos. */}
        <circle cx="60" cy="54" r="16.8" fill="#eef5ff" />
        <circle cx="60" cy="54" r="15.4" fill={`url(#fv-aro-${u})`} />
        {/* Brilho no alto do aro, que dá o arredondado do metal. */}
        <path d="M60 39.4a15.4 15.4 0 0 1 13 7.1 15.4 15.4 0 0 0-26 0 15.4 15.4 0 0 1 13-7.1Z" fill="#9cc4ff" opacity=".85" />
        <circle cx="60" cy="54" r="10.8" fill={`url(#fv-vidro-${u})`} />
        <path d="M52.6 48.6c1.7-2.6 4.3-4.4 7.2-5 .9-.2 1.2 1.2.3 1.4-2.5.6-4.8 2.1-6.3 4.4-.6.9-1.8.1-1.2-.8Z" fill="#cfe2ff" opacity=".9" />
        <ellipse cx="64.5" cy="61" rx="3.6" ry="2.2" fill="#8fb4e0" opacity=".28" transform="rotate(-28 64.5 61)" />

        {/* Cinta do propulsor, com lábio inferior mais escuro. */}
        <rect x="44" y="85" width="32" height="11" rx="4" fill={`url(#fv-cinta-${u})`} />
        <rect x="44" y="93" width="32" height="3" rx="1.5" fill="#10161f" opacity=".55" />
      </g>
    </svg>
  );
};

/**
 * Céu do modal da ofensiva: arcos concêntricos, banco de nuvens e as
 * faíscas de quatro pontas. Fica atrás do foguete, no topo da caixa.
 */
export const IconeCeuOfensiva = ({ className }: { className?: string }) => {
  const u = useId();
  return (
    <svg viewBox="0 0 520 300" fill="none" className={className} preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id={`ceu-nuvem-${u}`} x1="260" y1="150" x2="260" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" /><stop offset="1" stopColor="#eef4fd" />
        </linearGradient>
      </defs>

      {/* Arcos concêntricos, do mais claro ao mais forte. */}
      <g>
        <circle cx="260" cy="300" r="250" fill="#eaf1fd" />
        <circle cx="260" cy="300" r="200" fill="#dce9fc" />
        <circle cx="260" cy="300" r="150" fill="#ccddfa" />
      </g>

      {/* Banco de nuvens: lóbulos sobrepostos, apoiados na base. */}
      <g fill={`url(#ceu-nuvem-${u})`}>
        <circle cx="128" cy="280" r="46" />
        <circle cx="190" cy="266" r="54" />
        <circle cx="262" cy="258" r="60" />
        <circle cx="336" cy="268" r="52" />
        <circle cx="398" cy="282" r="42" />
        <rect x="74" y="276" width="372" height="34" rx="17" />
      </g>

      {/* Faíscas de quatro pontas espalhadas pelo céu. */}
      <g>
        <path d="M96 118c1.8 8 3.6 9.8 11.6 11.6-8 1.8-9.8 3.6-11.6 11.6-1.8-8-3.6-9.8-11.6-11.6 8-1.8 9.8-3.6 11.6-11.6Z" fill="#3b82f6" />
        <path d="M430 146c1.5 6.8 3 8.3 9.8 9.8-6.8 1.5-8.3 3-9.8 9.8-1.5-6.8-3-8.3-9.8-9.8 6.8-1.5 8.3-3 9.8-9.8Z" fill="#3b82f6" />
        <path d="M146 54c1.3 5.8 2.6 7.1 8.4 8.4-5.8 1.3-7.1 2.6-8.4 8.4-1.3-5.8-2.6-7.1-8.4-8.4 5.8-1.3 7.1-2.6 8.4-8.4Z" fill="#60a5fa" />
        <path d="M380 52c1.6 7.2 3.2 8.8 10.4 10.4-7.2 1.6-8.8 3.2-10.4 10.4-1.6-7.2-3.2-8.8-10.4-10.4 7.2-1.6 8.8-3.2 10.4-10.4Z" fill="#4ade80" />
      </g>
    </svg>
  );
};

/** Chama — dias de ofensiva no painel. */
export const IconeChama = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3s5 4.2 5 9a5 5 0 0 1-10 0c0-1.6.7-3 1.5-4 .2 1.3 1 2.2 2 2.2 1.4 0 1.8-1.6 1.5-3.2-.2-1.4-.6-2.7-1-4Z" />
  </svg>
);

/** Linha em alta — taxa de cumprimento. */
export const IconeTendencia = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3.5 16.5l5-5 3.5 3.5 6-6.5" />
    <path d="M14.5 8h4v4" />
  </svg>
);

/** Barras de gráfico — o painel. */
export const IconeGrafico = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3.5 21h17" />
    <path d="M6.5 21V11M11 21V4.5M15.5 21v-6M20 21v-9.5" />
  </svg>
);

/** Clipe de papel — anexos. */
export const IconeClipe = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M21 11.5l-8.8 8.8a5 5 0 0 1-7.1-7.1l8.8-8.8a3.3 3.3 0 0 1 4.7 4.7l-8.8 8.8a1.7 1.7 0 0 1-2.4-2.4l8.1-8.1" />
  </svg>
);

/** Balão de conversa — comentários. */
export const IconeBalao = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M21 11.5a8 8 0 0 1-11.6 7.2L3 20.5l1.8-6.4A8 8 0 1 1 21 11.5z" />
  </svg>
);

/** Seta para baixo com base — baixar arquivo. */
export const IconeBaixar = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M4 18.5V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5" />
  </svg>
);

/** Seta para cima com base — enviar arquivo. */
export const IconeEnviar = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 21V9m0 0L7.5 13.5M12 9l4.5 4.5M4 5.5V4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v1.5" />
  </svg>
);

/** Seta dupla — recolhe e expande a barra lateral. */
export const IconeDuploEsquerda = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M13 17l-5-5 5-5M18 17l-5-5 5-5" />
  </svg>
);

export const IconeRelogio = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
);

export const IconeAlerta = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.2v.1" />
  </svg>
);

export const IconeCheck = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}><path d="M20 6 9 17l-5-5" /></svg>
);

export const IconeCheckCirculo = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" /><path d="M8.5 12.2l2.5 2.5 4.5-4.8" />
  </svg>
);

export const IconeDocumento = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </svg>
);

export const IconeUsuario = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M19 20v-1.8a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4V20" />
    <circle cx="12" cy="7.5" r="3.6" />
  </svg>
);

export const IconeEtiqueta = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
    <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconeBandeira = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 21V4M4 4h10l-1.5 3.5L14 11H4" />
  </svg>
);

export const IconeCirculo = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="8.5" /></svg>
);

export const IconeLapis = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5L16.5 3.5Z" />
  </svg>
);

export const IconeLixeira = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3.5 6h17M8.5 6V4.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5V6M18.5 6l-.8 13a2 2 0 0 1-2 1.9H8.3a2 2 0 0 1-2-1.9L5.5 6" />
  </svg>
);

export const IconeSair = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

export const IconeLampada = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9 18h6M10 21.5h4M12 2.5a6 6 0 0 0-3.5 10.9c.6.5.9 1.1 1 1.6h5c.1-.5.4-1.1 1-1.6A6 6 0 0 0 12 2.5Z" />
  </svg>
);

export const IconeOlho = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconeOlhoFechado = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C4 8.3 2 12 2 12s3.6 7 10 7a10.2 10.2 0 0 0 4.2-.9" />
    <path d="M9.9 10a3 3 0 0 0 4.2 4.2" />
  </svg>
);

export const IconeEngrenagem = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.4 15a2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.8h.1a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.4 1Z" />
  </svg>
);

export const IconeMenu = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);

export const IconeQuadro = ({ size = 19, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="3.5" width="7" height="17" rx="2" />
    <rect x="14" y="3.5" width="7" height="11" rx="2" />
  </svg>
);
