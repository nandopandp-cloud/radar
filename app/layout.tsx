import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Radar · Gestão de prazos da MSA',
  description:
    'Lance suas demandas no calendário e receba alertas por e-mail quando um prazo vencer.',
  icons: { icon: '/icon.png', apple: '/apple-icon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
