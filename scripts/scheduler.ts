/**
 * Agendador do Radar MSA.
 *
 * Roda em processo separado e chama a API de disparo no horário configurado.
 * Uso: npm run scheduler  (com o `npm run dev`/`start` já em execução)
 *
 * Configure SCHEDULER_CRON, SCHEDULER_TZ e APP_URL no .env.
 */
import cron from 'node-cron';

const EXPRESSAO = process.env.SCHEDULER_CRON || '0 8 * * 1-5';
const TZ = process.env.SCHEDULER_TZ || 'America/Sao_Paulo';
const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const SEGREDO = process.env.CRON_SECRET?.trim();

function agora(): string {
  return new Date().toLocaleString('pt-BR', { timeZone: TZ });
}

async function disparar() {
  console.log(`[${agora()}] Disparando alertas…`);
  try {
    const res = await fetch(`${APP_URL}/api/disparo`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(SEGREDO ? { authorization: `Bearer ${SEGREDO}` } : {}),
      },
      body: JSON.stringify({ postergar: true }),
    });

    const dados = await res.json();
    if (!res.ok) {
      console.error(`[${agora()}] Falha (${res.status}):`, dados);
      return;
    }

    console.log(
      `[${agora()}] Dia ${dados.diaReferencia} · modo ${dados.modo} · ` +
        `${dados.enviados} enviado(s), ${dados.erros} erro(s), ` +
        `${dados.ignorados} ignorado(s), ${dados.postergadas} demanda(s) movidas.`,
    );
  } catch (erro) {
    console.error(`[${agora()}] Erro ao chamar a API:`, erro);
  }
}

if (!cron.validate(EXPRESSAO)) {
  console.error(`Expressão cron inválida: "${EXPRESSAO}"`);
  process.exit(1);
}

console.log('─'.repeat(58));
console.log('  Radar MSA · agendador de alertas');
console.log('─'.repeat(58));
console.log(`  Cron .....: ${EXPRESSAO}`);
console.log(`  Fuso .....: ${TZ}`);
console.log(`  Alvo .....: ${APP_URL}/api/disparo`);
console.log(`  Início ...: ${agora()}`);
console.log('─'.repeat(58));
console.log('Aguardando o próximo horário. Ctrl+C para encerrar.\n');

cron.schedule(EXPRESSAO, disparar, { timezone: TZ });

// `npm run scheduler -- --agora` dispara imediatamente, útil para testar.
if (process.argv.includes('--agora')) void disparar();
