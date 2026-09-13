'use client';

import { useId } from 'react';
import type { Situacao } from '@/lib/dominio';
import type { Barra, Fatia, PontoSerie } from '@/lib/painel';

/**
 * Gráficos do painel, desenhados à mão em SVG.
 *
 * O projeto não usa biblioteca de gráficos e são poucos formatos; um SVG
 * direto evita somar centenas de KB ao pacote só para desenhar isto.
 */

/** Ordem de empilhamento da área: o mais grave fica no topo. */
const CAMADAS: { situacao: Situacao; rotulo: string; cor: string }[] = [
  { situacao: 'PENDENTE', rotulo: 'Em aberto', cor: '#3b82f6' },
  { situacao: 'CONCLUIDA', rotulo: 'Concluídas', cor: '#22c55e' },
  { situacao: 'EM_ANDAMENTO', rotulo: 'Em andamento', cor: '#f59e0b' },
  { situacao: 'ATRASADA', rotulo: 'Atrasadas', cor: '#ef4444' },
];

/** Escala "bonita" para o eixo: 10, 20, 50, 100… acima do pico. */
function tetoDoEixo(maximo: number): number {
  if (maximo <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(maximo));
  for (const passo of [1, 2, 2.5, 5, 10]) {
    const candidato = magnitude * passo;
    if (candidato >= maximo) return candidato;
  }
  return magnitude * 10;
}

function rotuloDia(dia: string): string {
  const [, mes, d] = dia.split('-');
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${Number(d)} ${meses[Number(mes) - 1]}`;
}

/** Área empilhada da evolução no tempo. */
export function GraficoEvolucao({ serie }: { serie: PontoSerie[] }) {
  const idBase = useId();
  const L = 34, R = 8, T = 10, B = 26;   // margens internas
  const largura = 620, altura = 250;
  const areaL = largura - L - R;
  const areaA = altura - T - B;

  if (serie.length === 0) {
    return <p className="grafico-vazio">Sem demandas no período.</p>;
  }

  const totais = serie.map((p) => CAMADAS.reduce((s, c) => s + p.valores[c.situacao], 0));
  const teto = tetoDoEixo(Math.max(...totais, 1));

  const x = (i: number) => L + (serie.length === 1 ? areaL / 2 : (i / (serie.length - 1)) * areaL);
  const y = (v: number) => T + areaA - (v / teto) * areaA;

  /**
   * Curva suave por entre os pontos. Dados diários oscilam muito e a linha
   * reta vira serrote; a curva mantém a leitura da tendência.
   */
  type Ponto = { x: number; y: number };

  /** Segmentos de curva entre os pontos, sem o "M" inicial. */
  const segmentos = (pontos: Ponto[]) =>
    pontos
      .slice(1)
      .map((b, i) => {
        const a = pontos[i];
        const meio = (a.x + b.x) / 2;
        return `C ${meio} ${a.y}, ${meio} ${b.y}, ${b.x} ${b.y}`;
      })
      .join(' ');

  const curva = (pontos: Ponto[]) =>
    pontos.length === 0 ? '' : `M ${pontos[0].x} ${pontos[0].y} ${segmentos(pontos)}`.trim();

  // Empilha de baixo para cima, guardando o topo de cada camada.
  const acumulado = new Array(serie.length).fill(0);
  const camadas = CAMADAS.map((camada) => {
    const base = [...acumulado];
    for (let i = 0; i < serie.length; i++) acumulado[i] += serie[i].valores[camada.situacao];
    const topo = [...acumulado];

    const pontosTopo: Ponto[] = topo.map((v, i) => ({ x: x(i), y: y(v) }));
    // A base volta da direita para a esquerda, fechando o contorno da área.
    const pontosBase: Ponto[] = base.map((v, i) => ({ x: x(i), y: y(v) })).reverse();

    return {
      ...camada,
      area: `${curva(pontosTopo)} L ${pontosBase[0].x} ${pontosBase[0].y} ${segmentos(pontosBase)} Z`,
      linha: curva(pontosTopo),
    };
  });

  // Quatro marcas no eixo X, sem amontoar rótulos.
  const marcas = serie.length <= 1 ? [0] : [0, 1, 2, 3, 4].map((k) =>
    Math.round((k / 4) * (serie.length - 1)),
  );
  const riscos = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(teto * f));

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      className="grafico"
      role="img"
      aria-label="Evolução das demandas por situação ao longo do período"
    >
      {riscos.map((v) => (
        <g key={v}>
          <line x1={L} x2={largura - R} y1={y(v)} y2={y(v)} className="grafico-grade" />
          <text x={L - 8} y={y(v) + 4} className="grafico-eixo" textAnchor="end">{v}</text>
        </g>
      ))}

      {camadas.map((c) => (
        <g key={c.situacao}>
          <defs>
            <linearGradient id={`${idBase}-${c.situacao}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.cor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={c.cor} stopOpacity="0.06" />
            </linearGradient>
          </defs>
          <path d={c.area} fill={`url(#${idBase}-${c.situacao})`} />
          <path d={c.linha} fill="none" stroke={c.cor} strokeWidth="1.8"
                strokeLinejoin="round" strokeLinecap="round" />
        </g>
      ))}

      {marcas.map((i) => (
        <text key={i} x={x(i)} y={altura - 8} className="grafico-eixo" textAnchor="middle">
          {rotuloDia(serie[i].dia)}
        </text>
      ))}
    </svg>
  );
}

export function LegendaEvolucao() {
  return (
    <div className="grafico-legenda">
      {CAMADAS.map((c) => (
        <span className="legenda-item" key={c.situacao}>
          <span className="ponto" style={{ background: c.cor }} />
          {c.rotulo}
        </span>
      ))}
    </div>
  );
}

/** Rosca com total no centro. */
export function GraficoRosca({
  fatias,
  total,
  legenda = 'demandas',
}: {
  fatias: Fatia[];
  total: number;
  legenda?: string;
}) {
  const tamanho = 168, raio = 66, espessura = 22;
  const centro = tamanho / 2;
  const circunferencia = 2 * Math.PI * raio;
  const soma = fatias.reduce((s, f) => s + f.valor, 0);

  let percorrido = 0;

  return (
    <svg
      viewBox={`0 0 ${tamanho} ${tamanho}`}
      className="rosca"
      role="img"
      aria-label={`${total} ${legenda} distribuídas em ${fatias.length} grupos`}
    >
      {/* Trilho de fundo: aparece quando não há nada, e fecha falhas de arredondamento. */}
      <circle
        cx={centro} cy={centro} r={raio} fill="none"
        stroke="#eef2f7" strokeWidth={espessura}
      />
      {soma > 0 && fatias.map((f) => {
        const fracao = f.valor / soma;
        const traco = fracao * circunferencia;
        const deslocamento = -percorrido * circunferencia;
        percorrido += fracao;
        if (f.valor === 0) return null;
        return (
          <circle
            key={f.rotulo}
            cx={centro} cy={centro} r={raio} fill="none"
            stroke={f.cor} strokeWidth={espessura}
            strokeDasharray={`${traco} ${circunferencia - traco}`}
            strokeDashoffset={deslocamento}
            /* Começa no topo, girando no sentido horário. */
            transform={`rotate(-90 ${centro} ${centro})`}
          />
        );
      })}
      <text x={centro} y={centro - 2} className="rosca-valor" textAnchor="middle">{total}</text>
      <text x={centro} y={centro + 16} className="rosca-rotulo" textAnchor="middle">{legenda}</text>
    </svg>
  );
}

/** Lista ao lado da rosca: cor, rótulo, valor e percentual. */
export function LegendaRosca({ fatias }: { fatias: Fatia[] }) {
  return (
    <ul className="rosca-legenda">
      {fatias.map((f) => (
        <li key={f.rotulo}>
          <span className="ponto" style={{ background: f.cor }} />
          <span className="rosca-legenda-rotulo">{f.rotulo}</span>
          <span className="rosca-legenda-valor">{f.valor}</span>
          <span className="rosca-legenda-pct">{f.percentual}%</span>
        </li>
      ))}
    </ul>
  );
}

/** Barras verticais da prioridade. */
export function GraficoBarras({ barras }: { barras: Barra[] }) {
  const maximo = Math.max(...barras.map((b) => b.valor), 1);

  return (
    <div className="barras" role="img" aria-label="Demandas por prioridade">
      {barras.map((b) => (
        <div className="barra-coluna" key={b.rotulo}>
          <span className="barra-valor">{b.valor}</span>
          <div className="barra-trilho">
            <div
              className="barra-preenchida"
              style={{
                // Piso de 8% para um valor baixo não virar um risco invisível.
                height: `${b.valor > 0 ? Math.max((b.valor / maximo) * 100, 8) : 0}%`,
                background: b.cor,
              }}
            />
          </div>
          <span className="barra-rotulo">{b.rotulo}</span>
        </div>
      ))}
    </div>
  );
}
