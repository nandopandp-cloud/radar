import { redirect } from 'next/navigation';
import { App } from '@/components/App';
import { sessaoAtual } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Pagina() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/login');

  return (
    <App
      sessao={{
        id: sessao.sub,
        nome: sessao.nome,
        email: sessao.email,
        perfil: sessao.perfil,
      }}
    />
  );
}
