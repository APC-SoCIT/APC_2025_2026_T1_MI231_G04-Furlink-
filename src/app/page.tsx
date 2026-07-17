import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PublicLandingPage from '@/components/PublicLandingPage';

export default async function IndexPage() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  
  const { data: { session } } = await supabase.auth.getSession();

  // If unauthorized, showcase custom presentation marketing viewport details
  if (!session) {
    return <PublicLandingPage />;
  }

  // Unified application entry logic
  redirect('/dashboard');
}