import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type SupabaseClient = ReturnType<typeof createClientComponentClient>;

interface CreateNotificationParams {
  supabase: SupabaseClient;
  userId: string;
  type: string;
  title: string;
  message: string;
  channel?: 'all' | 'email_only' | 'ui_only';
  read?: boolean;
}

async function insertNotification({ supabase, userId, type, title, message, channel = 'all', read = false }: CreateNotificationParams) {
  try {
    const isDeactivation = type === "account_deactivation_notice" || type === "account_reactivation_notice";
    const finalChannel = isDeactivation ? 'email_only' : channel;
    const finalRead = isDeactivation ? true : read;

    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      message,
      read: finalRead,
      channel: finalChannel, 
      emailed_at: null, 
    });

    if (error) {
      console.error("Failed to insert notification:", error);
    }
  } catch (err) {
    console.error("Error in insertNotification:", err);
  }
}

/** 1. Admin: New SP Application */
export async function notifyAdminNewApplication(supabase: SupabaseClient, adminId: string, username: string, businessName: string) {
  await insertNotification({
    supabase,
    userId: adminId,
    type: "admin_new_application",
    title: "New Service Provider Application",
    message: `${username} has submitted an onboarding application for ${businessName}. Please review it for approval.`,
    channel: 'all',
  });
}

/** 2. Admin: Resubmitted SP Application */
export async function notifyAdminResubmittedApplication(supabase: SupabaseClient, adminId: string, username: string, businessName: string) {
  await insertNotification({
    supabase,
    userId: adminId,
    type: "admin_resubmitted_application",
    title: "Resubmitted Service Provider Application",
    message: `Here's another re-application submitted: ${username} has re-submitted their onboarding application for ${businessName}. Please review the updates.`,
    channel: 'all',
  });
}

/** 3. SP: Application Approved or Rejected */
export async function notifySPApplicationStatus(supabase: SupabaseClient, spUserId: string, businessName: string, status: "approved" | "rejected") {
  const isApproved = status === "approved";
  
  let rejectionReason = "unspecified reasons";
  if (!isApproved) {
    const { data: spInfo } = await supabase
      .from("sp_general_info")
      .select("registration_rejection_reason")
      .eq("profiles_id", spUserId)
      .maybeSingle();
    
    if (spInfo?.registration_rejection_reason) {
      rejectionReason = spInfo.registration_rejection_reason;
    }
  }

  await insertNotification({
    supabase,
    userId: spUserId,
    type: isApproved ? "sp_application_approved" : "sp_application_rejected",
    title: isApproved ? "Application Approved" : "Application Rejected",
    message: isApproved
      ? `Congratulations! Your application for ${businessName} has been approved. You're ready to receive bookings from pet owners.`
      : `Your application for ${businessName} could not be approved due to: ${rejectionReason}. Please update your details and re-submit.`,
    channel: 'all',
  });
}

/** 4. SP: New Booking Request */
export async function notifySPNewBooking(supabase: SupabaseClient, spUserId: string, businessName: string, numPets: number, bookingDate: string, timeslot: string) {
  await insertNotification({
    supabase,
    userId: spUserId,
    type: "sp_new_booking",
    title: "New Booking Request",
    message: `${businessName} received a new booking request for ${numPets} pet(s) on ${bookingDate} at ${timeslot}. Please respond to the booking request within 24 hours.`,
    channel: 'all',
  });
}

/** 5. PO: Booking Status Update from SP */
export async function notifyPOBookingStatus(supabase: SupabaseClient, poUserId: string, businessName: string, bookingStatus: string, numPets: number, bookingDate: string, timeslot: string) {
  await insertNotification({
    supabase,
    userId: poUserId,
    type: "po_booking_status_update",
    title: "Booking Status Update",
    message: `${businessName} has ${bookingStatus} your booking request for ${numPets} pet(s) on ${bookingDate} at ${timeslot}.`,
    channel: 'all',
  });
}

/** 6. SP: PO Rescheduled Booking */
export async function notifySPBookingRescheduled(supabase: SupabaseClient, spUserId: string, username: string, bookingDate: string, timeslot: string) {
  await insertNotification({
    supabase,
    userId: spUserId,
    type: "sp_po_rescheduled",
    title: "Booking Rescheduled",
    message: `${username} has updated the schedule for their booking request to ${bookingDate} at ${timeslot}. Please respond to the booking request within 24 hours.`,
    channel: 'all',
  });
}

/** 7. SP: PO Cancelled Booking */
export async function notifySPBookingCancelled(supabase: SupabaseClient, spUserId: string, username: string, bookingDate: string, timeslot: string) {
  await insertNotification({
    supabase,
    userId: spUserId,
    type: "sp_po_cancelled",
    title: "Booking Cancelled",
    message: `${username} has cancelled their booking scheduled for ${bookingDate} at ${timeslot}.`,
    channel: 'all',
  });
}

/** 8. PO: SP Cancelled Booking (Guarded against duplicates using actual booking statuses) */
export async function notifyPOSPCancelled(supabase: SupabaseClient, poUserId: string, businessName: string, bookingDate: string, timeslot: string, bookingId?: string) {
  if (bookingId) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", poUserId)
      .eq("type", "po_booking_status_update")
      .or("message.ilike.%declined%,message.ilike.%cancelled_by_sp%,message.ilike.%cancelled_by_po%")
      .maybeSingle();

    if (existing) {
      return; // Skip duplicate if status update notification already exists
    }
  }

  await insertNotification({
    supabase,
    userId: poUserId,
    type: "po_sp_cancelled",
    title: "Booking Cancelled",
    message: `${businessName} has cancelled your scheduled booking for ${bookingDate} at ${timeslot}.`,
    channel: 'all',
  });
}

/** 9. PO: Booking Completed by Employee */
export async function notifyPOBookingCompleted(supabase: SupabaseClient, poUserId: string, employeeFirstName: string, employeeLastName: string, businessName: string, bookingDate: string, timeslot: string) {
  await insertNotification({
    supabase,
    userId: poUserId,
    type: "po_booking_completed",
    title: "Booking Completed",
    message: `${employeeFirstName} ${employeeLastName} from ${businessName} completed your booking on ${bookingDate} at ${timeslot}. Tap to share your feedback!`,
    channel: 'all',
  });
}

/** 10. SP: New Review/Rating Received */
export async function notifySPNewReview(supabase: SupabaseClient, spUserId: string, username: string, bookingDate: string, timeslot: string) {
  await insertNotification({
    supabase,
    userId: spUserId,
    type: "sp_new_review",
    title: "New Review Received",
    message: `${username} left a feedback for their completed booking on ${bookingDate} at ${timeslot}.`,
    channel: 'all',
  });
}

/** 11. User (PO/SP): Account Warning Issued */
export async function notifyAccountWarning(supabase: SupabaseClient, userId: string, warningMessage: string) {
  await insertNotification({
    supabase,
    userId: userId,
    type: "account_warning",
    title: "Account Notice",
    message: `Account Notice: A warning has been issued regarding your account due to ${warningMessage}.`,
    channel: 'all',
  });
}

/** 12. Account Suspension Issued */
export async function notifyAccountSuspension(supabase: SupabaseClient, userId: string, reason: string, suspendedUntil: string) {
  const formattedDate = new Date(suspendedUntil).toLocaleString();
  await insertNotification({
    supabase,
    userId: userId,
    type: "account_suspension",
    title: "Account Suspended",
    message: `Account Notice: A suspension has been issued regarding your account due to ${reason} and it will last until ${formattedDate}.`,
    channel: 'all',
    read: true,
  });
}

/** 13. Account Suspension Lifted */
export async function notifyAccountSuspensionLifted(supabase: SupabaseClient, userId: string, reason: string, liftedAt: string) {
  const formattedDate = new Date(liftedAt).toLocaleString();
  await insertNotification({
    supabase,
    userId: userId,
    type: "account_suspension_lifted",
    title: "Account Suspension Lifted",
    message: `Your account suspension due to ${reason} was lifted at ${formattedDate}. You may now use your account as usual.`,
    channel: 'all',
    read: true,
  });
}

/** 14. Account Deactivation / Reactivation (Email Only, Hidden from UI Bell) */
export async function notifyAccountStatusEmailOnly(supabase: SupabaseClient, userId: string, action: "deactivated" | "reactivated") {
  const isDeactivated = action === "deactivated";
  await insertNotification({
    supabase,
    userId: userId,
    type: isDeactivated ? "account_deactivation_notice" : "account_reactivation_notice",
    title: isDeactivated ? "Account Deactivated" : "Account Re-activated",
    message: isDeactivated 
      ? "Your furlink account has been successfully deactivated." 
      : "Your furlink account has been successfully re-activated.",
    channel: 'email_only', 
    read: true,            
  });
}