import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('booking_id');

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // 1. Fetch the stored session ID for this booking
    const { data: booking, error: fetchErr } = await supabase
      .from('booking_info')
      .select('paymongo_session_id')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !booking?.paymongo_session_id) {
      return NextResponse.json({ error: 'Booking or session not found' }, { status: 404 });
    }

    const secretKey = process.env.PAYMONGO_SECRET_KEY?.trim();
    if (!secretKey) {
      return NextResponse.json({ error: 'Missing PayMongo secret key' }, { status: 500 });
    }

    const encodedKey = Buffer.from(`${secretKey}:`).toString('base64');

    // 2. Query PayMongo API securely on the server to retrieve session details & payment info
    const paymongoRes = await fetch(
      `https://api.paymongo.com/v1/checkout_sessions/${booking.paymongo_session_id}`,
      {
        headers: {
          accept: 'application/json',
          authorization: `Basic ${encodedKey}`,
        },
      }
    );

    const paymongoData = await paymongoRes.json();

    if (!paymongoRes.ok) {
      return NextResponse.json({ error: 'Failed to query PayMongo session' }, { status: 400 });
    }

    // 3. Extract paymongo_payment_id from the response payments array
    const sessionAttrs = paymongoData.data?.attributes;
    const payments = sessionAttrs?.payments || [];
    const paymentId = payments.length > 0 ? payments[0].id : null;

    // 4. Update the database with pending status and store the paymongo_payment_id
    const { error: dbUpdateErr } = await supabase
      .from('booking_info')
      .update({
        booking_status: 'pending_sp_response',
        ...(paymentId && { paymongo_payment_id: paymentId }),
      })
      .eq('id', bookingId);

    if (dbUpdateErr) {
      console.error('Failed to update booking info with payment ID:', dbUpdateErr.message);
    }

    return NextResponse.json({ success: true, paymentId });
  } catch (error: any) {
    console.error('Verification Route Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}