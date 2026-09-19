'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import HeaderResolver from '@/components/HeaderResolver';
import Footer from '@/components/Footer';

const SHARED_AUTH_ROUTES = ['/terms_and_conditions', '/privacy_policy'];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSharedAuthRoute = SHARED_AUTH_ROUTES.includes(pathname);

  return (
    <>
      {isSharedAuthRoute ? <HeaderResolver /> : <Header />}
      <main className="main-wrapper">
        {children}
      </main>
      <Footer />
    </>
  );
}