import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function getEmailContent(item) {
  const type = item.type;
  const msg = item.message || '';
  const title = item.title || 'Notification - furlink';

  switch (type) {
    case 'account_reactivation_notice':
      return {
        subject: 'Welcome Back! Account Re-activated - furlink',
        html: `<h3>Account Re-activated</h3><p>${msg || 'Your furlink account has been successfully re-activated.'}</p>`,
      };
    case 'account_deactivation_notice':
      return {
        subject: 'Account Deactivation Confirmation - furlink',
        html: `<h3>Account Deactivated</h3><p>${msg || 'Your furlink account has been successfully deactivated.'}</p>`,
      };
    default:
      return {
        subject: `${title} - furlink`,
        html: `<h3>${title}</h3><p>${msg}</p>${item.link ? `<p><a href="${item.link}">View details on furlink</a></p>` : ''}`,
      };
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    
    // Supabase webhook passes the newly inserted row under payload.record
    const item = payload.record;

    if (!item || item.emailed_at !== null) {
      return NextResponse.json({ success: true, message: 'Skipped or already emailed.' });
    }

    // 1. Fetch user email securely via Supabase Admin Auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(item.user_id);

    if (userError || !userData || !userData.user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    const userEmail = userData.user.email;
    const emailContent = getEmailContent(item);

    // 2. Send email via Gmail SMTP
    await transporter.sendMail({
      from: `"furlink Notifications" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    // 3. Update the notification row so emailed_at is marked
    await supabase
      .from('notifications')
      .update({ emailed_at: new Date().toISOString() })
      .eq('id', item.id);

    return NextResponse.json({ success: true, sentTo: userEmail });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}