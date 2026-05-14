import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Altor — Gestão',
  description: 'Sistema de gestão físico-financeiro Altor Incorporações',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-bg text-text antialiased min-h-screen">{children}</body>
    </html>
  );
}
