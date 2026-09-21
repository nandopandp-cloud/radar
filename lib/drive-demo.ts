/**
 * Catálogo fictício do Google Drive da MSA.
 *
 * Nada aqui fala com o Google: são dados de demonstração para avaliar a
 * experiência de "Meus arquivos" e do anexar a partir do Drive antes de
 * investir na integração real (OAuth, escopos, refresh tokens por usuário).
 *
 * Quando a integração chegar, este arquivo sai e as mesmas funções passam a
 * consultar a API do Drive — os tipos abaixo são o contrato que as telas usam,
 * feitos para sobreviver à troca.
 */

export type TipoArquivo =
  | 'pasta' | 'planilha' | 'documento' | 'apresentacao' | 'pdf' | 'imagem' | 'outro';

/** De onde o arquivo veio, para a coluna "Origem" da aba do Radar. */
export type OrigemArquivo = 'drive' | 'upload' | 'radar';

export type ArquivoDrive = {
  id: string;
  nome: string;
  tipo: TipoArquivo;
  /** Id da pasta que o contém. Null na raiz ("Meu Drive"). */
  paiId: string | null;
  /** Bytes. Null nas pastas e nos formatos nativos do Google, que não ocupam cota. */
  tamanho: number | null;
  modificadoEm: string;
  criadoEm: string;
  proprietario: string;
  /** Quantas pessoas além do dono enxergam o arquivo. */
  compartilhadoCom: number;
  origem: OrigemArquivo;
  /** Demanda do Radar a que o arquivo está ligado, quando houver. */
  demanda?: string | null;
  favorito?: boolean;
  /** Veio de "Compartilhados comigo" em vez do Meu Drive. */
  compartilhado?: boolean;
};

/** Hoje é a referência das datas; o catálogo envelhece junto com a demo. */
function dia(offset: number, hora = '10:00'): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return `${d.toISOString().slice(0, 10)}T${hora}:00.000Z`;
}

export const RAIZ = 'meu-drive';

/**
 * As pastas do Drive da MSA, na numeração que a empresa usa. A contagem de
 * arquivos de cada uma sai do próprio catálogo, em `conteudoDe`.
 */
const PASTAS: ArquivoDrive[] = [
  ['p01', '01 - Institucional', -29], ['p02', '02 - Projetos', -3],
  ['p03', '03 - Financeiro', -9], ['p04', '04 - Operações', -11],
  ['p05', '05 - Relatórios', 0], ['p06', '06 - Comercial', -16],
  ['p07', '07 - RH', -20], ['p08', '08 - Marketing', -24],
  ['p09', '09 - Jurídico', -26],
].map(([id, nome, offset]) => ({
  id: id as string,
  nome: nome as string,
  tipo: 'pasta' as const,
  paiId: RAIZ,
  tamanho: null,
  modificadoEm: dia(offset as number, '14:32'),
  criadoEm: dia(-620, '09:12'),
  proprietario: 'MSA',
  compartilhadoCom: 12,
  origem: 'drive' as const,
}));

/** Arquivos soltos na raiz do Meu Drive, como no mockup. */
const ARQUIVOS: ArquivoDrive[] = [
  {
    id: 'a01', nome: 'Fechamento_MSA_Setembro.xlsx', tipo: 'planilha', paiId: RAIZ,
    tamanho: 2_516_582, modificadoEm: dia(0, '11:03'), criadoEm: dia(-20, '09:12'),
    proprietario: 'Fernando Rodrigues', compartilhadoCom: 8, origem: 'drive',
    demanda: 'Fechamento mensal MSA', favorito: true,
  },
  {
    id: 'a02', nome: 'Relatorio_Q3_2026.pdf', tipo: 'pdf', paiId: RAIZ,
    tamanho: 1_887_436, modificadoEm: dia(-3, '09:14'), criadoEm: dia(-30, '15:00'),
    proprietario: 'Marina Duarte', compartilhadoCom: 5, origem: 'upload',
    demanda: 'Relatório trimestral',
  },
  {
    id: 'a03', nome: 'Procedimento_Operacional.docx', tipo: 'documento', paiId: RAIZ,
    tamanho: 913_408, modificadoEm: dia(-9, '15:22'), criadoEm: dia(-40, '11:30'),
    proprietario: 'Marina Duarte', compartilhadoCom: 3, origem: 'drive',
    demanda: 'Atualização de processo',
  },
  {
    id: 'a04', nome: 'Apresentacao_Resultados.gslides', tipo: 'apresentacao', paiId: RAIZ,
    tamanho: null, modificadoEm: dia(-11, '10:44'), criadoEm: dia(-45, '08:20'),
    proprietario: 'Fernando Rodrigues', compartilhadoCom: 11, origem: 'drive',
    demanda: 'Reunião de resultados', favorito: true,
  },
  {
    id: 'a05', nome: 'Contrato_MSA_2026.pdf', tipo: 'pdf', paiId: RAIZ,
    tamanho: 3_250_585, modificadoEm: dia(-16, '17:31'), criadoEm: dia(-60, '14:00'),
    proprietario: 'Jurídico MSA', compartilhadoCom: 4, origem: 'upload',
    demanda: 'Renovação de contrato',
  },
  {
    id: 'a06', nome: 'Controle_Demandas.xlsx', tipo: 'planilha', paiId: RAIZ,
    tamanho: 1_153_434, modificadoEm: dia(-19, '14:19'), criadoEm: dia(-90, '10:00'),
    proprietario: 'Marina Duarte', compartilhadoCom: 6, origem: 'drive',
    demanda: 'Controle interno',
  },
  {
    id: 'a07', nome: 'Fluxo_Processo.png', tipo: 'imagem', paiId: 'p04',
    tamanho: 460_800, modificadoEm: dia(-24, '16:05'), criadoEm: dia(-24, '16:05'),
    proprietario: 'Marina Duarte', compartilhadoCom: 2, origem: 'upload',
    demanda: 'Mapeamento de processo',
  },
  {
    id: 'a08', nome: 'Manual_Usuario_Radar.pdf', tipo: 'pdf', paiId: 'p01',
    tamanho: 2_936_012, modificadoEm: dia(-32, '11:20'), criadoEm: dia(-32, '11:20'),
    proprietario: 'MSA', compartilhadoCom: 14, origem: 'drive',
    demanda: 'Treinamento equipe',
  },
  {
    id: 'a09', nome: 'Checklist_Onboarding.docx', tipo: 'documento', paiId: 'p07',
    tamanho: 634_880, modificadoEm: dia(-37, '09:40'), criadoEm: dia(-37, '09:40'),
    proprietario: 'Marina Duarte', compartilhadoCom: 3, origem: 'radar',
    demanda: 'Onboarding novos analistas',
  },
  {
    id: 'a10', nome: 'KPIs_Operacionais.xlsx', tipo: 'planilha', paiId: 'p05',
    tamanho: 1_677_721, modificadoEm: dia(-42, '13:10'), criadoEm: dia(-42, '13:10'),
    proprietario: 'Fernando Rodrigues', compartilhadoCom: 7, origem: 'drive',
    demanda: 'Acompanhamento de KPIs',
  },
  {
    id: 'a11', nome: 'Apresentacao_Comite.pdf', tipo: 'pdf', paiId: 'p05',
    tamanho: 4_404_019, modificadoEm: dia(-47, '15:55'), criadoEm: dia(-47, '15:55'),
    proprietario: 'MSA', compartilhadoCom: 9, origem: 'upload',
    demanda: 'Comitê executivo',
  },
  {
    id: 'a12', nome: 'Roadmap_2026.gslides', tipo: 'apresentacao', paiId: 'p02',
    tamanho: null, modificadoEm: dia(-51, '10:30'), criadoEm: dia(-51, '10:30'),
    proprietario: 'Fernando Rodrigues', compartilhadoCom: 10, origem: 'drive',
    demanda: 'Planejamento 2026',
  },
  {
    id: 'a13', nome: 'Balancete_Agosto.xlsx', tipo: 'planilha', paiId: 'p03',
    tamanho: 1_992_294, modificadoEm: dia(-22, '08:45'), criadoEm: dia(-22, '08:45'),
    proprietario: 'Financeiro MSA', compartilhadoCom: 4, origem: 'drive',
    demanda: 'Fechamento mensal MSA',
  },
  {
    id: 'a14', nome: 'Politica_Privacidade.pdf', tipo: 'pdf', paiId: 'p09',
    tamanho: 786_432, modificadoEm: dia(-26, '14:00'), criadoEm: dia(-26, '14:00'),
    proprietario: 'Jurídico MSA', compartilhadoCom: 15, origem: 'drive',
  },
  {
    id: 'a15', nome: 'Campanha_Setembro.gslides', tipo: 'apresentacao', paiId: 'p08',
    tamanho: null, modificadoEm: dia(-24, '16:40'), criadoEm: dia(-24, '16:40'),
    proprietario: 'Marketing MSA', compartilhadoCom: 6, origem: 'drive',
  },
  {
    id: 'a16', nome: 'Proposta_Comercial.docx', tipo: 'documento', paiId: 'p06',
    tamanho: 512_000, modificadoEm: dia(-16, '10:15'), criadoEm: dia(-16, '10:15'),
    proprietario: 'Comercial MSA', compartilhadoCom: 5, origem: 'drive',
    demanda: 'Proposta cliente novo',
  },
  {
    id: 'a17', nome: 'Ata_Reuniao_Diretoria.docx', tipo: 'documento', paiId: RAIZ,
    tamanho: 348_160, modificadoEm: dia(-6, '17:20'), criadoEm: dia(-6, '17:20'),
    proprietario: 'MSA', compartilhadoCom: 7, origem: 'radar',
    demanda: 'Reunião de diretoria', compartilhado: true,
  },
  {
    id: 'a18', nome: 'Cronograma_Projetos.xlsx', tipo: 'planilha', paiId: 'p02',
    tamanho: 1_048_576, modificadoEm: dia(-3, '10:21'), criadoEm: dia(-70, '09:00'),
    proprietario: 'Fernando Rodrigues', compartilhadoCom: 8, origem: 'drive',
    demanda: 'Planejamento 2026', favorito: true, compartilhado: true,
  },
];

/**
 * Preenchimento das pastas: o mockup mostra pastas com dezenas de arquivos, e
 * uma pasta com um item só não deixa avaliar a densidade da tela. Estes têm
 * nome e data, mas não aparecem na aba do Radar — não estão ligados a demanda.
 */
const RECHEIO: ArquivoDrive[] = ([
  ['p01', 'Organograma_MSA', 'pdf', 11], ['p01', 'Missao_Visao_Valores', 'documento', 9],
  ['p01', 'Historico_Institucional', 'documento', 10],
  ['p02', 'Projeto_Alfa_Escopo', 'documento', 6], ['p02', 'Projeto_Beta_Escopo', 'documento', 6],
  ['p02', 'Status_Semanal', 'planilha', 5],
  ['p03', 'DRE_Consolidado', 'planilha', 13], ['p03', 'Fluxo_de_Caixa', 'planilha', 12],
  ['p03', 'Notas_Fiscais_Agosto', 'pdf', 14], ['p03', 'Conciliacao_Bancaria', 'planilha', 12],
  ['p04', 'Matriz_Responsabilidades', 'planilha', 8], ['p04', 'SLA_Atendimento', 'documento', 9],
  ['p05', 'Relatorio_Mensal_Agosto', 'pdf', 21], ['p05', 'Relatorio_Mensal_Julho', 'pdf', 50],
  ['p05', 'Indicadores_Consolidados', 'planilha', 20],
  ['p06', 'Tabela_de_Precos', 'planilha', 15], ['p06', 'Pipeline_Comercial', 'planilha', 16],
  ['p07', 'Ferias_Equipe', 'planilha', 19], ['p07', 'Plano_de_Cargos', 'documento', 22],
  ['p08', 'Calendario_Editorial', 'planilha', 23], ['p08', 'Identidade_Visual', 'pdf', 25],
  ['p09', 'Contratos_Vigentes', 'planilha', 27], ['p09', 'Pareceres_2026', 'pdf', 28],
] as [string, string, TipoArquivo, number][]).map(([pai, nome, tipo, idade], i) => ({
  id: `r${i.toString().padStart(2, '0')}`,
  nome: `${nome}.${tipo === 'planilha' ? 'xlsx' : tipo === 'pdf' ? 'pdf' : 'docx'}`,
  tipo,
  paiId: pai,
  tamanho: 200_000 + i * 73_000,
  modificadoEm: dia(-idade, '11:00'),
  criadoEm: dia(-idade - 30, '09:00'),
  proprietario: 'MSA',
  compartilhadoCom: 3 + (i % 8),
  origem: 'drive' as const,
}));

export const CATALOGO: ArquivoDrive[] = [...PASTAS, ...ARQUIVOS, ...RECHEIO];

/** Tudo que está dentro de uma pasta, com as subpastas primeiro. */
export function conteudoDe(paiId: string): ArquivoDrive[] {
  return CATALOGO
    .filter((a) => a.paiId === paiId)
    .sort((a, b) => {
      if (a.tipo === 'pasta' && b.tipo !== 'pasta') return -1;
      if (a.tipo !== 'pasta' && b.tipo === 'pasta') return 1;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
}

export function acharArquivo(id: string): ArquivoDrive | null {
  return CATALOGO.find((a) => a.id === id) ?? null;
}

/** Quantos arquivos (não pastas) uma pasta guarda. */
export function contarArquivos(pastaId: string): number {
  return CATALOGO.filter((a) => a.paiId === pastaId && a.tipo !== 'pasta').length;
}

/** O caminho até a raiz, da mais externa para a mais interna. */
export function caminhoDe(id: string): ArquivoDrive[] {
  const caminho: ArquivoDrive[] = [];
  let atual = acharArquivo(id);
  while (atual) {
    caminho.unshift(atual);
    atual = atual.paiId && atual.paiId !== RAIZ ? acharArquivo(atual.paiId) : null;
  }
  return caminho;
}

/** As pastas de primeiro nível, para a árvore lateral e a grade. */
export function pastasDaRaiz(): ArquivoDrive[] {
  return PASTAS;
}

/** Os arquivos ligados a alguma demanda — o acervo da aba do Radar. */
export function documentosDoRadar(): ArquivoDrive[] {
  // Só os arquivos com vida no Radar: o recheio das pastas é ruído do Drive.
  return ARQUIVOS
    .filter((a) => a.tipo !== 'pasta')
    .sort((a, b) => b.modificadoEm.localeCompare(a.modificadoEm));
}

/** Cota do Drive da MSA, para a barra no rodapé da árvore. */
export const ARMAZENAMENTO = { usado: 327, total: 1024, rotulo: '327 GB de 1 TB utilizados' };

/** Tamanho legível: 980 B, 12,4 KB, 2,4 MB. Pastas e nativos do Google não têm. */
export function tamanhoLegivel(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

/** "21/09/2026 11:03" — o formato das colunas de data nas listas. */
export function dataLegivel(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }).format(new Date(iso)).replace(',', '');
}

/** "21/09/2026 às 11:03" — o formato do painel de detalhes. */
export function dataPorExtenso(iso: string): string {
  const d = new Date(iso);
  const data = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
  }).format(d);
  const hora = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }).format(d);
  return `${data} às ${hora}`;
}
