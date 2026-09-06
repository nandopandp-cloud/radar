'use client';

import { useEffect, useState } from 'react';
import { IconeMais, IconeX } from '@/components/icones';
import { CATEGORIAS, PRIORIDADES, ROTULO_PRIORIDADE } from '@/lib/dominio';
import { formatarDiaExtenso } from '@/lib/datas';
import type { Notificar, SessaoUI, Usuario } from '@/lib/tipos';

export function GavetaNova({
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
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    prazo: prazoInicial,
    prioridade: 'MEDIA',
    categoria: '',
    solicitante: '',
    autorId: sessao.id,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aoFechar]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando) return;
    if (!form.titulo.trim()) return notificar('Informe o título da demanda.', 'erro');

    setSalvando(true);
    try {
      const res = await fetch('/api/demandas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const corpo = await res.json();
      if (!res.ok) throw new Error(corpo.erro ?? 'Não foi possível salvar.');
      notificar('Demanda registrada.', 'ok');
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
      <aside className="gaveta" role="dialog" aria-label="Nova demanda">
        <form onSubmit={enviar} style={{ display: 'contents' }}>
          <div className="gaveta-topo">
            <button type="button" className="btn-icone gaveta-fechar" onClick={aoFechar} aria-label="Fechar">
              <IconeX size={20} />
            </button>
            <div className="gaveta-titulo">Nova demanda</div>
            <div className="gaveta-meta">
              Prazo em {formatarDiaExtenso(form.prazo)} · você será alertado se não concluir até lá
            </div>
          </div>

          <div className="gaveta-corpo">
            <div className="campo">
              <label className="rotulo" htmlFor="n-titulo">Título</label>
              <input
                id="n-titulo" className="entrada" autoFocus maxLength={180} required
                placeholder="Ex.: Enviar relatório financeiro"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </div>

            <div className="campo">
              <label className="rotulo" htmlFor="n-desc">
                Descrição <span className="opcional">(opcional)</span>
              </label>
              <textarea
                id="n-desc" className="area" maxLength={800}
                placeholder="O que precisa ser feito, links, contexto…"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>

            <div className="campo linha-campos">
              <div>
                <label className="rotulo" htmlFor="n-prazo">Prazo de entrega</label>
                <input
                  id="n-prazo" type="date" className="entrada" required
                  value={form.prazo}
                  onChange={(e) => setForm({ ...form, prazo: e.target.value })}
                />
              </div>
              <div>
                <label className="rotulo" htmlFor="n-prio">Prioridade</label>
                <select
                  id="n-prio" className="selecao" value={form.prioridade}
                  onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
                >
                  {PRIORIDADES.map((p) => <option key={p} value={p}>{ROTULO_PRIORIDADE[p]}</option>)}
                </select>
              </div>
            </div>

            <div className="campo linha-campos">
              <div>
                <label className="rotulo" htmlFor="n-cat">
                  Categoria <span className="opcional">(opcional)</span>
                </label>
                <select
                  id="n-cat" className="selecao" value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                >
                  <option value="">Sem categoria</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="rotulo" htmlFor="n-sol">
                  Solicitante <span className="opcional">(opcional)</span>
                </label>
                <input
                  id="n-sol" className="entrada" maxLength={120} placeholder="Quem pediu"
                  value={form.solicitante}
                  onChange={(e) => setForm({ ...form, solicitante: e.target.value })}
                />
              </div>
            </div>

            {sessao.perfil === 'ADMIN' && equipe.length > 1 && (
              <div className="campo">
                <label className="rotulo" htmlFor="n-autor">Lançar em nome de</label>
                <select
                  id="n-autor" className="selecao" value={form.autorId}
                  onChange={(e) => setForm({ ...form, autorId: e.target.value })}
                >
                  {equipe.filter((u) => u.ativo).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}{u.id === sessao.id ? ' (você)' : ''}
                    </option>
                  ))}
                </select>
                <div className="texto-suave" style={{ marginTop: 6 }}>
                  O alerta de prazo vencido vai para esta pessoa.
                </div>
              </div>
            )}
          </div>

          <div className="gaveta-rodape">
            <button type="button" className="btn btn-secundario" onClick={aoFechar}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primario" style={{ flex: 1 }} disabled={salvando}>
              {salvando ? <><span className="girando">⏳</span> Salvando…</> : <><IconeMais size={17} /> Criar demanda</>}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
