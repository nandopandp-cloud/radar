'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Casca, type Aba } from '@/components/Casca';
import { TelaPainel } from '@/components/TelaPainel';
import { TelaCalendario } from '@/components/TelaCalendario';
import { TelaDemandas } from '@/components/TelaDemandas';
import { TelaAlertas } from '@/components/TelaAlertas';
import { TelaEquipe } from '@/components/TelaEquipe';
import { TelaPerfil } from '@/components/TelaPerfil';
import { GavetaDemanda } from '@/components/GavetaDemanda';
import { ModalNovaDemanda } from '@/components/ModalNovaDemanda';
import { ModalDia } from '@/components/ModalDia';
import { GavetaOfensiva, ModalOfensiva } from '@/components/OfensivaRadar';
import { metaAtual, type Ofensiva } from '@/lib/ofensiva';
import { paraDiaISO } from '@/lib/datas';
import { situacaoDe } from '@/lib/dominio';
import type { Demanda, SessaoUI, Toast, Usuario } from '@/lib/tipos';

export function App({ sessao }: { sessao: SessaoUI }) {
  const searchParams = useSearchParams();
  const hoje = paraDiaISO();
  const inicio = new Date(`${hoje}T00:00:00Z`);

  // Admin entra pelo painel, que é sua primeira aba; analista, pelo calendário.
  const [aba, setAba] = useState<Aba>(sessao.perfil === 'ADMIN' ? 'painel' : 'calendario');
  const [ano, setAno] = useState(inicio.getUTCFullYear());
  const [mes, setMes] = useState(inicio.getUTCMonth());
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);

  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [equipe, setEquipe] = useState<Usuario[]>([]);
  const [autorFiltro, setAutorFiltro] = useState('TODOS');
  const [carregando, setCarregando] = useState(true);

  const [detalhe, setDetalhe] = useState<Demanda | null>(null);
  const [novaEm, setNovaEm] = useState<string | null>(null);
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ofensiva, setOfensiva] = useState<Ofensiva | null>(null);
  const [ofensivaAberta, setOfensivaAberta] = useState(false);
  /** Comemoração quando o dia acabou de entrar na contagem. */
  const [brinde, setBrinde] = useState<number | null>(null);
  const [seloPulsando, setSeloPulsando] = useState(false);

  const notificar = useCallback((texto: string, tipo: Toast['tipo'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, texto, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      const params = new URLSearchParams();
      if (sessao.perfil === 'ADMIN' && autorFiltro !== 'TODOS') params.set('autorId', autorFiltro);

      // A lista da equipe é restrita a administradores — nem pedimos como analista.
      const ehAdmin = sessao.perfil === 'ADMIN';
      const [rd, re, ro] = await Promise.all([
        fetch(`/api/demandas?${params}`),
        ehAdmin ? fetch('/api/usuarios') : Promise.resolve(null),
        fetch('/api/ofensiva'),
      ]);
      if (!rd.ok) throw new Error('Falha ao carregar as demandas.');
      const lista: Demanda[] = await rd.json();
      setDemandas(lista);
      if (re?.ok) setEquipe(await re.json());
      if (ro.ok) {
        const nova: Ofensiva = await ro.json();
        /*
         * O dia virou "contado" agora: comemora. Compara com o estado anterior
         * em vez de olhar só `hojeConta`, senão a festa repetiria a cada
         * recarga do dia inteiro.
         */
        setOfensiva((antes) => {
          if (antes && !antes.hojeConta && nova.hojeConta) {
            setBrinde(nova.atual);
            setSeloPulsando(true);
            setTimeout(() => setSeloPulsando(false), 1400);
          }
          return nova;
        });
      }

      // Mantém a gaveta em sincronia após uma edição.
      setDetalhe((atual) => (atual ? lista.find((d) => d.id === atual.id) ?? null : null));
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro ao carregar.', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [notificar, autorFiltro, sessao.perfil]);

  useEffect(() => { void carregar(); }, [carregar]);

  // Link do e-mail: ?demanda=<id> abre a demanda direto, sem precisar navegar.
  const linkDemanda = searchParams.get('demanda');
  const [linkAberto, setLinkAberto] = useState(false);
  useEffect(() => {
    if (!linkDemanda || linkAberto || demandas.length === 0) return;
    const alvo = demandas.find((d) => d.id === linkDemanda);
    if (alvo) {
      setAba('demandas');
      setDetalhe(alvo);
    }
    setLinkAberto(true);
  }, [linkDemanda, linkAberto, demandas]);

  const atrasadas = useMemo(
    () =>
      demandas.filter((d) => situacaoDe(d.status, d.prazo.slice(0, 10), hoje) === 'ATRASADA').length,
    [demandas, hoje],
  );

  function abrirNova(prazo: string) {
    setNovaEm(prazo);
  }

  /**
   * Move uma demanda de coluna no quadro. A tela muda na hora e só depois
   * confirmamos no servidor — se falhar, voltamos ao estado anterior.
   */
  const moverDemanda = useCallback(
    async (demanda: Demanda, status: string) => {
      if (demanda.status === status) return;
      const anterior = demandas;
      setDemandas((lista) =>
        lista.map((d) => (d.id === demanda.id ? { ...d, status } : d)),
      );
      try {
        const r = await fetch(`/api/demandas/${demanda.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!r.ok) {
          const corpo = await r.json().catch(() => null);
          throw new Error(corpo?.erro ?? 'Não foi possível mover a demanda.');
        }
        await carregar();
        notificar(`"${demanda.titulo}" foi movida.`, 'ok');
      } catch (e) {
        setDemandas(anterior);
        notificar(e instanceof Error ? e.message : 'Não foi possível mover a demanda.', 'erro');
      }
    },
    [demandas, carregar, notificar],
  );

  return (
    <Casca sessao={sessao} aba={aba} aoTrocarAba={setAba} atrasadas={atrasadas}>
      {carregando ? (
        <div className="cartao">
          <div className="vazio"><span className="girando">⏳</span> Carregando…</div>
        </div>
      ) : aba === 'painel' && sessao.perfil === 'ADMIN' ? (
        <TelaPainel
          sessao={sessao}
          demandas={demandas}
          equipe={equipe}
          hoje={hoje}
          aoAbrirDemanda={setDetalhe}
          aoVerDemandas={() => setAba('demandas')}
        />
      ) : aba === 'calendario' ? (
        <TelaCalendario
          sessao={sessao}
          demandas={demandas}
          hoje={hoje}
          ano={ano}
          mes={mes}
          diaSelecionado={diaSelecionado}
          aoMudarMes={(a, m) => { setAno(a); setMes(m); }}
          aoSelecionarDia={(dia) => { setDiaSelecionado(dia); setDiaAberto(dia); }}
          aoAbrirDemanda={setDetalhe}
          aoNovaDemanda={abrirNova}
          ofensiva={ofensiva}
          aoAbrirOfensiva={() => setOfensivaAberta(true)}
          ofensivaPulsando={seloPulsando}
        />
      ) : aba === 'demandas' ? (
        <TelaDemandas
          sessao={sessao}
          demandas={demandas}
          equipe={equipe}
          hoje={hoje}
          autorFiltro={autorFiltro}
          aoMudarAutor={setAutorFiltro}
          aoAbrirDemanda={setDetalhe}
          aoNovaDemanda={abrirNova}
          aoMoverDemanda={moverDemanda}
        />
      ) : aba === 'alertas' && sessao.perfil === 'ADMIN' ? (
        <TelaAlertas sessao={sessao} notificar={notificar} aoDisparar={carregar} />
      ) : aba === 'perfil' ? (
        <TelaPerfil sessao={sessao} aoAtualizar={carregar} notificar={notificar} />
      ) : aba === 'equipe' && sessao.perfil === 'ADMIN' ? (
        <TelaEquipe sessao={sessao} equipe={equipe} aoAtualizar={carregar} notificar={notificar} />
      ) : (
        /*
         * Aba restrita alcançada por um analista (estado antigo, link direto).
         * Cai no calendário em vez de mostrar tela alheia — antes o fallback
         * era a própria TelaEquipe, que vazaria a lista do time.
         */
        <TelaCalendario
          sessao={sessao}
          demandas={demandas}
          hoje={hoje}
          ano={ano}
          mes={mes}
          diaSelecionado={diaSelecionado}
          aoMudarMes={(a, m) => { setAno(a); setMes(m); }}
          aoSelecionarDia={(dia) => { setDiaSelecionado(dia); setDiaAberto(dia); }}
          aoAbrirDemanda={setDetalhe}
          aoNovaDemanda={abrirNova}
          ofensiva={ofensiva}
          aoAbrirOfensiva={() => setOfensivaAberta(true)}
          ofensivaPulsando={seloPulsando}
        />
      )}

      {diaAberto && (
        <ModalDia
          dia={diaAberto}
          demandas={demandas}
          hoje={hoje}
          sessao={sessao}
          aoFechar={() => setDiaAberto(null)}
          aoAbrirDemanda={setDetalhe}
          aoNovaDemanda={abrirNova}
        />
      )}

      {detalhe && (
        <GavetaDemanda
          demanda={detalhe}
          hoje={hoje}
          sessao={sessao}
          podeEditar={sessao.perfil === 'ADMIN' || detalhe.autorId === sessao.id}
          aoFechar={() => setDetalhe(null)}
          aoAtualizar={carregar}
          notificar={notificar}
        />
      )}

      {novaEm && (
        <ModalNovaDemanda
          prazoInicial={novaEm}
          sessao={sessao}
          equipe={equipe}
          aoFechar={() => setNovaEm(null)}
          aoCriar={carregar}
          notificar={notificar}
        />
      )}

      {ofensivaAberta && ofensiva && (
        <GavetaOfensiva ofensiva={ofensiva} aoFechar={() => setOfensivaAberta(false)} />
      )}

      {brinde !== null && (
        <ModalOfensiva
          dias={brinde}
          meta={metaAtual(brinde)}
          aoFechar={() => setBrinde(null)}
        />
      )}

      <div className="toast-area">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tipo}`}>{t.texto}</div>
        ))}
      </div>
    </Casca>
  );
}
