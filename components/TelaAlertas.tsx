'use client';

import { useCallback, useEffect, useState } from 'react';
import { IconeAlerta, IconeOlho } from '@/components/icones';
import { formatarDiaCurto, formatarDiaExtenso } from '@/lib/datas';
import { ROTULO_PRIORIDADE, type Prioridade } from '@/lib/dominio';
import type { Notificar, SessaoUI } from '@/lib/tipos';

type Grupo = {
  usuarioId: string;
  nome: string;
  email: string;
  demandas: { id: string; titulo: string; prioridade: string; prazo: string; atrasada: boolean; diasVencido: number }[];
};

type Previa = {
  diaReferencia: string;
  modo: 'SMTP' | 'RESEND' | 'PREVIEW';
  smtp: { ok: boolean; detalhe: string };
  totalAutores: number;
  totalDemandas: number;
  grupos: Grupo[];
};

type Historico = {
  id: string; nome: string; email: string; dataReferencia: string;
  qtdDemandas: number; status: string; enviadoEm: string; temPrevia: boolean;
};

export function TelaAlertas({
  sessao,
  notificar,
  aoDisparar,
}: {
  sessao: SessaoUI;
  notificar: Notificar;
  aoDisparar: () => Promise<void> | void;
}) {
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [forcar, setForcar] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [rp, rh] = await Promise.all([fetch('/api/disparo'), fetch('/api/alertas?limite=25')]);
      if (rp.ok) setPrevia(await rp.json());
      if (rh.ok) setHistorico(await rh.json());
    } catch {
      notificar('Falha ao carregar os alertas.', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [notificar]);

  useEffect(() => { void carregar(); }, [carregar]);

  /**
   * Dispara o alerta. Sem `alvo`, envia para todos os analistas com pendência;
   * com `alvo`, envia só para aquela pessoa.
   */
  async function disparar(alvo?: { id: string; nome: string }) {
    if (!previa?.totalAutores) return;

    const acao = previa.modo !== 'PREVIEW' ? 'enviar o e-mail' : 'gerar a prévia';
    const destino = alvo ? `para ${alvo.nome}` : `para ${previa.totalAutores} analista(s)`;
    if (!confirm(`Confirmar ${acao} ${destino}?`)) return;

    setEnviando(alvo?.id ?? 'TODOS');
    try {
      const res = await fetch('/api/disparo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ forcar, apenasUsuarioId: alvo?.id }),
      });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.erro ?? 'Falha no disparo.');
      notificar(
        dados.erros > 0
          ? `Concluído com ${dados.erros} erro(s).`
          : dados.modo !== 'PREVIEW'
            ? `${dados.enviados} e-mail(s) enviado(s).`
            : `${dados.enviados} prévia(s) gerada(s) — nada foi enviado.`,
        dados.erros > 0 ? 'erro' : 'ok',
      );
      await Promise.all([carregar(), aoDisparar()]);
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro.', 'erro');
    } finally {
      setEnviando(null);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <h1 className="saudacao">Alertas</h1>
        <p className="saudacao-sub">
          {sessao.perfil === 'ADMIN'
            ? 'Quem será avisado sobre prazos vencidos, e o histórico de envios.'
            : 'O que você receberá por e-mail sobre seus prazos vencidos.'}
        </p>
      </div>

      <div className="pilha">
        {previa?.modo === 'PREVIEW' && (
          <div className="aviso aviso-alerta">
            <span className="aviso-icone"><IconeAlerta size={19} /></span>
            <div>
              <strong>Nenhum e-mail está sendo enviado.</strong> O Radar está em modo preview:
              monta a mensagem e guarda para conferência, mas não há servidor de e-mail
              configurado.
            </div>
          </div>
        )}

        <div className="cartao">
          <div className="cartao-cabecalho com-linha">
            <div>
              <div className="cartao-titulo">
                {sessao.perfil === 'ADMIN' ? 'Alertas a enviar' : 'Seus prazos vencidos'}
              </div>
              <div className="cartao-desc">
                {carregando
                  ? 'Carregando…'
                  : `${previa?.totalDemandas ?? 0} demanda(s) · apuração de ${
                      previa ? formatarDiaExtenso(previa.diaReferencia) : '—'
                    }`}
              </div>
            </div>
            {sessao.perfil === 'ADMIN' && (
              <div className="linha">
                <label className="linha texto-suave" style={{ gap: 7, cursor: 'pointer' }}>
                  <input type="checkbox" checked={forcar} onChange={(e) => setForcar(e.target.checked)} />
                  Reenviar mesmo se já enviado hoje
                </label>
                <button
                  className="btn btn-primario"
                  disabled={enviando !== null || carregando || !previa?.totalAutores}
                  onClick={() => disparar()}
                >
                  {enviando === 'TODOS' ? <><span className="girando">⏳</span> Processando…</>
                    : previa?.modo !== 'PREVIEW' ? 'Enviar para todos' : 'Gerar todas as prévias'}
                </button>
              </div>
            )}
          </div>

          <div className="cartao-corpo">
            {carregando ? (
              <div className="vazio"><span className="girando">⏳</span> Carregando…</div>
            ) : !previa?.grupos.length ? (
              <div className="vazio">
                <div className="vazio-icone">🎉</div>
                <div className="vazio-titulo">Nenhum prazo vencido</div>
                <p className="vazio-texto">
                  {sessao.perfil === 'ADMIN'
                    ? 'Ninguém do time tem demanda com prazo vencido. Nenhum alerta será enviado.'
                    : 'Você está em dia. Nenhum alerta será enviado para você.'}
                </p>
              </div>
            ) : (
              <div className="pilha" style={{ gap: 14 }}>
                {previa.grupos.map((g) => (
                  <div key={g.usuarioId} className="cartao" style={{ boxShadow: 'none' }}>
                    <div className="cartao-cabecalho com-linha">
                      <div>
                        <div className="cartao-titulo" style={{ fontSize: 14.5 }}>{g.nome}</div>
                        <div className="cartao-desc">{g.email}</div>
                      </div>
                      <div className="linha">
                        <span className="selo selo-neutro">
                          {g.demandas.length} {g.demandas.length === 1 ? 'demanda' : 'demandas'}
                        </span>
                        <a
                          className="btn btn-mini btn-secundario"
                          href={`/api/preview?usuarioId=${g.usuarioId}`}
                          target="_blank" rel="noreferrer"
                        >
                          <IconeOlho size={15} /> Ver e-mail
                        </a>
                        {sessao.perfil === 'ADMIN' && (
                          <button
                            className="btn btn-mini btn-primario"
                            disabled={enviando !== null}
                            onClick={() => disparar({ id: g.usuarioId, nome: g.nome })}
                            title={`Enviar o alerta apenas para ${g.nome}`}
                          >
                            {enviando === g.usuarioId
                              ? <><span className="girando">⏳</span> Enviando…</>
                              : 'Enviar só para este'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ padding: '4px 20px 16px' }}>
                      {g.demandas.map((d) => (
                        <div
                          key={d.id}
                          style={{
                            padding: '10px 0',
                            borderBottom: '1px solid var(--borda)',
                            display: 'flex', gap: 12, alignItems: 'baseline',
                          }}
                        >
                          <span className={`selo selo-${d.prioridade}`}>
                            {ROTULO_PRIORIDADE[d.prioridade as Prioridade] ?? d.prioridade}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="celula-titulo">{d.titulo}</div>
                            <div className="celula-sub">
                              Prazo {d.atrasada ? 'era' : 'é hoje,'} {formatarDiaCurto(d.prazo)}
                              {d.atrasada && (
                                <>
                                  {' · '}
                                  {d.diasVencido === 1 ? 'venceu ontem' : `vencida há ${d.diasVencido} dias`}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {historico.length > 0 && (
          <div className="cartao">
            <div className="cartao-cabecalho com-linha">
              <div>
                <div className="cartao-titulo">Histórico de envios</div>
                <div className="cartao-desc">Últimos {historico.length} alertas</div>
              </div>
            </div>
            <div className="tabela-envolvente">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Destinatário</th>
                    <th className="col-estreita">Demandas</th>
                    <th className="col-estreita">Situação</th>
                    <th className="col-estreita">Quando</th>
                    <th className="col-estreita" style={{ textAlign: 'right' }}>Prévia</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="celula-titulo">{a.nome}</div>
                        <div className="celula-sub">{a.email}</div>
                      </td>
                      <td className="col-estreita">{a.qtdDemandas}</td>
                      <td className="col-estreita">
                        <span className={`selo ${
                          a.status === 'ERRO' ? 'selo-ATRASADA'
                            : a.status === 'PREVIEW' ? 'selo-EM_ANDAMENTO'
                            : 'selo-CONCLUIDA'}`}>
                          {a.status === 'PREVIEW' ? 'NÃO ENVIADO' : a.status}
                        </span>
                      </td>
                      <td className="col-estreita texto-suave">
                        {new Date(a.enviadoEm).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="col-estreita" style={{ textAlign: 'right' }}>
                        {a.temPrevia ? (
                          <a
                            className="btn btn-mini btn-secundario"
                            href={`/api/preview?alertaId=${a.id}`}
                            target="_blank" rel="noreferrer"
                          >
                            Abrir
                          </a>
                        ) : <span className="texto-suave">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
