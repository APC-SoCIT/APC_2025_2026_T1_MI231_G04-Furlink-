import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    const secretCode = process.env.ADMIN_SIGNUP_CODE?.trim();

    if (!secretCode) {
      // Fail closed: if the env var isn't configured, nobody gets through.
      return NextResponse.json(
        { valid: false, error: 'Admin signup is not configured on this environment.' },
        { status: 500 }
      );
    }

    if (typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    const isValid = code.trim() === secretCode;

    return NextResponse.json({ valid: isValid }, { status: 200 });
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid request.' }, { status: 400 });
  }
}