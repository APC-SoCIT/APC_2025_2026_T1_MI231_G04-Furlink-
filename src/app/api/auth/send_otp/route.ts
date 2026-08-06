import { NextResponse } from "next/server";
import crypto from "crypto";
import { transporter } from "@/lib/mailer";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OTP_VALIDITY_MINUTES = 5;
const MAX_RESENDS = 5;
const RESEND_WINDOW_MINUTES = 30;
const RESEND_COOLDOWN_SECONDS = 60;

function hashCode(code: string) {
  return crypto.createHmac("sha256", process.env.OTP_PEPPER!).update(code).digest("hex");
}

function buildOtpEmailHtml(code: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .email-wrapper { background-color: #fefdf6; max-width: 520px; margin: 30px auto; padding: 35px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); }
    .header { display: flex; align-items: center; margin-bottom: 15px; }
    .logo-img { height: 38px; vertical-align: middle; margin-right: 10px; }
    .brand-title { font-size: 26px; font-weight: bold; color: #3b429f; vertical-align: middle; margin: 0; }
    .brand-title span { font-style: italic; }
    .divider { border: none; border-top: 1px solid #e0ded6; margin: 20px 0 25px 0; }
    .instruction-text { color: #3b429f; font-size: 15px; margin-bottom: 25px; }
    .token-container { background-color: #2b5cd9; color: #ffffff; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 0; border-radius: 30px; margin: 25px 0 10px 0; }
    .expiry-text { color: #666666; font-size: 12px; text-align: center; margin-bottom: 25px; }
    .footer-note { color: #555555; font-size: 13px; font-style: italic; margin-bottom: 40px; }
    .social-section { margin-top: 30px; }
    .social-title { color: #3b429f; font-size: 13px; font-weight: 600; margin-bottom: 10px; }
    .social-icons img { width: 28px; height: 28px; margin-right: 12px; vertical-align: middle; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <img src="https://ofmqtoeqgcbubkrclqxh.supabase.co/storage/v1/object/public/email-assests/furkink-logo.png" alt="FurLink Logo" class="logo-img" />
      <span class="brand-title">Welcome to <span>furlink!</span></span>
    </div>
    <hr class="divider" />
    <p class="instruction-text">Please enter this 6-digit code to verify your account:</p>
    <div class="token-container">${code}</div>
    <div class="expiry-text">This code is valid for ${OTP_VALIDITY_MINUTES} minutes.</div>
    <p class="footer-note">If you didn't request this, please ignore this email.</p>
    <div class="social-section">
      <div class="social-title">Stay connected with us.</div>
      <div class="social-icons">
        <a href="https://facebook.com" target="_blank">
          <img src="https://ofmqtoeqgcbubkrclqxh.supabase.co/storage/v1/object/public/email-assests/facebook-logo.png" alt="Facebook" />
        </a>
        <a href="https://instagram.com" target="_blank">
          <img src="https://ofmqtoeqgcbubkrclqxh.supabase.co/storage/v1/object/public/email-assests/instagram-logo.png" alt="Instagram" />
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("otp_codes")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (existing?.verified_at) {
    return NextResponse.json(
      { error: "This email is already verified. Please log in instead." },
      { status: 409 }
    );
  }

  const now = Date.now();
  let resend_count = 1;
  let first_requested_at = new Date(now).toISOString();

  if (existing) {
    const windowStartMs = new Date(existing.first_requested_at).getTime();
    const windowEndMs = windowStartMs + RESEND_WINDOW_MINUTES * 60_000;
    const withinWindow = now < windowEndMs;

    if (withinWindow) {
      if (existing.resend_count >= MAX_RESENDS) {
        const retryAfterMinutes = Math.max(1, Math.ceil((windowEndMs - now) / 60_000));
        return NextResponse.json(
          {
            error: `You've reached the maximum number of code requests. Please try again in ${retryAfterMinutes} minute${retryAfterMinutes === 1 ? "" : "s"}.`,
            retryAfterMinutes,
          },
          { status: 429 }
        );
      }

      const sinceLastSent = now - new Date(existing.last_sent_at).getTime();
      if (sinceLastSent < RESEND_COOLDOWN_SECONDS * 1000) {
        return NextResponse.json(
          { error: "Please wait a moment before requesting another code." },
          { status: 429 }
        );
      }

      resend_count = existing.resend_count + 1;
      first_requested_at = existing.first_requested_at;
    }
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const code_hash = hashCode(code);
  const expires_at = new Date(now + OTP_VALIDITY_MINUTES * 60 * 1000).toISOString();

  const { error: dbError } = await supabaseAdmin.from("otp_codes").upsert(
    {
      email,
      code_hash,
      expires_at,
      attempts: 0,
      resend_count,
      first_requested_at,
      last_sent_at: new Date(now).toISOString(),
      verified_at: null,
    },
    { onConflict: "email" }
  );

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  try {
    await transporter.sendMail({
      from: '"furlink" <logiteh045@gmail.com>',
      to: email,
      subject: "furlink Account Verification Code",
      html: buildOtpEmailHtml(code),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to send email: " + err.message }, { status: 500 });
  }

  const resendsExhausted = resend_count >= MAX_RESENDS;
  const windowEndMs = new Date(first_requested_at).getTime() + RESEND_WINDOW_MINUTES * 60_000;
  const retryAfterMinutes = resendsExhausted
    ? Math.max(1, Math.ceil((windowEndMs - now) / 60_000))
    : null;

  return NextResponse.json({
    success: true,
    validitySeconds: OTP_VALIDITY_MINUTES * 60,
    resendsExhausted,
    retryAfterMinutes,
  });
}