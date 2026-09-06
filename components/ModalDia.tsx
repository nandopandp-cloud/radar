'use client';

import { useEffect } from 'react';
import { IconeMais, IconeX } from '@/components/icones';
import { COR_SITUACAO, PESO_SITUACAO, ROTULO_SITUACAO, situacaoDe } from '@/lib/dominio';
import { formatarDiaExtenso } from '@/lib/datas';
import type { Demanda, SessaoUI } from '@/lib/tipos';

/**
 * Demandas de um dia, em modal no centro (desktop) ou folha inferior (celular).
 * Abre ao clicar num dia do calendário — inclusive num dia vazio, onde serve
 * de atalho direto para criar a primeira demanda daquele dia.
 */
export function ModalDia({
  dia,
  demandas,
  hoje,
  sessao,
  aoFechar,
  aoAbrirDemanda,
  aoNovaDemanda,
}: {
  dia: string;
  demandas: Demanda[];
  hoje: string;
  sessao: SessaoUI;
  aoFechar: () => void;
  aoAbrirDemanda: (d: Demanda) => void;
  aoNovaDemanda: (prazo: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aoFechar]);

  const lista = demandas
    .filter((d) => d.prazo.slice(0, 10) === dia)
    .map((d) => ({ d, situacao: situacaoDe(d.status, dia, hoje) }))
    .sort((a, b) => PESO_SITUACAO[a.situacao] - PESO_SITUACAO[b.situacao]);

  const diaLongo = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric', month: 'long', timeZone: 'UTC',
  }).format(new Date(`${dia}T00:00:00Z`));

  return (
    <>
      <div className="veu" onClick={aoFechar} />
      <div className="modal-dia" role="dialog" aria-label={`Demandas de ${diaLongo}`}>
        <div className="modal-alca" />

        <div className="modal-topo">
          <div>
            <div className="modal-titulo primeira-maiuscula">
              {dia === hoje ? 'Hoje' : diaLongo}
            </div>
            <div className="modal-sub primeira-maiuscula">
              {formatarDiaExtenso(dia)}
            </div>
          </div>
          <button className="btn-icone" onClick={aoFechar} aria-label="Fechar">
            <IconeX size={20} />
          </button>
        </div>

        <div className="modal-corpo">
          {lista.length === 0 ? (
            <div className="modal-vazio">
              <div className="modal-vazio-icone">
                <IconeMais size={26} />
              </div>
              <div className="vazio-titulo">Nenhuma demanda neste dia</div>
              <p className="vazio-texto">
                Lance a primeira demanda com prazo em {diaLongo}. Você será avisado
                por e-mail se ela não for concluída até lá.
              </p>
            </div>
          ) : (
            <div className="modal-lista">
              {lista.map(({ d, situacao }) => (
                <button
                  key={d.id}
                  className={`dia-item${situacao === 'ATRASADA' ? ' atrasada' : ''}`}
                  onClick={() => { aoAbrirDemanda(d); aoFechar(); }}
                >
                  <span
                    className="ponto"
                    style={{ background: COR_SITUACAO[situacao], marginTop: 6 }}
                  />
                  <div className="dia-item-corpo">
                    <div className="dia-item-topo">
                      <span className="dia-item-titulo">{d.titulo}</span>
                      <span className={`selo selo-${situacao}`}>{ROTULO_SITUACAO[situacao]}</span>
                    </div>
                    {d.descricao && <div className="dia-item-desc">{d.descricao}</div>}
                    {sessao.perfil === 'ADMIN' && (
                      <div className="dia-item-desc">{d.autor.nome}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="modal-rodape">
          <button
            className="btn btn-primario btn-bloco"
            onClick={() => { aoNovaDemanda(dia); aoFechar(); }}
          >
            <IconeMais size={18} />
            {lista.length === 0 ? 'Criar primeira demanda' : `Adicionar demanda em ${diaLongo}`}
          </button>
        </div>
      </div>
    </>
  );
}
