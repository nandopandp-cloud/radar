'use client';

import { useState } from 'react';
import { MarcaRadar } from '@/components/Logo';
import {
  IconeCalendario, IconeEquipe, IconeLampada, IconeLista,
  IconeMenu, IconeSair, IconeSino,
} from '@/components/icones';
import type { SessaoUI } from '@/lib/tipos';

export type Aba = 'calendario' | 'demandas' | 'alertas' | 'equipe';

const ITENS: { id: Aba; rotulo: string; Icone: typeof IconeCalendario; soAdmin?: boolean }[] = [
  { id: 'calendario', rotulo: 'Calendário', Icone: IconeCalendario },
  { id: 'demandas', rotulo: 'Minhas demandas', Icone: IconeLista },
  { id: 'alertas', rotulo: 'Alertas', Icone: IconeSino },
  { id: 'equipe', rotulo: 'Equipe', Icone: IconeEquipe },
];

function iniciais(nome: string) {
  return nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function Casca({
  sessao,
  aba,
  aoTrocarAba,
  atrasadas,
  children,
}: {
  sessao: SessaoUI;
  aba: Aba;
  aoTrocarAba: (a: Aba) => void;
  atrasadas: number;
  children: React.ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);

  const itens = ITENS.filter((i) => !i.soAdmin || sessao.perfil === 'ADMIN');

  return (
    <div className="casca">
      <aside className={`barra-lateral${menuAberto ? ' aberta' : ''}`}>
        <div className="barra-topo">
          <MarcaRadar />
        </div>

        <nav className="navegacao">
          {itens.map(({ id, rotulo, Icone }) => (
            <button
              key={id}
              className="nav-item"
              aria-current={aba === id}
              onClick={() => { aoTrocarAba(id); setMenuAberto(false); }}
            >
              <Icone className="nav-icone" />
              {id === 'demandas' && sessao.perfil === 'ADMIN' ? 'Demandas' : rotulo}
              {id === 'alertas' && atrasadas > 0 && <span className="nav-badge">{atrasadas}</span>}
            </button>
          ))}
        </nav>

        <div className="dica">
          <div className="dica-icone"><IconeLampada size={17} /></div>
          <div className="dica-titulo">Mantenha suas demandas em dia</div>
          <div className="dica-texto">
            Organização hoje, menos preocupações amanhã.
          </div>
        </div>

        <div className="barra-rodape">
          <div className="perfil-linha">
            <div className="avatar">{iniciais(sessao.nome)}</div>
            <div style={{ minWidth: 0 }}>
              <div className="perfil-nome">{sessao.nome}</div>
              <div className="perfil-cargo">
                {sessao.perfil === 'ADMIN' ? 'Administrador' : 'Analista da MSA'}
              </div>
            </div>
          </div>
          <button
            className="btn-sair-barra"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
          >
            <IconeSair className="nav-icone" /> Sair
          </button>
        </div>
      </aside>

      {menuAberto && (
        <div className="veu" style={{ zIndex: 39 }} onClick={() => setMenuAberto(false)} />
      )}

      <div className="principal">
        <header className="cabecalho">
          <button
            className="btn-icone abre-menu"
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
          >
            <IconeMenu size={21} />
          </button>
          <div className="cabecalho-acoes">
            <div className="linha" style={{ gap: 10 }}>
              <div className="avatar avatar-sm">{iniciais(sessao.nome)}</div>
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{sessao.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--tinta-suave)' }}>
                  {sessao.perfil === 'ADMIN' ? 'Administrador' : 'Analista da MSA'}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="conteudo">
          <div className="conteudo-largo">{children}</div>
        </main>
      </div>
    </div>
  );
}
