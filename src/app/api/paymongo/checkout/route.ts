import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, description, bookingId } = await req.json();

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

    const encodedKey = Buffer.from(`${secretKey}:`).toString('base64');
    const authHeader = `Basic ${encodedKey}`;

    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${proto}://${host}`;

    const successUrl = `${baseUrl}/pet_owner/book_appointment/booking_form?status=success`;
    const cancelUrl = `${baseUrl}/pet_owner/book_appointment/booking_form?status=failed`;

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
            payment_method_types: ['card', 'gcash', 'paymaya', 'qrph'],
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

    return NextResponse.json({ checkoutUrl: data.data.attributes.checkout_url });
  } catch (error: any) {
    console.error('Checkout Route Exception:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}