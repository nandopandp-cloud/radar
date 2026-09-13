'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  IconeAjustes, IconeCalendario, IconeCalendarioRepetir, IconeClipe,
  IconeDocumento, IconeInfo, IconeMais, IconeRepetir, IconeX,
} from '@/components/icones';
import { AnexosPendentes } from '@/components/AnexosDemanda';
import { Avatar } from '@/components/Avatar';
import { dividirEmLotes } from '@/lib/anexos';
import { CATEGORIAS, COR_SITUACAO, PRIORIDADES, ROTULO_PRIORIDADE } from '@/lib/dominio';
import {
  DESCRICAO_FREQUENCIA, FREQUENCIAS, NOMES_SEMANA, ROTULO_FREQUENCIA,
  proximasDatas, type Frequencia, type Regra,
} from '@/lib/recorrencia';
import { diaParaDate } from '@/lib/datas';
import type { AnexoPendente, Notificar, SessaoUI, Usuario } from '@/lib/tipos';

const ICONE_FREQUENCIA: Record<Frequencia, typeof IconeCalendario> = {
  DIARIA: IconeCalendario,
  SEMANAL: IconeCalendarioRepetir,
  MENSAL: IconeCalendarioRepetir,
  PERSONALIZADA: IconeAjustes,
};

/** Cores dos pontinhos do seletor de prioridade. */
const COR_PRIORIDADE_PONTO: Record<string, string> = {
  BAIXA: '#94a3b8', MEDIA: '#3b82f6', ALTA: '#f59e0b', CRITICA: '#ef4444',
};

/** "10 de setembro de 2026" e o dia da semana, para a prévia. */
function dataPorExtenso(dia: string): { data: string; semana: string } {
  const d = diaParaDate(dia);
  const data = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(d);
  const semana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' }).format(d);
  return { data, semana: semana.charAt(0).toUpperCase() + semana.slice(1) };
}

export function ModalNovaDemanda({
  prazoInicial,
  sessao,
  equipe,
  aoFechar,
  aoCriar,
  notificar,
}: {
  prazoInicial: string;
  sessao: SessaoUI;
  equipe: Usuario[];
  aoFechar: () => void;
  aoCriar: () => Promise<void> | void;
  notificar: Notificar;
}) {
  const [aba, setAba] = useState<'unica' | 'recorrente'>('unica');
  const [salvando, setSalvando] = useState(false);
  const [anexos, setAnexos] = useState<AnexoPendente[]>([]);

  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    inicio: prazoInicial,
    prazo: prazoInicial,
    prioridade: 'MEDIA',
    categoria: '',
    autorId: sessao.id,
  });

  const [regra, setRegra] = useState<Regra>({
    frequencia: 'MENSAL',
    intervalo: 1,
    diasSemana: [diaParaDate(prazoInicial).getUTCDay()],
    diaDoMes: diaParaDate(prazoInicial).getUTCDate(),
    apenasDiasUteis: false,
    inicio: prazoInicial,
    fim: null,
    maximo: null,
  });

  /** "Sem data de término" x "Escolher data" — o select do campo Fim. */
  const [temFim, setTemFim] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aoFechar]);

  /** Cinco primeiras datas, para a prévia à direita. */
  const previa = useMemo(() => proximasDatas(regra, 5), [regra]);

  const podeEscolherAutor = sessao.perfil === 'ADMIN' && equipe.length > 1;
  const responsavel = equipe.find((u) => u.id === form.autorId);

  function alterarFrequencia(f: Frequencia) {
    setRegra((r) => ({
      ...r,
      frequencia: f,
      // Volta o passo para 1 ao sair do modo personalizado, que é o único com passo livre.
      intervalo: f === 'PERSONALIZADA' ? r.intervalo : 1,
    }));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando) return;
    if (!form.titulo.trim()) return notificar('Informe o título da demanda.', 'erro');

    if (aba === 'unica' && form.inicio && form.inicio > form.prazo) {
      return notificar('A data de início não pode ser depois da data de entrega.', 'erro');
    }
    if (aba === 'recorrente' && previa.length === 0) {
      return notificar('Esta regra não gera nenhuma data. Revise o período.', 'erro');
    }

    setSalvando(true);
    try {
      /*
       * Os anexos vão em lotes: vários arquivos de 1MB em base64 estouram o
       * corpo da requisição. Na recorrente o primeiro lote viaja junto da
       * criação, para a regra já nascer com o molde.
       */
      const lotes = dividirEmLotes(anexos);
      const rota = aba === 'unica' ? '/api/demandas' : '/api/recorrencias';
      const corpo = aba === 'unica'
        ? form
        : {
            titulo: form.titulo,
            descricao: form.descricao,
            categoria: form.categoria,
            prioridade: form.prioridade,
            autorId: form.autorId,
            ...regra,
            fim: temFim ? regra.fim : null,
            anexos: lotes[0] ?? [],
          };

      const res = await fetch(rota, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      const resposta = await res.json();
      if (!res.ok) throw new Error(resposta.erro ?? 'Não foi possível salvar.');

      let anexosFalharam = false;
      // Na única, todos os lotes sobem depois; na recorrente, só os restantes.
      const pendentes = aba === 'unica' ? lotes : lotes.slice(1);
      const destino = aba === 'unica'
        ? `/api/demandas/${resposta.id}/anexos`
        : `/api/recorrencias/${resposta.id}/anexos`;
      for (const lote of pendentes) {
        try {
          const r = await fetch(destino, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ anexos: lote }),
          });
          if (!r.ok) anexosFalharam = true;
        } catch {
          anexosFalharam = true;
        }
      }

      if (anexosFalharam) {
        notificar(
          aba === 'unica'
            ? 'Demanda criada, mas os anexos não subiram. Tente anexá-los na demanda.'
            : 'Recorrência criada, mas alguns anexos não subiram.',
          'erro',
        );
      } else {
        notificar(aba === 'unica' ? 'Demanda registrada.' : 'Recorrência criada.', 'ok');
      }
      await aoCriar();
      aoFechar();
    } catch (erro) {
      notificar(erro instanceof Error ? erro.message : 'Erro ao salvar.', 'erro');
      setSalvando(false);
    }
  }

  return (
    <>
      <div className="veu" onClick={aoFechar} />
      <div className="modal-demanda" role="dialog" aria-label="Nova demanda" aria-modal="true">
        <form onSubmit={enviar} style={{ display: 'contents' }}>
          <div className="modal-demanda-topo">
            <div>
              <h2 className="modal-demanda-titulo">Nova demanda</h2>
              <p className="modal-demanda-sub">
                Crie uma demanda avulsa ou recorrente para sua equipe.
              </p>
            </div>
            <button type="button" className="btn-icone" onClick={aoFechar} aria-label="Fechar">
              <IconeX size={20} />
            </button>
          </div>

          <div className="modal-abas" role="tablist">
            <button
              type="button" role="tab" aria-selected={aba === 'unica'}
              className={`modal-aba${aba === 'unica' ? ' ativa' : ''}`}
              onClick={() => setAba('unica')}
            >
              <IconeDocumento size={17} /> Demanda única
            </button>
            <button
              type="button" role="tab" aria-selected={aba === 'recorrente'}
              className={`modal-aba${aba === 'recorrente' ? ' ativa' : ''}`}
              onClick={() => setAba('recorrente')}
            >
              <IconeRepetir size={17} /> Demanda recorrente
            </button>
          </div>

          <div className={`modal-demanda-corpo${aba === 'recorrente' ? ' com-previa' : ''}`}>
            <div className="modal-campos">
              <div className="campo">
                <label className="rotulo" htmlFor="d-titulo">
                  Título da demanda <span className="obrigatorio">*</span>
                </label>
                <input
                  id="d-titulo" className="entrada" autoFocus maxLength={180} required
                  placeholder="Ex.: Apuração SN"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                />
              </div>

              <div className="campo">
                <label className="rotulo" htmlFor="d-desc">Descrição</label>
                <textarea
                  id="d-desc" className="area" maxLength={800}
                  placeholder="O que precisa ser feito, links, contexto…"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>

              <div className="campo linha-campos">
                <div>
                  <label className="rotulo" htmlFor="d-autor">
                    Responsável {podeEscolherAutor && <span className="obrigatorio">*</span>}
                  </label>
                  {podeEscolherAutor ? (
                    <div className="selecao-com-avatar">
                      <Avatar nome={responsavel?.nome ?? sessao.nome} avatar={responsavel?.avatar} tamanho="sm" />
                      <select
                        id="d-autor" className="selecao" value={form.autorId}
                        onChange={(e) => setForm({ ...form, autorId: e.target.value })}
                      >
                        {equipe.filter((u) => u.ativo).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nome}{u.id === sessao.id ? ' (você)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="selecao-com-avatar somente-leitura">
                      <Avatar nome={sessao.nome} avatar={sessao.avatar} tamanho="sm" />
                      <span>{sessao.nome}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="rotulo" htmlFor="d-cat">Categoria</label>
                  <select
                    id="d-cat" className="selecao" value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  >
                    <option value="">Sem categoria</option>
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="campo linha-campos">
                <div>
                  <label className="rotulo" htmlFor="d-prio">Prioridade</label>
                  <div className="selecao-com-ponto">
                    <span className="ponto" style={{ background: COR_PRIORIDADE_PONTO[form.prioridade] }} />
                    <select
                      id="d-prio" className="selecao" value={form.prioridade}
                      onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
                    >
                      {PRIORIDADES.map((p) => (
                        <option key={p} value={p}>{ROTULO_PRIORIDADE[p]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Início e entrega lado a lado: são um par, e assim se conferem. */}
              {aba === 'unica' && (
                <div className="campo linha-campos">
                  <div>
                    <label className="rotulo" htmlFor="d-inicio-unica">Data de início</label>
                    <input
                      id="d-inicio-unica" type="date" className="entrada"
                      max={form.prazo || undefined}
                      value={form.inicio}
                      onChange={(e) => {
                        const inicio = e.target.value;
                        // Empurra a entrega junto se o início passar dela.
                        setForm((f) => ({
                          ...f,
                          inicio,
                          prazo: inicio && inicio > f.prazo ? inicio : f.prazo,
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="rotulo" htmlFor="d-prazo">
                      Data de entrega <span className="obrigatorio">*</span>
                    </label>
                    <input
                      id="d-prazo" type="date" className="entrada" required
                      min={form.inicio || undefined}
                      value={form.prazo}
                      onChange={(e) => setForm({ ...form, prazo: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {aba === 'recorrente' && (
                <>
                  <div className="campo">
                    <label className="rotulo">
                      Recorrência <span className="obrigatorio">*</span>
                    </label>
                    <div className="freq-cartoes">
                      {FREQUENCIAS.map((f) => {
                        const Icone = ICONE_FREQUENCIA[f];
                        return (
                          <button
                            key={f} type="button"
                            className={`freq-cartao${regra.frequencia === f ? ' ativo' : ''}`}
                            aria-pressed={regra.frequencia === f}
                            onClick={() => alterarFrequencia(f)}
                          >
                            <span className="freq-icone"><Icone size={19} /></span>
                            <span className="freq-texto">
                              <span className="freq-nome">{ROTULO_FREQUENCIA[f]}</span>
                              <span className="freq-desc">{DESCRICAO_FREQUENCIA[f]}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="campo linha-tres">
                    {regra.frequencia === 'MENSAL' && (
                      <div>
                        <label className="rotulo" htmlFor="d-diames">
                          Dia do mês <span className="obrigatorio">*</span>
                        </label>
                        <input
                          id="d-diames" type="number" className="entrada" min={1} max={31}
                          value={regra.diaDoMes ?? ''}
                          onChange={(e) => setRegra({
                            ...regra,
                            diaDoMes: e.target.value ? Number(e.target.value) : null,
                          })}
                        />
                      </div>
                    )}
                    {regra.frequencia === 'PERSONALIZADA' && (
                      <div>
                        <label className="rotulo" htmlFor="d-passo">
                          A cada <span className="obrigatorio">*</span>
                        </label>
                        <div className="campo-sufixo">
                          <input
                            id="d-passo" type="number" className="entrada" min={1} max={365}
                            value={regra.intervalo}
                            onChange={(e) => setRegra({ ...regra, intervalo: Number(e.target.value) || 1 })}
                          />
                          <span className="sufixo">dias</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="rotulo" htmlFor="d-inicio">
                        Início <span className="obrigatorio">*</span>
                      </label>
                      <input
                        id="d-inicio" type="date" className="entrada" required
                        value={regra.inicio}
                        onChange={(e) => setRegra({ ...regra, inicio: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="rotulo" htmlFor="d-fim">Fim</label>
                      {temFim ? (
                        <div className="campo-com-limpar">
                          <input
                            id="d-fim" type="date" className="entrada"
                            min={regra.inicio || undefined}
                            value={regra.fim ?? ''}
                            onChange={(e) => setRegra({ ...regra, fim: e.target.value || null })}
                          />
                          <button
                            type="button" className="btn-icone"
                            onClick={() => { setTemFim(false); setRegra({ ...regra, fim: null }); }}
                            aria-label="Remover data de término"
                          >
                            <IconeX size={15} />
                          </button>
                        </div>
                      ) : (
                        <select
                          id="d-fim" className="selecao"
                          value="sem"
                          onChange={(e) => {
                            if (e.target.value === 'data') {
                              setTemFim(true);
                              setRegra({ ...regra, fim: regra.inicio });
                            }
                          }}
                        >
                          <option value="sem">Sem data de término</option>
                          <option value="data">Escolher data…</option>
                        </select>
                      )}
                    </div>
                  </div>

                  {regra.frequencia === 'SEMANAL' && (
                    <div className="campo">
                      <label className="rotulo">Dias da semana</label>
                      <div className="dias-semana">
                        {NOMES_SEMANA.map((nome, i) => {
                          const marcado = regra.diasSemana.includes(i);
                          return (
                            <button
                              key={i} type="button"
                              className={`dia-semana${marcado ? ' ativo' : ''}`}
                              aria-pressed={marcado}
                              onClick={() => setRegra({
                                ...regra,
                                diasSemana: marcado
                                  ? regra.diasSemana.filter((d) => d !== i)
                                  : [...regra.diasSemana, i],
                              })}
                            >
                              {nome}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Na recorrente, o que antes vivia em "Mais opções" fica à vista. */}
              {aba === 'recorrente' && (
                <div className="campo linha-campos">
                  <div>
                    <label className="rotulo" htmlFor="d-max">Total de ocorrências</label>
                    <input
                      id="d-max" type="number" className="entrada" min={1} max={500}
                      placeholder="Sem limite"
                      value={regra.maximo ?? ''}
                      onChange={(e) => setRegra({
                        ...regra,
                        maximo: e.target.value ? Number(e.target.value) : null,
                      })}
                    />
                  </div>
                  <label className="caixa-marcar caixa-marcar-campo">
                    <input
                      type="checkbox"
                      checked={regra.apenasDiasUteis}
                      onChange={(e) => setRegra({ ...regra, apenasDiasUteis: e.target.checked })}
                    />
                    <span>
                      <strong>Apenas dias úteis</strong>
                      <span className="caixa-marcar-desc">
                        Datas no fim de semana passam para a segunda.
                      </span>
                    </span>
                  </label>
                </div>
              )}

              {/* Anexos à vista nas duas abas. Na recorrente viram o molde:
                  cada demanda gerada recebe a própria cópia dos arquivos. */}
              <div className="campo">
                <label className="rotulo">
                  <IconeClipe size={15} /> Anexos <span className="opcional">(opcional)</span>
                </label>
                {aba === 'recorrente' && (
                  <p className="campo-ajuda">
                    Os arquivos são copiados para cada demanda criada pela recorrência.
                  </p>
                )}
                <AnexosPendentes anexos={anexos} aoMudar={setAnexos} notificar={notificar} />
              </div>
            </div>

            {aba === 'recorrente' && (
              <aside className="previa">
                <div className="previa-titulo">Prévia da recorrência</div>
                <p className="previa-sub">Veja como as próximas demandas serão criadas.</p>

                {previa.length === 0 ? (
                  <p className="previa-vazia">
                    Esta regra não gera nenhuma data. Revise o período.
                  </p>
                ) : (
                  <ol className="previa-lista">
                    {previa.map((dia) => {
                      const { data, semana } = dataPorExtenso(dia);
                      return (
                        <li key={dia}>
                          <span className="previa-marca" />
                          <span className="previa-texto">
                            <span className="previa-data">{data}</span>
                            <span className="previa-semana">{semana}</span>
                          </span>
                        </li>
                      );
                    })}
                    {/* Sem fim definido a série continua; o "…" diz isso sem mentir a contagem. */}
                    {(regra.fim === null || previa.length === 5) && (
                      <li className="previa-reticencias">
                        <span className="previa-marca" />
                        <span className="previa-texto">
                          <span className="previa-data">…</span>
                          <span className="previa-semana">E assim por diante</span>
                        </span>
                      </li>
                    )}
                  </ol>
                )}

                <div className="previa-aviso">
                  <span className="previa-aviso-icone"><IconeInfo size={17} /></span>
                  <p>
                    Serão criadas demandas automaticamente na data definida, com as mesmas
                    informações e o status &ldquo;Em aberto&rdquo;.
                  </p>
                </div>
              </aside>
            )}
          </div>

          <div className="modal-demanda-rodape">
            <button type="button" className="btn btn-secundario" onClick={aoFechar}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primario" disabled={salvando}>
              {salvando
                ? <><span className="girando">⏳</span> Salvando…</>
                : aba === 'unica'
                  ? <><IconeMais size={17} /> Criar demanda</>
                  : <><IconeRepetir size={17} /> Criar demanda recorrente</>}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
