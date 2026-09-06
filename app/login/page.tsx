import { redirect } from 'next/navigation';
import { sessaoAtual } from '@/lib/auth';
import { FormLogin } from '@/components/FormLogin';

export const dynamic = 'force-dynamic';

export default async function PaginaLogin() {
  if (await sessaoAtual()) redirect('/');
  return <FormLogin />;
}
