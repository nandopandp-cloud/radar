'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { MarcaRadar } from '@/components/Logo';
import { CampoSenha } from '@/components/CampoSenha';
import { RodapeCreditos } from '@/components/RodapeCreditos';

function IconeEnvelope() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="M3.5 6.5 12 13l8.5-6.5" />
    </svg>
  );
}

function IconeEscudo() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5 4 5.5v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10v-6L12 2.5Z" />
      <path d="M9 12l2 2 4-4.5" />
    </svg>
  );
}

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
      <div className="login-vitrine">
        <div className="login-vitrine-marca">
          <MarcaRadar size={64} />
        </div>
        <h2 className="login-vitrine-titulo">Mais organização para o seu dia.</h2>
        <p className="login-vitrine-slogan">
          Acompanhe suas demandas, cumpra prazos e evolua com o time.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/radar-simbolo.png" alt="" className="login-vitrine-radar" />
      </div>

      <div className="login-lado">
        <div className="login-formulario">
          <h1 className="login-titulo">Bem-vindo ao Radar</h1>
          <p className="login-sub">Acesse sua conta para continuar.</p>

          <form onSubmit={entrar}>
            <div className="campo login-campo-icone">
              <span className="login-campo-icone-simbolo"><IconeEnvelope /></span>
              <input
                id="email"
                type="email"
                className="entrada"
                placeholder="voce@msaconsultoriacontabil.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div className="campo login-campo-icone">
              <span className="login-campo-icone-simbolo"><IconeEscudo /></span>
              <CampoSenha
                id="senha"
                placeholder="Sua senha"
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
              {entrando ? <><span className="girando">⏳</span> Entrando…</> : <>Entrar →</>}
            </button>
          </form>

          <div className="login-seguranca">
            <IconeEscudo />
            <div>Seus dados estão seguros com a gente.</div>
          </div>
        </div>
        <RodapeCreditos />
      </div>
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
