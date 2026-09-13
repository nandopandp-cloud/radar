'use client';

import { useEffect, useState } from 'react';
import { LogoRadar, MarcaRadar } from '@/components/Logo';
import {
  IconeCalendario, IconeDuploEsquerda, IconeEquipe, IconeGrafico, IconeLampada,
  IconeLista, IconeMenu, IconeSair, IconeSino,
} from '@/components/icones';
import { Avatar } from '@/components/Avatar';
import type { SessaoUI } from '@/lib/tipos';

export type Aba = 'painel' | 'calendario' | 'demandas' | 'alertas' | 'equipe' | 'perfil';

/** Preferência de barra recolhida, para reabrir o app do mesmo jeito. */
const CHAVE_RECOLHIDA = 'radar_barra_recolhida';

const ITENS: { id: Aba; rotulo: string; Icone: typeof IconeCalendario; soAdmin?: boolean }[] = [
  { id: 'painel', rotulo: 'Dashboard', Icone: IconeGrafico, soAdmin: true },
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
  const [recolhida, setRecolhida] = useState(false);

  /*
   * A preferência só é lida depois da montagem: no servidor não há
   * localStorage, e ler durante o render faria o HTML divergir do cliente.
   */
  useEffect(() => {
    try {
      setRecolhida(localStorage.getItem(CHAVE_RECOLHIDA) === '1');
    } catch {
      // Navegador sem storage (aba privada, cookies bloqueados): segue expandida.
    }
  }, []);

  function alternarRecolhida() {
    setRecolhida((atual) => {
      const proxima = !atual;
      try {
        localStorage.setItem(CHAVE_RECOLHIDA, proxima ? '1' : '0');
      } catch {
        // Sem storage a escolha vale só para esta sessão.
      }
      return proxima;
    });
  }

  const itens = ITENS.filter((i) => !i.soAdmin || sessao.perfil === 'ADMIN');
  const cargo = sessao.perfil === 'ADMIN' ? 'Administrador' : 'Analista da MSA';

  return (
    <div className={`casca${recolhida ? ' barra-recolhida' : ''}`}>
      <aside className={`barra-lateral${menuAberto ? ' aberta' : ''}`}>
        <div className="barra-topo">
          {recolhida ? <LogoRadar size={34} /> : <MarcaRadar />}
          <button
            className="btn-recolher"
            onClick={alternarRecolhida}
            aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!recolhida}
            title={recolhida ? 'Expandir menu' : 'Recolher menu'}
          >
            <IconeDuploEsquerda size={17} />
          </button>
        </div>

        <nav className="navegacao">
          {itens.map(({ id, rotulo, Icone }) => {
            const nome = id === 'demandas' && sessao.perfil === 'ADMIN' ? 'Demandas' : rotulo;
            return (
              <button
                key={id}
                className="nav-item"
                aria-current={aba === id}
                onClick={() => { aoTrocarAba(id); setMenuAberto(false); }}
                /* Recolhida, o rótulo some da tela: o title vira a única pista. */
                title={recolhida ? nome : undefined}
              >
                <span className="nav-icone-caixa"><Icone className="nav-icone" /></span>
                <span className="nav-rotulo">{nome}</span>
                {id === 'alertas' && atrasadas > 0 && (
                  <span className="nav-badge">{atrasadas}</span>
                )}
              </button>
            );
          })}
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
            title={recolhida ? sessao.nome : 'Minha conta'}
          >
            <Avatar nome={sessao.nome} avatar={sessao.avatar} />
            <div className="perfil-texto">
              <div className="perfil-nome">{sessao.nome}</div>
              <div className="perfil-cargo">{cargo}</div>
            </div>
          </button>
          <button
            className="btn-sair-barra"
            title={recolhida ? 'Sair' : undefined}
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
          >
            <span className="nav-icone-caixa"><IconeSair className="nav-icone" /></span>
            <span className="nav-rotulo">Sair</span>
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
                <div style={{ fontSize: 12, color: 'var(--tinta-suave)' }}>{cargo}</div>
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
