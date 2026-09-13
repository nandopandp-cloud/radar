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
