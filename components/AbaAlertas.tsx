'use client';

import { useCallback, useEffect, useState } from 'react';
import { Avatar, Aviso, SeloPrioridade, Vazio } from '@/components/ui';
import { formatarDiaCurto, formatarDiaExtenso, paraDiaISO, proximoDiaUtil } from '@/lib/datas';

type Grupo = {
  colaboradorId: string;
  nome: string;
  email: string;
  equipe: string | null;
  demandas: {
    id: string;
    titulo: string;
    descricao: string | null;
    prioridade: string;
    diaOriginal: string;
    diasAtraso: number;
    vezesAdiada: number;
  }[];
};

type Previa = {
  diaReferencia: string;
  modo: 'SMTP' | 'PREVIEW';
  smtp: { ok: boolean; detalhe: string };
  totalColaboradores: number;
  totalDemandas: number;
  grupos: Grupo[];
};

type Resultado = {
  diaReferencia: string;
  modo: string;
  enviados: number;
  erros: number;
  ignorados: number;
  postergadas: number;
  itens: {
    colaborador: string;
    email: string;
    qtdDemandas: number;
    status: string;
    detalhe?: string;
    temPrevia?: boolean;
  }[];
};

type AlertaHistorico = {
  id: string;
  nome: string;
  email: string;
  dataReferencia: string;
  qtdDemandas: number;
  status: string;
  assunto: string | null;
  enviadoEm: string;
  temPrevia: boolean;
};

export function AbaAlertas({
  notificar,
  aoDisparar,
}: {
  notificar: (texto: string, tipo?: 'ok' | 'erro' | 'info') => void;
  aoDisparar: () => Promise<void> | void;
}) {
  const [dia, setDia] = useState(() => proximoDiaUtil(paraDiaISO()));
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [postergar, setPostergar] = useState(true);
  const [forcar, setForcar] = useState(false);
  const [historico, setHistorico] = useState<AlertaHistorico[]>([]);

  const carregarPrevia = useCallback(async () => {
    setCarregando(true);
    try {
      const [rp, rh] = await Promise.all([
        fetch(`/api/disparo?dia=${dia}`),
        fetch('/api/alertas?limite=25'),
      ]);
      if (!rp.ok) throw new Error('Falha ao carregar a prévia.');
      setPrevia(await rp.json());
      if (rh.ok) setHistorico(await rh.json());
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro.', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [dia, notificar]);

  useEffect(() => {
    void carregarPrevia();
  }, [carregarPrevia]);

  async function disparar() {
    if (!previa || previa.totalColaboradores === 0) return;
    const modo = previa.modo === 'SMTP' ? 'enviar e-mails reais' : 'gerar as prévias';
    if (!confirm(`Confirmar ${modo} para ${previa.totalColaboradores} colaborador(es)?`)) return;

    setEnviando(true);
    setResultado(null);
    try {
      const res = await fetch('/api/disparo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dia, postergar, forcar }),
      });
      const dados: Resultado = await res.json();
      if (!res.ok) throw new Error((dados as unknown as { erro?: string }).erro ?? 'Falha no disparo.');
      setResultado(dados);
      notificar(
        dados.erros > 0
          ? `Concluído com ${dados.erros} erro(s).`
          : `${dados.enviados} alerta(s) processado(s).`,
        dados.erros > 0 ? 'erro' : 'ok',
      );
      await Promise.all([carregarPrevia(), aoDisparar()]);
    } catch (e) {
      notificar(e instanceof Error ? e.message : 'Erro.', 'erro');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pilha">
      <div className="cartao">
        <div className="cartao-cabecalho">
          <div>
            <div className="cartao-titulo">Disparo de alertas</div>
            <div className="cartao-desc">
              Envia a cada colaborador as demandas que passaram para o dia de referência
            </div>
          </div>
          <span className={`selo ${previa?.modo === 'SMTP' ? 'selo-CONCLUIDA' : 'selo-MEDIA'}`}>
            {previa?.modo === 'SMTP' ? '✉ Envio real (SMTP)' : '👁 Modo preview'}
          </span>
        </div>

        <div className="cartao-corpo pilha">
          {previa?.modo === 'PREVIEW' ? (
            <Aviso tipo="info" icone="👁">
              <strong>Modo preview ativo.</strong> Nenhum e-mail sai de verdade — cada mensagem
              gerada fica guardada e pode ser aberta no histórico de disparos, abaixo. Configure
              as variáveis <span className="mono">SMTP_*</span> para enviar de verdade.
            </Aviso>
          ) : previa && !previa.smtp.ok ? (
            <Aviso tipo="erro">
              <strong>Falha na conexão SMTP:</strong> {previa.smtp.detalhe}
            </Aviso>
          ) : previa ? (
            <Aviso tipo="ok">
              <strong>SMTP conectado.</strong> {previa.smtp.detalhe} Os e-mails serão enviados de
              verdade.
            </Aviso>
          ) : null}

          <div className="espalhar">
            <div className="linha">
              <div>
                <label className="rotulo" htmlFor="dia-ref">Dia de referência</label>
                <input
                  id="dia-ref"
                  type="date"
                  className="entrada"
                  style={{ width: 176 }}
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                />
              </div>
              <div style={{ paddingTop: 20 }}>
                <div className="texto-suave">{formatarDiaExtenso(dia)}</div>
              </div>
            </div>

            <div className="linha" style={{ paddingTop: 16 }}>
              <label className="linha texto-suave" style={{ gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={postergar}
                  onChange={(e) => setPostergar(e.target.checked)}
                />
                Mover demandas para o dia de referência
              </label>
              <label className="linha texto-suave" style={{ gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={forcar}
                  onChange={(e) => setForcar(e.target.checked)}
                />
                Reenviar mesmo se já enviado hoje
              </label>
              <button
                className="btn btn-primario"
                disabled={enviando || carregando || !previa?.totalColaboradores}
                onClick={disparar}
              >
                {enviando ? (
                  <><span className="girando">⏳</span> Processando…</>
                ) : previa?.modo === 'SMTP' ? (
                  '✉ Enviar alertas agora'
                ) : (
                  '👁 Gerar prévias agora'
                )}
              </button>
            </div>
          </div>

          {resultado && (
            <div className="cartao" style={{ boxShadow: 'none' }}>
              <div className="cartao-cabecalho">
                <div className="cartao-titulo">
                  Resultado · {resultado.enviados} processado(s)
                  {resultado.erros > 0 && ` · ${resultado.erros} erro(s)`}
                  {resultado.ignorados > 0 && ` · ${resultado.ignorados} ignorado(s)`}
                </div>
                {resultado.postergadas > 0 && (
                  <span className="selo selo-neutro">
                    {resultado.postergadas} demanda(s) movidas para {formatarDiaCurto(resultado.diaReferencia)}
                  </span>
                )}
              </div>
              <div className="tabela-envolvente">
                <table className="tabela">
                  <thead>
                    <tr><th>Colaborador</th><th>Demandas</th><th>Situação</th><th>Detalhe</th></tr>
                  </thead>
                  <tbody>
                    {resultado.itens.map((i) => (
                      <tr key={i.email}>
                        <td>
                          <div className="celula-titulo">{i.colaborador}</div>
                          <div className="celula-sub">{i.email}</div>
                        </td>
                        <td>{i.qtdDemandas}</td>
                        <td>
                          <span
                            className={`selo ${
                              i.status === 'ERRO'
                                ? 'selo-CRITICA'
                                : i.status === 'IGNORADO'
                                  ? 'selo-neutro'
                                  : 'selo-CONCLUIDA'
                            }`}
                          >
                            {i.status}
                          </span>
                        </td>
                        <td className="texto-suave" style={{ maxWidth: 320, wordBreak: 'break-word' }}>
                          {i.detalhe ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="cartao">
        <div className="cartao-cabecalho">
          <div>
            <div className="cartao-titulo">Prévia dos envios</div>
            <div className="cartao-desc">
              {carregando
                ? 'Carregando…'
                : `${previa?.totalDemandas ?? 0} demanda(s) para ${previa?.totalColaboradores ?? 0} colaborador(es)`}
            </div>
          </div>
          <button className="btn btn-mini btn-secundario" onClick={carregarPrevia} disabled={carregando}>
            ↻ Atualizar
          </button>
        </div>

        <div className="cartao-corpo">
          {carregando ? (
            <div className="vazio"><span className="girando">⏳</span> Carregando…</div>
          ) : !previa?.grupos.length ? (
            <Vazio
              icone="🎉"
              titulo="Nenhum alerta a enviar"
              texto={`Não há demandas pendentes de dias anteriores a ${formatarDiaCurto(dia)}. Ninguém receberá e-mail.`}
            />
          ) : (
            previa.grupos.map((g) => (
              <div className="grupo" key={g.colaboradorId}>
                <div className="grupo-cabecalho">
                  <div className="grupo-pessoa">
                    <Avatar nome={g.nome} />
                    <div>
                      <div className="grupo-nome">{g.nome}</div>
                      <div className="grupo-email">
                        {g.email}{g.equipe ? ` · ${g.equipe}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="linha">
                    <span className="selo selo-neutro">
                      {g.demandas.length} {g.demandas.length === 1 ? 'demanda' : 'demandas'}
                    </span>
                    <a
                      className="btn btn-mini btn-secundario"
                      href={`/api/preview?dia=${dia}&colaboradorId=${g.colaboradorId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      👁 Ver e-mail
                    </a>
                  </div>
                </div>
                <div className="grupo-itens">
                  {g.demandas.map((d) => (
                    <div className="grupo-item" key={d.id}>
                      <SeloPrioridade valor={d.prioridade} />
                      <div className="grupo-item-corpo">
                        <div className="celula-titulo">{d.titulo}</div>
                        <div className="celula-sub">
                          Prevista em {formatarDiaCurto(d.diaOriginal)}
                          {d.diasAtraso > 0 && ` · ${d.diasAtraso} dia(s) de atraso`}
                          {d.vezesAdiada > 0 && ` · adiada ${d.vezesAdiada}×`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {historico.length > 0 && (
        <div className="cartao">
          <div className="cartao-cabecalho">
            <div>
              <div className="cartao-titulo">Histórico de disparos</div>
              <div className="cartao-desc">
                Últimos {historico.length} alertas · abra a prévia para ver a mensagem gerada
              </div>
            </div>
          </div>
          <div className="tabela-envolvente">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th className="col-estreita">Referência</th>
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
                    <td className="col-estreita">
                      {formatarDiaCurto(a.dataReferencia.slice(0, 10))}
                    </td>
                    <td className="col-estreita">{a.qtdDemandas}</td>
                    <td className="col-estreita">
                      <span
                        className={`selo ${
                          a.status === 'ERRO'
                            ? 'selo-CRITICA'
                            : a.status === 'PREVIEW'
                              ? 'selo-MEDIA'
                              : 'selo-CONCLUIDA'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="col-estreita texto-suave">
                      {new Date(a.enviadoEm).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="col-estreita" style={{ textAlign: 'right' }}>
                      {a.temPrevia ? (
                        <a
                          className="btn btn-mini btn-secundario"
                          href={`/api/preview?alertaId=${a.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          👁 Abrir
                        </a>
                      ) : (
                        <span className="texto-suave">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
