import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ isAdmin: false }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check profiles table directly by email
    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('email', cleanEmail)
      .maybeSingle();

    // 2. Fallback: Check auth.users if not found directly in profiles
    if (!profile) {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (!listError && users) {
        const matchedUser = users.find(u => u.email?.toLowerCase() === cleanEmail);
        if (matchedUser) {
          const { data: profileById } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', matchedUser.id)
            .maybeSingle();
          profile = profileById;
        }
      }
    }

    const role = profile?.role?.toLowerCase();
    const isAdmin = role === 'admin';

    // If verified as admin, trigger 6-digit OTP dispatch
    if (isAdmin) {
      const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: false },
      });

      if (otpError) {
        return NextResponse.json({ 
          isAdmin: true, 
          error: otpError.message 
        }, { status: 200 });
      }
    }

    return NextResponse.json({ isAdmin }, { status: 200 });
  } catch (err) {
    console.error('Admin auth API error:', err);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}