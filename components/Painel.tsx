'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FormDemanda } from '@/components/FormDemanda';
import { ListaDemandas } from '@/components/ListaDemandas';
import { AbaColaboradores } from '@/components/AbaColaboradores';
import { AbaAlertas } from '@/components/AbaAlertas';
import { Aviso } from '@/components/ui';
import { formatarDiaCurto, paraDiaISO, proximoDiaUtil } from '@/lib/datas';

export type Colaborador = {
  id: string;
  nome: string;
  email: string;
  equipe: string | null;
  ativo: boolean;
  _count?: { demandas: number };
};

export type Demanda = {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  status: string;
  origem: string;
  solicitante: string | null;
  dataPrevista: string;
  vezesAdiada: number;
  colaboradorId: string;
  colaborador: Colaborador;
};

type Toast = { id: number; texto: string; tipo: 'ok' | 'erro' | 'info' };

const ABAS = [
  { id: 'demandas', rotulo: 'Demandas' },
  { id: 'alertas', rotulo: 'Alertas' },
  { id: 'colaboradores', rotulo: 'Colaboradores' },
] as const;

type AbaId = (typeof ABAS)[number]['id'];

export function Painel() {
  const [aba, setAba] = useState<AbaId>('demandas');
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notificar = useCallback((texto: string, tipo: Toast['tipo'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, texto, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const carregar = useCallback(async () => {
    try {
      const [rc, rd] = await Promise.all([
        fetch('/api/colaboradores'),
        fetch('/api/demandas'),
      ]);
      if (!rc.ok || !rd.ok) throw new Error('Falha ao carregar os dados.');
      setColaboradores(await rc.json());
      setDemandas(await rd.json());
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro ao carregar.', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [notificar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const hoje = paraDiaISO();
  const proximoDia = proximoDiaUtil(hoje);

  const metricas = useMemo(() => {
    const pendentes = demandas.filter((d) => d.status === 'ABERTA' || d.status === 'EM_ANDAMENTO');
    // "Postergadas" = pendentes cuja data prevista é anterior ao próximo dia útil.
    const postergadas = pendentes.filter((d) => d.dataPrevista.slice(0, 10) < proximoDia);
    const criticas = postergadas.filter(
      (d) => d.prioridade === 'CRITICA' || d.prioridade === 'ALTA',
    );
    const pessoas = new Set(postergadas.map((d) => d.colaboradorId));
    const concluidasHoje = demandas.filter(
      (d) => d.status === 'CONCLUIDA' && d.dataPrevista.slice(0, 10) === hoje,
    );
    return {
      pendentes: pendentes.length,
      postergadas: postergadas.length,
      criticas: criticas.length,
      pessoas: pessoas.size,
      concluidasHoje: concluidasHoje.length,
    };
  }, [demandas, proximoDia, hoje]);

  const contadores: Record<AbaId, number> = {
    demandas: demandas.length,
    alertas: metricas.postergadas,
    colaboradores: colaboradores.length,
  };

  return (
    <div className="app">
      <header className="topo">
        <div className="container topo-linha">
          <div className="logo">
            <div className="logo-icone">📡</div>
            <div>
              <div className="logo-nome">Radar MSA</div>
              <div className="logo-sub">Alerta de demandas postergadas</div>
            </div>
          </div>
          <div className="linha">
            <span className="selo-modo">
              <span className="ponto" />
              Hoje · {formatarDiaCurto(hoje)}
            </span>
          </div>
        </div>
      </header>

      <main className="conteudo">
        <div className="container">
          <section className="metricas">
            <div className="metrica">
              <div className="metrica-rotulo">Pendentes</div>
              <div className="metrica-valor">{metricas.pendentes}</div>
              <div className="metrica-nota">abertas ou em andamento</div>
            </div>
            <div className={`metrica${metricas.postergadas > 0 ? ' destaque' : ' ok'}`}>
              <div className="metrica-rotulo">Postergadas</div>
              <div className="metrica-valor">{metricas.postergadas}</div>
              <div className="metrica-nota">viram demanda de {formatarDiaCurto(proximoDia)}</div>
            </div>
            <div className="metrica">
              <div className="metrica-rotulo">Alta / crítica</div>
              <div className="metrica-valor">{metricas.criticas}</div>
              <div className="metrica-nota">entre as postergadas</div>
            </div>
            <div className="metrica">
              <div className="metrica-rotulo">Colaboradores</div>
              <div className="metrica-valor">{metricas.pessoas}</div>
              <div className="metrica-nota">receberão alerta</div>
            </div>
          </section>

          <div className="abas" role="tablist">
            {ABAS.map((a) => (
              <button
                key={a.id}
                role="tab"
                aria-selected={aba === a.id}
                className="aba"
                onClick={() => setAba(a.id)}
              >
                {a.rotulo}
                <span className="aba-contador">{contadores[a.id]}</span>
              </button>
            ))}
          </div>

          {carregando ? (
            <div className="cartao">
              <div className="vazio">
                <span className="girando">⏳</span> Carregando…
              </div>
            </div>
          ) : aba === 'demandas' ? (
            <div className="grade-1-2">
              <FormDemanda
                colaboradores={colaboradores}
                aoSalvar={carregar}
                notificar={notificar}
              />
              <ListaDemandas
                demandas={demandas}
                proximoDia={proximoDia}
                aoAtualizar={carregar}
                notificar={notificar}
              />
            </div>
          ) : aba === 'alertas' ? (
            <AbaAlertas notificar={notificar} aoDisparar={carregar} />
          ) : (
            <AbaColaboradores
              colaboradores={colaboradores}
              aoAtualizar={carregar}
              notificar={notificar}
            />
          )}

          {!carregando && colaboradores.length === 0 && aba === 'demandas' && (
            <div style={{ marginTop: 20 }}>
              <Aviso tipo="alerta">
                Cadastre ao menos um colaborador na aba <strong>Colaboradores</strong> para
                começar a registrar demandas.
              </Aviso>
            </div>
          )}
        </div>
      </main>

      <div className="toast-area">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tipo}`}>
            {t.texto}
          </div>
        ))}
      </div>
    </div>
  );
}
