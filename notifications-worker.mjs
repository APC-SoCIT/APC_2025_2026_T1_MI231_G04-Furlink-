import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

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

/**
 * Standard Furlink Branded Email Template Wrapper (from email_notifications_2.ts)
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
    <!-- Header with Logo and Brand Name -->
    <div class="header">
      <img src="https://ofmqtoeqgcbubkrclqxh.supabase.co/storage/v1/object/public/email-assests/furkink-logo.png" alt="FurLink Logo" class="logo-img" />
      <span class="brand-title">${brandTitleHtml}</span>
    </div>

    <hr class="divider" />

    <!-- Instruction / Body Content -->
    <div class="instruction-text">
      ${bodyContentHtml}
    </div>

    <!-- Social Media Section -->
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

/**
 * Determines the exact subject and structured HTML body using the templates from email_notifications_2.ts[cite: 5].
 */
function getEmailContent(item) {
  const type = item.type;
  const msg = item.message || '';

  switch (type) {
    case 'admin_new_application':
      return {
        subject: "New Service Provider Application Submitted - furlink",
        html: wrapEmailTemplate("New Service Provider Application", `
          <p>Hello Admin,</p>
          <p>${msg}</p>
          <p>Please log in to your furlink admin account to review and approve this application.</p>
        `)
      };

    case 'admin_resubmitted_application':
      return {
        subject: "Service Provider Application Resubmitted - furlink",
        html: wrapEmailTemplate("Resubmitted SP Application", `
          <p>Hello Admin,</p>
          <p>${msg}</p>
          <p>Please log in to your furlink admin account to review the latest changes.</p>
        `)
      };

    case 'sp_application_approved':
      return {
        subject: "Application Approved! Welcome to furlink",
        html: wrapEmailTemplate("Application Status Update", `
          <p>Hello,</p>
          <p>${msg}</p>
          <p>Please log in to your furlink account to view your dashboard and manage listings.</p>
        `)
      };

    case 'sp_application_rejected':
      return {
        subject: "Update Regarding Your furlink Application",
        html: wrapEmailTemplate("Application Status Update", `
          <p>Hello,</p>
          <p>${msg}</p>
          <p>If you have any questions or concerns, please reach out to us through our official channels: email support, Instagram, or Facebook.</p>
          <p>Please log in to your furlink account to update your onboarding details.</p>
        `)
      };

    case 'sp_new_booking':
      return {
        subject: "New Booking Request Received - furlink",
        html: wrapEmailTemplate("New Booking Request", `
          <p>Hello,</p>
          <p>${msg}</p>
          <p>Please log in to your furlink account to manage this request.</p>
        `)
      };

    case 'po_booking_status_update':
      return {
        subject: "Update on Your Booking Request - furlink",
        html: wrapEmailTemplate("Booking Status Update", `
          <p>Hello,</p>
          <p>${msg}</p>
          <p>Please log in to your furlink account to view full booking details.</p>
        `)
      };

    case 'sp_po_rescheduled':
      return {
        subject: "Booking Schedule Updated - furlink",
        html: wrapEmailTemplate("Booking Rescheduled", `
          <p>Hello,</p>
          <p>${msg}</p>
          <p>Please log in to your furlink account to respond to the rescheduled request.</p>
        `)
      };

    case 'sp_po_cancelled':
      return {
        subject: "Booking Cancelled by Pet Owner - furlink",
        html: wrapEmailTemplate("Booking Cancelled", `
          <p>Hello,</p>
          <p>${msg}</p>
          <p>Please log in to your furlink account to view your updated schedule.</p>
        `)
      };

    case 'po_sp_cancelled':
      return {
        subject: "Notice: Booking Cancelled - furlink",
        html: wrapEmailTemplate("Booking Cancelled", `
          <p>Hello,</p>
          <p>${msg}</p>
          <p>Please log in to your furlink account for more information.</p>
        `)
      };

    case 'po_booking_completed':
      return {
        subject: "Your Booking Has Been Completed - furlink",
        html: wrapEmailTemplate("Booking Completed", `
          <p>Hello,</p>
          <p>${msg}</p>
          <p>Please log in to your furlink account to share your feedback and rate your experience!</p>
        `)
      };

    case 'sp_new_review':
      return {
        subject: "New Review and Rating Received - furlink",
        html: wrapEmailTemplate("New Review Received", `
          <p>Hello,</p>
          <p>${msg}</p>
          <p>Please log in to your furlink account to view all client feedback on your dashboard.</p>
        `)
      };

    case 'account_warning':
      return {
        subject: "Important: Account Warning Notice - furlink",
        html: wrapEmailTemplate("Account Warning Issued", `
          <p>Hello,</p>
          <p>Account Notice: A formal warning has been issued regarding your furlink account.</p>
          <p><strong>Warning Details:</strong> ${msg}</p>
          <p>Please review our community guidelines to ensure your account remains in good standing.</p>
          <p>Please log in to your furlink account to manage your profile settings.</p>
        `)
      };

    case 'account_suspension':
      return {
        subject: "Important: Account Suspension Notice - furlink",
        html: wrapEmailTemplate("Account Suspended", `
          <p>Hello,</p>
          <p>${msg}</p>
          <p>Please log in to your furlink account to review your account status or contact support via our official channels.</p>
        `)
      };

    case 'account_suspension_lifted':
      return {
        subject: "Good News: Account Suspension Lifted - furlink",
        html: wrapEmailTemplate("Account Suspension Lifted", `
          <p>Hello,</p>
          <p>${msg}</p>
          <p>Please log in to your furlink account to resume your activities.</p>
        `)
      };

    case 'account_deactivation_notice':
      return {
        subject: "Account Deactivation Confirmation - furlink",
        html: wrapEmailTemplate("Account Deactivated", `
          <p>Hello,</p>
          <p>${msg}</p>
          <p>If you did not initiate this request, please contact our support team immediately.</p>
          <p>You can re-activate your account at any time simply by logging back in.</p>
        `)
      };

    case 'account_reactivation_notice':
      return {
        subject: "Welcome Back! Account Re-activated - furlink",
        html: wrapEmailTemplate("Account Re-activated", `
          <p>Hello,</p>
          <p>${msg}</p>
          <p>You now have full access to your profile, listings, and bookings once again.</p>
          <p>Please log in to your furlink account to resume your activities.</p>
        `)
      };

    default:
      return {
        subject: `${item.title || 'Notification'} - furlink`,
        html: wrapEmailTemplate(item.title || 'Notification', `<p>${msg}</p>`)
      };
  }
}

async function pollNotifications() {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .is('emailed_at', null)
      .order('created_at', { ascending: true });

    if (error || !notifications || notifications.length === 0) return;

    for (const item of notifications) {
      const { data: userData } = await supabase.auth.admin.getUserById(item.user_id);
      if (!userData || !userData.user?.email) continue;

      const userEmail = userData.user.email;
      const emailContent = getEmailContent(item);

      await transporter.sendMail({
        from: `"furlink Notifications" <${GMAIL_USER}>`,
        to: userEmail,
        subject: emailContent.subject,
        html: emailContent.html,
      });

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