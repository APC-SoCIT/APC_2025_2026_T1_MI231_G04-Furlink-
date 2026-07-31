import HeaderLoggedIn from '@/components/HeaderLoggedIn';

export default function LoggedInLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HeaderLoggedIn />
      <main className="main-wrapper">
        {children}
      </main>
    </>
  );
}