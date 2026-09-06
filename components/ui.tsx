'use client';

import { ROTULO_PRIORIDADE, ROTULO_STATUS, type Prioridade, type Status } from '@/lib/dominio';

export function SeloPrioridade({ valor }: { valor: string }) {
  return (
    <span className={`selo selo-${valor}`}>
      {ROTULO_PRIORIDADE[valor as Prioridade] ?? valor}
    </span>
  );
}

export function SeloStatus({ valor }: { valor: string }) {
  return (
    <span className={`selo selo-${valor}`}>{ROTULO_STATUS[valor as Status] ?? valor}</span>
  );
}

export function Avatar({ nome }: { nome: string }) {
  const iniciais = nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return <div className="avatar">{iniciais || '?'}</div>;
}

export function Vazio({
  icone,
  titulo,
  texto,
}: {
  icone: string;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="vazio">
      <div className="vazio-icone">{icone}</div>
      <div className="vazio-titulo">{titulo}</div>
      <p className="vazio-texto">{texto}</p>
    </div>
  );
}

export function Aviso({
  tipo = 'info',
  icone,
  children,
}: {
  tipo?: 'ok' | 'info' | 'alerta' | 'erro';
  icone?: string;
  children: React.ReactNode;
}) {
  const padrao = { ok: '✓', info: 'ℹ', alerta: '⚠', erro: '✕' }[tipo];
  return (
    <div className={`aviso aviso-${tipo}`}>
      <span className="aviso-icone">{icone ?? padrao}</span>
      <div>{children}</div>
    </div>
  );
}
