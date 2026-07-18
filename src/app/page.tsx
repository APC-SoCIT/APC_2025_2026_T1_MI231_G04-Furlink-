import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PublicLandingPage from '@/components/PublicLandingPage';

export default async function IndexPage() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ 
    cookies: () => cookieStore as any 
  });
  
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return <PublicLandingPage />;
  }

  // DEBUG: Check what metadata exists
  console.log("User metadata:", session.user.user_metadata);

  const role = session.user.user_metadata?.role;

  // If role is missing, default to pet_owner or handle error
  if (role === 'service_provider') {
    redirect('/service_provider');
  } else {
    redirect('/pet_owner');
  }
}