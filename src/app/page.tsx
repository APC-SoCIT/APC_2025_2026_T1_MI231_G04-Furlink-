import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PublicLandingPage from '@/components/PublicLandingPage';

export default async function IndexPage() {
  // 1. Await the cookies promise
  const cookieStore = await cookies();
  
  // 2. Wrap it in a way that satisfies the older library
  // We use 'as any' to bypass the TypeScript type mismatch error
  const supabase = createServerComponentClient({ 
    cookies: () => cookieStore as any 
  });
  
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return <PublicLandingPage />;
  }

  redirect('/dashboard');
}