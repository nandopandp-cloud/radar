import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sessaoAtual } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * A equipe — exclusivo de administradores.
 *
 * A lista expõe e-mails, perfis e a carga de cada pessoa; um analista não
 * precisa disso e não deve enxergar o time. A interface já esconde a aba
 * Equipe dele, e esta rota fecha o caminho por trás.
 */
export async function GET() {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  if (sessao.perfil !== 'ADMIN') {
    return NextResponse.json({ erro: 'Apenas administradores veem a equipe.' }, { status: 403 });
  }

  const usuarios = await prisma.usuario.findMany({
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      email: true,
      equipe: true,
      perfil: true,
      ativo: true,
      criadoEm: true,
      _count: { select: { demandas: true } },
    },
  });

  return NextResponse.json(usuarios);
}

export async function POST(req: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  if (sessao.perfil !== 'ADMIN') {
    return NextResponse.json({ erro: 'Apenas administradores criam contas.' }, { status: 403 });
  }

  const corpo = await req.json().catch(() => null);
  if (!corpo) return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 });

  const nome = String(corpo.nome ?? '').trim();
  const email = String(corpo.email ?? '').trim().toLowerCase();
  const senha = String(corpo.senha ?? '');

  if (!nome) return NextResponse.json({ erro: 'Informe o nome.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ erro: 'E-mail inválido.' }, { status: 400 });
  }
  if (senha.length < 5) {
    return NextResponse.json({ erro: 'A senha precisa de ao menos 5 caracteres.' }, { status: 400 });
  }

  if (await prisma.usuario.findUnique({ where: { email } })) {
    return NextResponse.json({ erro: 'Já existe uma conta com este e-mail.' }, { status: 409 });
  }

  const usuario = await prisma.usuario.create({
    data: {
      nome,
      email,
      senhaHash: await bcrypt.hash(senha, 10),
      equipe: String(corpo.equipe ?? '').trim() || null,
      perfil: corpo.perfil === 'ADMIN' ? 'ADMIN' : 'ANALISTA',
    },
    select: { id: true, nome: true, email: true, equipe: true, perfil: true, ativo: true },
  });

  return NextResponse.json(usuario, { status: 201 });
}
