/**
 * HTML autocontido para as recusas do resgate de link.
 *
 * A rota de resgate é um Route Handler (obrigatório para escrever o cookie da
 * sessão), e um Route Handler não passa pelo layout do app — então não herda
 * o CSS global. Por isso os estilos vão embutidos aqui, replicando a
 * aparência do produto em vez de deixar a página crua.
 */

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function paginaRecusa(titulo: string, mensagem: string, dica?: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Radar</title>
<style>
  :root {
    --marca: #2563eb; --marca-escura: #1d4ed8;
    --tinta: #0f172a; --tinta-suave: #64748b; --tinta-tenue: #94a3b8;
    --fundo: #f8fafc; --superficie: #fff; --borda: #e2e8f0;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center;
    justify-content: center; padding: 24px; background: var(--fundo);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .cartao {
    max-width: 420px; width: 100%; padding: 32px 28px; text-align: center;
    background: var(--superficie); border: 1px solid var(--borda);
    border-radius: 14px; box-shadow: 0 10px 34px rgba(15, 23, 42, .08);
  }
  .marca {
    font-size: 15px; font-weight: 800; color: var(--marca);
    letter-spacing: -.02em; margin-bottom: 18px;
  }
  h1 { font-size: 19px; font-weight: 800; color: var(--tinta); margin: 0 0 10px; }
  p { font-size: 14px; line-height: 1.6; color: var(--tinta-suave); margin: 0 0 8px; }
  .dica { font-size: 13px; color: var(--tinta-tenue); margin-bottom: 22px; }
  a {
    display: inline-block; padding: 11px 22px; border-radius: 8px;
    background: var(--marca); color: #fff; font-size: 14px; font-weight: 700;
    text-decoration: none;
  }
  a:hover { background: var(--marca-escura); }
</style>
</head>
<body>
  <div class="cartao">
    <div class="marca">Radar</div>
    <h1>${escapar(titulo)}</h1>
    ${mensagem ? `<p>${escapar(mensagem)}</p>` : ''}
    ${dica ? `<p class="dica">${escapar(dica)}</p>` : ''}
    ${mensagem ? '<a href="/login">Ir para o login</a>' : ''}
  </div>
</body>
</html>`;
}
