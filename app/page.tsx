import { redirect } from 'next/navigation';
import { Painel } from '@/components/Painel';
import { sessaoAtual } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Pagina() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect('/login');

  return <Painel usuario={{ nome: sessao.nome, email: sessao.email }} />;
}
