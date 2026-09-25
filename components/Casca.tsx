'use client';

import { useEffect, useState } from 'react';
import { LogoRadar, MarcaRadar } from '@/components/Logo';
import {
  IconeCalendario, IconeDuploEsquerda, IconeEquipe, IconeGrafico, IconeLampada,
  IconeLista, IconeMais, IconeMenu, IconePasta, IconeSair, IconeSino, IconeUsuario,
} from '@/components/icones';
import { Avatar } from '@/components/Avatar';
import { RodapeCreditos } from '@/components/RodapeCreditos';
import type { SessaoUI } from '@/lib/tipos';

export type Aba =
  | 'painel' | 'calendario' | 'demandas' | 'arquivos' | 'alertas' | 'equipe' | 'perfil';

/** Preferência de barra recolhida, para reabrir o app do mesmo jeito. */
const CHAVE_RECOLHIDA = 'radar_barra_recolhida';

const ITENS: {
  id: Aba; rotulo: string; Icone: typeof IconeCalendario;
  soAdmin?: boolean; soExperimental?: boolean;
}[] = [
  { id: 'painel', rotulo: 'Dashboard', Icone: IconeGrafico, soAdmin: true },
  { id: 'calendario', rotulo: 'Calendário', Icone: IconeCalendario },
  { id: 'demandas', rotulo: 'Minhas demandas', Icone: IconeLista },
  { id: 'arquivos', rotulo: 'Meus arquivos', Icone: IconePasta, soExperimental: true },
  { id: 'alertas', rotulo: 'Alertas', Icone: IconeSino, soAdmin: true },
  { id: 'equipe', rotulo: 'Equipe', Icone: IconeEquipe, soAdmin: true },
];

export function Casca({
  sessao,
  aba,
  aoTrocarAba,
  atrasadas,
  aoNovaDemanda,
  children,
}: {
  sessao: SessaoUI;
  aba: Aba;
  aoTrocarAba: (a: Aba) => void;
  atrasadas: number;
  aoNovaDemanda: () => void;
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

  const itens = ITENS.filter((i) => (
    (!i.soAdmin || sessao.perfil === 'ADMIN')
    && (!i.soExperimental || sessao.recursosExperimentais === true)
  ));
  const cargo = sessao.perfil === 'ADMIN' ? 'Administrador' : 'Analista da MSA';

  const personificando = sessao.personificadoPor ?? null;

  /*
   * Barra inferior do celular: o botão de nova demanda fica no meio, com as
   * abas divididas dos dois lados. Admin tem as mesmas abas da sidebar;
   * analista, as dele e o perfil.
   */
  const abasInferiores: { id: Aba; rotulo: string; Icone: typeof IconeCalendario }[] =
    sessao.perfil === 'ADMIN'
      ? [
          { id: 'painel', rotulo: 'Dashboard', Icone: IconeGrafico },
          { id: 'calendario', rotulo: 'Calendário', Icone: IconeCalendario },
          { id: 'demandas', rotulo: 'Demandas', Icone: IconeLista },
          { id: 'equipe', rotulo: 'Equipe', Icone: IconeEquipe },
        ]
      : [
          { id: 'calendario', rotulo: 'Calendário', Icone: IconeCalendario },
          { id: 'demandas', rotulo: 'Demandas', Icone: IconeLista },
          ...(sessao.recursosExperimentais
            ? [{ id: 'arquivos' as Aba, rotulo: 'Arquivos', Icone: IconePasta }]
            : []),
          { id: 'perfil', rotulo: 'Perfil', Icone: IconeUsuario },
        ];
  const meio = Math.ceil(abasInferiores.length / 2);

  const abaInferior = ({ id, rotulo, Icone }: (typeof abasInferiores)[number]) => (
    <button
      key={id}
      className="barra-inferior-item"
      aria-current={aba === id}
      onClick={() => aoTrocarAba(id)}
    >
      <Icone size={22} />
      <span>{rotulo}</span>
    </button>
  );

  async function encerrarAcesso() {
    await fetch('/api/auth/encerrar-acesso', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <div
      className={`casca${recolhida ? ' barra-recolhida' : ''}${
        personificando ? ' com-faixa-acesso' : ''
      }`}
    >
      {/* Faixa fixa no topo: enquanto ela estiver visível, tudo que for feito
          será registrado com o nome da pessoa personificada. */}
      {personificando && (
        <div className="faixa-acesso" role="status">
          <span className="faixa-acesso-texto">
            <strong>Você está na conta de {sessao.nome}.</strong> Acesso aberto por{' '}
            {personificando.nome}. Tudo que você fizer aqui será registrado como
            sendo desta pessoa.
          </span>
          <button className="faixa-acesso-sair" onClick={encerrarAcesso}>
            Encerrar acesso
          </button>
        </div>
      )}
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

        {/* <div className="dica">
          <div className="dica-icone"><IconeLampada size={17} /></div>
          <div className="dica-titulo">Mantenha suas demandas em dia</div>
          <div className="dica-texto">
            Organização hoje, menos preocupações amanhã.
          </div>
        </div> */}

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
        {/* Só no celular, onde a sidebar vira gaveta aberta pelo menu. */}
        <header className="topo-celular">
          <button
            className="topo-celular-botao"
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
          >
            <IconeMenu size={21} />
          </button>
          <MarcaRadar size={34} />
          <div className="topo-celular-acoes">
            {sessao.perfil === 'ADMIN' && (
              <button
                className="topo-celular-botao"
                onClick={() => aoTrocarAba('alertas')}
                aria-label={atrasadas > 0 ? `Alertas: ${atrasadas} atrasadas` : 'Alertas'}
              >
                <IconeSino size={20} />
                {atrasadas > 0 && <span className="topo-celular-ponto" />}
              </button>
            )}
            <button
              className="topo-celular-avatar"
              onClick={() => aoTrocarAba('perfil')}
              aria-label="Minha conta"
            >
              <Avatar nome={sessao.nome} avatar={sessao.avatar} />
            </button>
          </div>
        </header>

        <main className="conteudo">
          <div className="conteudo-largo">{children}</div>
        </main>

        <RodapeCreditos />
      </div>

      <nav className="barra-inferior" aria-label="Navegação principal">
        {abasInferiores.slice(0, meio).map(abaInferior)}
        <button className="barra-inferior-nova" onClick={aoNovaDemanda} aria-label="Nova demanda">
          <IconeMais size={26} />
        </button>
        {abasInferiores.slice(meio).map(abaInferior)}
      </nav>
    </div>
  );
}
