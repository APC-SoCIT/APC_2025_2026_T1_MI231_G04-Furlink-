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

/**
 * Standard Furlink Branded Email Template Wrapper
 */
function wrapEmailTemplate(brandTitleHtml, bodyContentHtml) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .email-wrapper {
      background-color: #fefdf6;
      max-width: 520px;
      margin: 30px auto;
      padding: 35px;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }
    .header {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }
    .logo-img {
      height: 38px;
      vertical-align: middle;
      margin-right: 10px;
    }
    .brand-title {
      font-size: 26px;
      font-weight: bold;
      color: #3b429f;
      vertical-align: middle;
      margin: 0;
    }
    .brand-title span {
      font-style: italic;
    }
    .divider {
      border: none;
      border-top: 1px solid #e0ded6;
      margin: 20px 0 25px 0;
    }
    .instruction-text {
      color: #3b429f;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 25px;
    }
    .social-section {
      margin-top: 30px;
    }
    .social-title {
      color: #3b429f;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .social-icons img {
      width: 28px;
      height: 28px;
      margin-right: 12px;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <img src="https://ofmqtoeqgcbubkrclqxh.supabase.co/storage/v1/object/public/email-assests/furkink-logo.png" alt="FurLink Logo" class="logo-img" />
      <span class="brand-title">${brandTitleHtml}</span>
    </div>

    <hr class="divider" />

    <div class="instruction-text">
      ${bodyContentHtml}
    </div>

    <div class="social-section">
      <div class="social-title">Stay connected with us.</div>
      <div class="social-icons">
        <a href="https://www.facebook.com/profile.php?id=61576298152992" target="_blank">
          <img src="https://ofmqtoeqgcbubkrclqxh.supabase.co/storage/v1/object/public/email-assests/facebook-logo.png" alt="Facebook" />
        </a>
        <a href="https://www.instagram.com/furbnb_startup/" target="_blank">
          <img src="https://ofmqtoeqgcbubkrclqxh.supabase.co/storage/v1/object/public/email-assests/instagram-logo.png" alt="Instagram" />
        </a>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

function getEmailContent(item) {
  const type = item.type;
  const msg = item.message || '';
  const title = item.title || 'Notification - furlink';

  switch (type) {
    case 'account_reactivation_notice':
      return {
        subject: 'Welcome Back! Account Re-activated - furlink',
        html: wrapEmailTemplate('Account Re-activated', `<p>${msg}</p>`),
      };
    case 'account_deactivation_notice':
      return {
        subject: 'Account Deactivation Confirmation - furlink',
        html: wrapEmailTemplate('Account Deactivated', `<p>${msg}</p>`),
      };
    case 'account_suspension':
      return {
        subject: 'Important: Account Suspension Notice - furlink',
        html: wrapEmailTemplate('Account Suspended', `<p>${msg}</p>`),
      };
    case 'account_suspension_lifted':
      return {
        subject: 'Good News: Account Suspension Lifted - furlink',
        html: wrapEmailTemplate('Account Suspension Lifted', `<p>${msg}</p>`),
      };
    case 'account_warning':
      return {
        subject: 'Important: Account Warning Notice - furlink',
        html: wrapEmailTemplate('Account Warning Issued', `<p>${msg}</p>`),
      };
    default:
      return {
        subject: `${title} - furlink`,
        html: wrapEmailTemplate(title, `<p>${msg}</p>${item.link ? `<p><a href="${item.link}">View details on furlink</a></p>` : ''}`),
      };
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const item = payload.record;

    if (!item || item.emailed_at !== null) {
      return NextResponse.json({ success: true, message: 'Skipped or already emailed.' });
    }

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(item.user_id);

    if (userError || !userData || !userData.user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    const userEmail = userData.user.email;
    const emailContent = getEmailContent(item);

    await transporter.sendMail({
      from: `"furlink Notifications" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    await supabase
      .from('notifications')
      .update({ emailed_at: new Date().toISOString() })
      .eq('id', item.id);

    return NextResponse.json({ success: true, sentTo: userEmail });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}