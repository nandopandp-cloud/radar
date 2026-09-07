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

/** Logo oficial do Google, em cores — usado só no botão de login social. */
export const LogoGoogle = ({ size = 19 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.26a12 12 0 0 0 0 10.73l4.01-3.09Z" />
    <path fill="#EA4335" d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.63l4.01 3.1c.95-2.85 3.6-4.98 6.73-4.98Z" />
  </svg>
);
