import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import TopBar from '@/components/shared/TopBar';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ácrono Arquitectura',
  description: 'Gestión interna Ácrono Arquitectura',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={poppins.variable}>
      <body className="font-sans">
        <TopBar />
        <main>{children}</main>
      </body>
    </html>
  );
}
