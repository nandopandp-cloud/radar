import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Radar MSA · Demandas postergadas',
  description:
    'Acompanhe as demandas que não foram trabalhadas no dia e alerte os responsáveis por e-mail.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
