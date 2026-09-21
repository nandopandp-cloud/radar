import { redirect } from 'next/navigation';
import { App } from '@/components/App';
import { sessaoAtual } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function Pagina() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/login');

  /*
   * O avatar vem do banco, não do JWT: uma imagem base64 estouraria o limite
   * de tamanho do cookie, e a foto ficaria congelada até o próximo login.
   */
  const usuario = await prisma.usuario.findUnique({
    where: { id: sessao.sub },
    select: { avatar: true },
  });

  return (
    <App
      sessao={{
        id: sessao.sub,
        nome: sessao.nome,
        email: sessao.email,
        perfil: sessao.perfil,
        avatar: usuario?.avatar ?? null,
        personificadoPor: sessao.personificadoPor ?? null,
      }}
    />
  );
}
