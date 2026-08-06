import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hashCode(code: string) {
  return crypto.createHmac("sha256", process.env.OTP_PEPPER!).update(code).digest("hex");
}

export async function POST(req: Request) {
  const { email, code, password, userData } = await req.json();

  if (!email || !code || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: record } = await supabaseAdmin
    .from("otp_codes")
    .select("*")
    .eq("email", email)
    .gte("expires_at", new Date().toISOString())
    .single();

  if (!record) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  if (record.attempts >= 5) {
    return NextResponse.json(
      { error: "Too many incorrect attempts. Please request a new code." },
      { status: 429 }
    );
  }

  const submittedHash = hashCode(code);

  if (record.code_hash !== submittedHash) {
    await supabaseAdmin
      .from("otp_codes")
      .update({ attempts: record.attempts + 1 })
      .eq("id", record.id);
    return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
  }

  // Code is correct — create the confirmed user now
  const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userData,
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  await supabaseAdmin.from("otp_codes").delete().eq("id", record.id);

  return NextResponse.json({ success: true, user: user.user });
}