'use client';

import { faixaDoScore } from '@/lib/painel';

/**
 * Anel do Radar Score. Desenhado em SVG como os demais gráficos do painel —
 * o projeto não usa biblioteca de charts.
 */
export function AnelScore({ score }: { score: number }) {
  const tamanho = 104, raio = 42, espessura = 9;
  const centro = tamanho / 2;
  const volta = 2 * Math.PI * raio;
  const preenchido = (Math.min(Math.max(score, 0), 100) / 100) * volta;
  const faixa = faixaDoScore(score);

  return (
    <svg
      viewBox={`0 0 ${tamanho} ${tamanho}`}
      className="anel-score"
      role="img"
      aria-label={`Radar Score ${score} de 100 — ${faixa.rotulo}`}
    >
      <circle
        cx={centro} cy={centro} r={raio} fill="none"
        stroke={faixa.fundo} strokeOpacity="0.16" strokeWidth={espessura}
      />
      <circle
        cx={centro} cy={centro} r={raio} fill="none"
        stroke={faixa.fundo} strokeWidth={espessura} strokeLinecap="round"
        strokeDasharray={`${preenchido} ${volta - preenchido}`}
        /* Começa no topo e gira no sentido horário. */
        transform={`rotate(-90 ${centro} ${centro})`}
      />
      <text x={centro} y={centro + 2} className="anel-score-valor" textAnchor="middle">
        {score}
      </text>
      <text x={centro} y={centro + 19} className="anel-score-base" textAnchor="middle">
        /100
      </text>
    </svg>
  );
}
