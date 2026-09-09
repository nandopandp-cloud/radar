'use client';

import { useState } from 'react';
import { MarcaRadar } from '@/components/Logo';
import {
  IconeCalendario, IconeEquipe, IconeLampada, IconeLista,
  IconeMenu, IconeSair, IconeSino,
} from '@/components/icones';
import { Avatar } from '@/components/Avatar';
import type { SessaoUI } from '@/lib/tipos';

export type Aba = 'calendario' | 'demandas' | 'alertas' | 'equipe' | 'perfil';

const ITENS: { id: Aba; rotulo: string; Icone: typeof IconeCalendario; soAdmin?: boolean }[] = [
  { id: 'calendario', rotulo: 'Calendário', Icone: IconeCalendario },
  { id: 'demandas', rotulo: 'Minhas demandas', Icone: IconeLista },
  { id: 'alertas', rotulo: 'Alertas', Icone: IconeSino, soAdmin: true },
  { id: 'equipe', rotulo: 'Equipe', Icone: IconeEquipe, soAdmin: true },
];

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
          <button
            className="perfil-linha"
            aria-current={aba === 'perfil'}
            onClick={() => { aoTrocarAba('perfil'); setMenuAberto(false); }}
            title="Minha conta"
          >
            <Avatar nome={sessao.nome} avatar={sessao.avatar} />
            <div style={{ minWidth: 0, textAlign: 'left' }}>
              <div className="perfil-nome">{sessao.nome}</div>
              <div className="perfil-cargo">
                {sessao.perfil === 'ADMIN' ? 'Administrador' : 'Analista da MSA'}
              </div>
            </div>
          </button>
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
            <button
              className="perfil-botao"
              onClick={() => aoTrocarAba('perfil')}
              title="Minha conta"
            >
              <Avatar nome={sessao.nome} avatar={sessao.avatar} tamanho="sm" />
              <div style={{ lineHeight: 1.3, textAlign: 'left' }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{sessao.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--tinta-suave)' }}>
                  {sessao.perfil === 'ADMIN' ? 'Administrador' : 'Analista da MSA'}
                </div>
              </div>
            </button>
          </div>
        </header>

        <main className="conteudo">
          <div className="conteudo-largo">{children}</div>
        </main>
      </div>
    </div>
  );
}
