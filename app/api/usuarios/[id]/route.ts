import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sessaoAtual } from '@/lib/auth';
import { validarAvatar } from '@/lib/avatar';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });

  // Cada um edita o próprio cadastro; o admin edita qualquer um.
  const proprio = sessao.sub === id;
  if (!proprio && sessao.perfil !== 'ADMIN') {
    return NextResponse.json({ erro: 'Sem permissão.' }, { status: 403 });
  }

  const corpo = await req.json().catch(() => null);
  if (!corpo) return NextResponse.json({ erro: 'JSON inválido.' }, { status: 400 });

  const dados: Record<string, unknown> = {};
  if (typeof corpo.nome === 'string' && corpo.nome.trim()) dados.nome = corpo.nome.trim();
  if (typeof corpo.equipe === 'string') dados.equipe = corpo.equipe.trim() || null;
  // avatar: string vazia ou null remove a foto; qualquer outro valor é validado.
  if ('avatar' in corpo) {
    if (corpo.avatar === null || corpo.avatar === '') {
      dados.avatar = null;
    } else {
      const check = validarAvatar(corpo.avatar);
      if (!check.ok) return NextResponse.json({ erro: check.erro }, { status: 400 });
      dados.avatar = check.valor;
    }
  }

  if (typeof corpo.senha === 'string' && corpo.senha) {
    if (corpo.senha.length < 5) {
      return NextResponse.json({ erro: 'A senha precisa de ao menos 5 caracteres.' }, { status: 400 });
    }
    dados.senhaHash = await bcrypt.hash(corpo.senha, 10);
  }

  // Perfil e situação são decisões de administração.
  if (sessao.perfil === 'ADMIN') {
    if (corpo.perfil === 'ADMIN' || corpo.perfil === 'ANALISTA') dados.perfil = corpo.perfil;
    if (typeof corpo.ativo === 'boolean') {
      // Evita o admin trancar a si mesmo para fora.
      if (proprio && corpo.ativo === false) {
        return NextResponse.json({ erro: 'Você não pode desativar a si mesmo.' }, { status: 400 });
      }
      dados.ativo = corpo.ativo;
    }
  }

  try {
    const usuario = await prisma.usuario.update({
      where: { id },
      data: dados,
      select: { id: true, nome: true, email: true, equipe: true, perfil: true, ativo: true, avatar: true },
    });
    return NextResponse.json(usuario);
  } catch {
    return NextResponse.json({ erro: 'Usuário não encontrado.' }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  if (sessao.perfil !== 'ADMIN') {
    return NextResponse.json({ erro: 'Apenas administradores removem contas.' }, { status: 403 });
  }
  if (sessao.sub === id) {
    return NextResponse.json({ erro: 'Você não pode excluir a si mesmo.' }, { status: 400 });
  }

  try {
    await prisma.usuario.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: 'Usuário não encontrado.' }, { status: 404 });
  }
}
