'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { LogoRadar } from '@/components/Logo';

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const destino = params.get('de') || '/';

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (entrando) return;
    setErro(null);
    setEntrando(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.erro ?? 'Não foi possível entrar.');
      router.replace(destino);
      router.refresh();
    } catch (erro) {
      setErro(erro instanceof Error ? erro.message : 'Erro ao entrar.');
      setEntrando(false);
    }
  }

  return (
    <div className="login-tela">
      <div className="login-cartao">
        <div className="login-marca">
          <LogoRadar size={44} />
          <div>
            <div className="marca-nome">Radar</div>
            <div className="login-sub">Gestão de prazos da MSA</div>
          </div>
        </div>

        <form onSubmit={entrar}>
          <div className="campo">
            <label className="rotulo" htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              className="entrada"
              placeholder="voce@msa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div className="campo">
            <label className="rotulo" htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              className="entrada"
              placeholder="••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {erro && (
            <div className="aviso aviso-erro" style={{ marginBottom: 14 }}>
              <span className="aviso-icone">✕</span>
              <div>{erro}</div>
            </div>
          )}

          <button type="submit" className="btn btn-primario btn-bloco" disabled={entrando}>
            {entrando ? <><span className="girando">⏳</span> Entrando…</> : 'Entrar'}
          </button>
        </form>
      </div>

      <div className="login-rodape">Radar MSA · acesso restrito</div>
    </div>
  );
}

export function FormLogin() {
  return (
    <Suspense fallback={<div className="login-tela" />}>
      <Formulario />
    </Suspense>
  );
}
