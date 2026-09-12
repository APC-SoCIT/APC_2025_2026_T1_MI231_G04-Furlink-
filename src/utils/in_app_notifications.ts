import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type SupabaseClient = ReturnType<typeof createClientComponentClient>;

interface CreateNotificationParams {
  supabase: SupabaseClient;
  userId: string;
  type: string;
  title: string;
  message: string;
}

async function insertNotification({ supabase, userId, type, title, message }: CreateNotificationParams) {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      message,
      read: false,
    });

    if (error) {
      console.error("Failed to insert in-app notification:", error);
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
    title: "New SP Application",
    message: `${username} has submitted an onboarding application for ${businessName}. Please review it for approval.`,
  });
}

/** 2. Admin: Resubmitted SP Application */
export async function notifyAdminResubmittedApplication(supabase: SupabaseClient, adminId: string, username: string, businessName: string) {
  await insertNotification({
    supabase,
    userId: adminId,
    type: "admin_resubmitted_application",
    title: "Resubmitted SP Application",
    message: `${username} has re-submitted their onboarding application for ${businessName}. Please review the updates.`,
  });
}

/** 3. SP: Application Approved or Rejected */
export async function notifySPApplicationStatus(supabase: SupabaseClient, spUserId: string, businessName: string, status: "approved" | "rejected", reason?: string) {
  const isApproved = status === "approved";
  await insertNotification({
    supabase,
    userId: spUserId,
    type: isApproved ? "sp_application_approved" : "sp_application_rejected",
    title: isApproved ? "Application Approved" : "Application Rejected",
    message: isApproved
      ? `Congratulations! Your application for ${businessName} has been approved. You're ready to receive bookings from pet owners.`
      : `Your application for ${businessName} could not be approved due to: ${reason || "unspecified reasons"}. Please update your details and re-submit.`,
  });
}

/** 4. SP: New Booking Request */
export async function notifySPNewBooking(supabase: SupabaseClient, spUserId: string, businessName: string, numPets: number, bookingDate: string, timeslot: string) {
  await insertNotification({
    supabase,
    userId: spUserId,
    type: "sp_new_booking",
    title: "New Booking Request",
    message: `${businessName} received a new booking request for ${numPets} pet(s) on ${bookingDate} at ${timeslot}. Please respond within 24 hours.`,
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
  });
}

/** 6. SP: PO Rescheduled Booking */
export async function notifySPBookingRescheduled(supabase: SupabaseClient, spUserId: string, username: string, bookingDate: string, timeslot: string) {
  await insertNotification({
    supabase,
    userId: spUserId,
    type: "sp_po_rescheduled",
    title: "Booking Rescheduled",
    message: `${username} has updated the schedule for their booking request to ${bookingDate} at ${timeslot}. Please review and respond.`,
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
  });
}

/** 8. PO: SP Cancelled Booking */
export async function notifyPOSPCancelled(supabase: SupabaseClient, poUserId: string, businessName: string, bookingDate: string, timeslot: string) {
  await insertNotification({
    supabase,
    userId: poUserId,
    type: "po_sp_cancelled",
    title: "Booking Cancelled",
    message: `${businessName} has cancelled your scheduled booking for ${bookingDate} at ${timeslot}.`,
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
  });
}

/** 10. SP: New Review/Rating Received */
export async function notifySPNewReview(supabase: SupabaseClient, spUserId: string, username: string, bookingDate: string, timeslot: string) {
  await insertNotification({
    supabase,
    userId: spUserId,
    type: "sp_new_review",
    title: "New Review Received",
    message: `${username} left a review and rating for their completed booking on ${bookingDate} at ${timeslot}.`,
  });
}

/** 11. User (PO/SP): Account Warning Issued */
export async function notifyAccountWarning(supabase: SupabaseClient, userId: string, warningMessage: string) {
  await insertNotification({
    supabase,
    userId: userId,
    type: "account_warning",
    title: "Account Notice",
    message: `Account Notice: A warning has been issued regarding your account. Reason: ${warningMessage}.`,
  });
}