import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
 
export async function POST(req: Request) {
  try {
    const { amount, description, bookingId, isPayNow } = await req.json(); 
 
    const secretKey = process.env.PAYMONGO_SECRET_KEY?.trim(); 
 
    if (!secretKey) {
      return NextResponse.json(
        { error: 'PAYMONGO_SECRET_KEY is missing in your environment variables.' },
        { status: 500 }
      );
    }
 
    if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
      return NextResponse.json(
        { error: 'Invalid secret key format. PAYMONGO_SECRET_KEY must start with sk_test_ or sk_live_.' },
        { status: 500 }
      );
    }

    // Initialize Supabase client early for live slot verification
    const supabase = createRouteHandlerClient({ cookies }); 

    // 1. Fetch target booking details to verify live availability before opening payment gateway
    const { data: currentBooking, error: bookingErr } = await supabase
      .from('booking_info')
      .select('sp_id, booking_date, booking_timeslot, pet_count, booking_status')
      .eq('id', bookingId)
      .single();

    if (bookingErr || !currentBooking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    // 2. Re-verify slot capacity right before generating the PayMongo link
    const activeStatuses = ['pending_sp_response', 'to pay', 'approved', 'paid', 'processing'];
    const { data: conflictingBookings } = await supabase
      .from('booking_info')
      .select('pet_count')
      .eq('sp_id', currentBooking.sp_id)
      .eq('booking_date', currentBooking.booking_date)
      .eq('booking_timeslot', currentBooking.booking_timeslot)
      .in('booking_status', activeStatuses)
      .neq('id', bookingId);

    const totalBooked = (conflictingBookings || []).reduce((sum, b) => sum + (b.pet_count || 1), 0);

    const dayOfWeek = new Date(currentBooking.booking_date).toLocaleDateString('en-US', { weekday: 'long' });
    const { data: opHour } = await supabase
      .from('sp_operating_hours')
      .select('slot_capacity')
      .eq('sp_id', currentBooking.sp_id)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (!opHour || (totalBooked + (currentBooking.pet_count || 1)) > opHour.slot_capacity) {
      // Cancel this booking session since another user filled the slot in the background
      await supabase.from('booking_info').update({ booking_status: 'cancelled' }).eq('id', bookingId);
      return NextResponse.json(
        { error: 'This time slot was just fully booked by another user. Please select a different slot.' },
        { status: 400 }
      );
    }
 
    const encodedKey = Buffer.from(`${secretKey}:`).toString('base64'); 
    const authHeader = `Basic ${encodedKey}`; 
 
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'; 
    const proto = req.headers.get('x-forwarded-proto') || 'https'; 
    const baseUrl = `${proto}://${host}`; 
 
    const successUrl = isPayNow
      ? `${baseUrl}/pet_owner/manage_bookings?status=success&booking_id=${bookingId}`
      : `${baseUrl}/pet_owner/book_appointment/booking_form?status=success&booking_id=${bookingId}`; 
 
    const cancelUrl = isPayNow
      ? `${baseUrl}/pet_owner/manage_bookings?status=failed&booking_id=${bookingId}`
      : `${baseUrl}/pet_owner/book_appointment/booking_form?status=failed&booking_id=${bookingId}`; 
 
    const amountInCentavos = Math.round(amount * 100); 
 
    const paymongoOptions = { 
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        authorization: authHeader,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            line_items: [
              {
                currency: 'PHP',
                amount: amountInCentavos,
                description: description || 'Pet Grooming Appointment',
                name: 'Grooming Service',
                quantity: 1,
              },
            ],
            payment_method_types: ['card', 'gcash', 'paymaya'],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
              booking_id: bookingId,
            },
          },
        },
      }),
    };
 
    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', paymongoOptions); 
    const data = await response.json(); 
 
    if (!response.ok) {
      console.error('PayMongo API Error Details:', data); 
      return NextResponse.json(
        { error: data.errors?.[0]?.detail || 'PayMongo session creation failed.' },
        { status: response.status }
      );
    }
 
    const checkoutSessionId = data.data.id; 
    const checkoutUrl = data.data.attributes.checkout_url; 
 
    // Save paymongo_session_id immediately into database 
    const { error: updateErr } = await supabase 
      .from('booking_info')
      .update({ paymongo_session_id: checkoutSessionId })
      .eq('id', bookingId);
 
    if (updateErr) {
      console.error('Failed to save paymongo_session_id:', updateErr.message); 
    }
 
    return NextResponse.json({ checkoutUrl, sessionId: checkoutSessionId }); 
  } catch (error: any) {
    console.error('Checkout Route Exception:', error); 
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 }); 
  }
}