import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// Safety check to verify environment variables are loading correctly
if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.error('❌ CRITICAL ERROR: GMAIL_USER or GMAIL_APP_PASSWORD is missing from environment variables!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

// Map notification scenarios to custom subjects and templates
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

async function pollNotifications() {
  try {
    console.log('Polling notifications table...');

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .is('emailed_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase query error:', error.message);
      return;
    }

    console.log(`Found ${notifications ? notifications.length : 0} pending notifications.`);

    if (!notifications || notifications.length === 0) return;

    for (const item of notifications) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(item.user_id);

      if (userError || !userData || !userData.user) {
        console.error(`Error fetching auth user for user_id ${item.user_id}:`, userError ? userError.message : 'User not found');
        continue;
      }

      const userEmail = userData.user.email;

      if (userEmail) {
        const emailContent = getEmailContent(item);

        await transporter.sendMail({
          from: `"furlink Notifications" <${GMAIL_USER}>`,
          to: userEmail,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        console.log(`Email notification sent for event type: ${item.type} (ID: ${item.id}) to ${userEmail}`);
      } else {
        console.warn(`No email found for user_id: ${item.user_id}`);
      }

      await supabase
        .from('notifications')
        .update({ emailed_at: new Date().toISOString() })
        .eq('id', item.id);
    }
  } catch (err) {
    console.error('Polling worker error:', err);
  }
}

console.log('Starting furlink email notification polling worker...');
setInterval(pollNotifications, 10000);