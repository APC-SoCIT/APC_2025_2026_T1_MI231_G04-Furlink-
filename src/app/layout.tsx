import type { Metadata } from 'next';
import Header from '@/components/Header';
import './globals.css';
import './auth/auth.css';

export const metadata: Metadata = {
  title: 'furlink',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="main-wrapper">
          {children}
        </main>
      </body>
    </html>
  );
}