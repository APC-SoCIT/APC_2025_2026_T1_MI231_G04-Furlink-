/* /src/actions/sendNotification.ts */
'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
// IMPORTANT: Adjust this path if your mailer.ts is not in the src/lib folder
import { transporter } from '@/lib/mailer'; 

interface NotificationPayload {
  profileId: string;
  userEmail: string;
  type: 'booking_status' | 'account_alert' | 'system_alert';
  title: string;
  message: string;
}

export async function sendEmailNotification(payload: NotificationPayload) {
  const supabase = createServerActionClient({ cookies });

  try {
    // 1. Persist notification record to database
    const { data: notificationRecord, error: dbError } = await supabase
      .from('notifications')
      .insert({
        profiles_id: payload.profileId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        delivery_status: 'pending'
      })
      .select()
      .single();

    if (dbError) throw new Error(`Database error: ${dbError.message}`);

    // 2. Dispatch email using your Gmail SMTP transporter
    try {
      await transporter.sendMail({
        from: `"FurLink" <${process.env.GMAIL_SMTP_USER}>`,
        to: payload.userEmail,
        subject: payload.title,
        text: payload.message,
      });
    } catch (emailError: any) {
      // Mark as failed if SMTP dispatch fails
      await supabase
        .from('notifications')
        .update({ delivery_status: 'failed' })
        .eq('id', notificationRecord.id);
        
      throw new Error(`Email dispatch failed: ${emailError.message}`);
    }

    // 3. Mark notification record as successfully sent
    await supabase
      .from('notifications')
      .update({ delivery_status: 'sent' })
      .eq('id', notificationRecord.id);

    return { success: true, notificationId: notificationRecord.id };

  } catch (error: any) {
    console.error("Notification System Error:", error);
    return { success: false, error: error.message };
  }
}