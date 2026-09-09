import { transporter } from "./mailer";

interface SendNotificationParams {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: SendNotificationParams) {
  try {
    await transporter.sendMail({
      from: `"furlink Notifications" <${process.env.GMAIL_SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send notification email:", error);
  }
}

/**
 * 1 & 2. Admin receives an email when a service provider submits or re-submits a new application.
 */
export async function notifyAdminApplicationSubmission(adminEmail: string, businessName: string, isResubmission: boolean) {
  const actionText = isResubmission ? "re-submitted their" : "submitted a new";
  await sendEmail({
    to: adminEmail,
    subject: `[furlink Admin] Service Provider Application ${isResubmission ? "Re-submission" : "Received"}`,
    html: `
      <p>Hello Admin,</p>
      <p>The service provider <strong>${businessName}</strong> has ${actionText} application for review.</p>
    `,
  });
}

/**
 * 3. SP receives an email when their application is approved or rejected.
 */
export async function notifySPApplicationStatus(spEmail: string, businessName: string, status: "approved" | "rejected", reason?: string) {
  const isApproved = status === "approved";
  const subject = `[furlink] Your Application Has Been ${isApproved ? "Approved" : "Rejected"}`;
  
  let html = `
    <p>Hello,</p>
    <p>Your application for <strong>${businessName}</strong> has been <strong>${status}</strong>.</p>
  `;
  
  if (!isApproved && reason) {
    html += `<p><strong>Reason:</strong> ${reason}</p>`;
  }

  await sendEmail({ to: spEmail, subject, html });
}

/**
 * 4. SP receives an email when they get a new booking with status 'pending_sp_response'.
 */
export async function notifySPNewBooking(spEmail: string, bookingId: string, bookingDate: string, timeslot: string) {
  await sendEmail({
    to: spEmail,
    subject: "[furlink] New Booking Request Pending Your Response",
    html: `
      <p>Hello,</p>
      <p>You have received a new booking request (ID: ${bookingId}) scheduled for <strong>${bookingDate}</strong> at <strong>${timeslot}</strong>.</p>
      <p>Please log in to your dashboard to accept or reject this request.</p>
    `,
  });
}

/**
 * 5. PO receives an email when SP responds to their booking request (e.g., approved/rejected/to pay).
 */
export async function notifyPOBookingResponse(poEmail: string, bookingId: string, status: string) {
  await sendEmail({
    to: poEmail,
    subject: `[furlink] Update on Your Booking Request (${status.toUpperCase()})`,
    html: `
      <p>Hello,</p>
      <p>The service provider has updated the status of your booking (ID: ${bookingId}) to: <strong>${status.replace(/_/g, " ")}</strong>.</p>
    `,
  });
}

/**
 * 6. SP receives an email when PO reschedules the date or time of the submitted booking request.
 */
export async function notifySPBookingRescheduled(spEmail: string, bookingId: string, newDate: string, newTimeslot: string) {
  await sendEmail({
    to: spEmail,
    subject: "[furlink] Booking Rescheduled by Pet Owner",
    html: `
      <p>Hello,</p>
      <p>The pet owner has updated the schedule for booking (ID: ${bookingId}).</p>
      <p><strong>New Date:</strong> ${newDate}</p>
      <p><strong>New Timeslot:</strong> ${newTimeslot}</p>
    `,
  });
}

/**
 * 7 & 8. PO/SP cancellation emails.
 * triggered when status becomes 'cancelled'.
 */
export async function notifyBookingCancellation(recipientEmail: string, cancelledBy: "Pet Owner" | "Service Provider", bookingId: string) {
  await sendEmail({
    to: recipientEmail,
    subject: `[furlink] Booking Cancelled by ${cancelledBy}`,
    html: `
      <p>Hello,</p>
      <p>Booking (ID: ${bookingId}) has been cancelled by the ${cancelledBy.toLowerCase()}.</p>
    `,
  });
}

/**
 * 9. PO receives an email when SP completes the booking and assigns an employee.
 */
export async function notifyPOBookingCompleted(poEmail: string, bookingId: string, employeeName: string, employeePosition: string) {
  await sendEmail({
    to: poEmail,
    subject: "[furlink] Your Booking Has Been Completed",
    html: `
      <p>Hello,</p>
      <p>Your booking (ID: ${bookingId}) has been completed successfully!</p>
      <p>It was handled by your assigned staff member: <strong>${employeeName}</strong> (${employeePosition.replace(/_/g, " ")}).</p>
      <p>Please log in to rate your experience and leave feedback.</p>
    `,
  });
}

/**
 * 10. SP receives an email when PO provides feedback (rating/comment).
 */
export async function notifySPFeedbackReceived(spEmail: string, overallRating: number, staffRating: number | null, comment: string | null) {
  await sendEmail({
    to: spEmail,
    subject: "[furlink] New Customer Feedback Received",
    html: `
      <p>Hello,</p>
      <p>A pet owner has left feedback for a recent completed booking:</p>
      <ul>
        <li><strong>Overall Rating:</strong> ${overallRating} / 5 stars</li>
        ${staffRating ? `<li><strong>Staff Rating:</strong> ${staffRating} / 5 stars</li>` : ""}
        ${comment ? `<li><strong>Comment:</strong> "${comment}"</li>` : ""}
      </ul>
    `,
  });
}

/**
 * 11. PO/SP receives an email when Admin issues a warning or suspension.
 */
export async function notifyAdminWarningOrSuspension(recipientEmail: string, type: "warning" | "suspension", message: string, suspendedUntil?: string) {
  const isSuspension = type === "suspension";
  const subject = `[furlink Security] Official Notice: Account ${isSuspension ? "Suspended" : "Warning Issued"}`;

  let html = `
    <p>Hello,</p>
    <p>An administrator has issued a <strong>${type}</strong> against your account.</p>
    <p><strong>Details / Reason:</strong> ${message}</p>
  `;

  if (isSuspension && suspendedUntil) {
    html += `<p><strong>Suspended Until:</strong> ${new Date(suspendedUntil).toLocaleString()}</p>`;
  }

  await sendEmail({ to: recipientEmail, subject, html });
}

/**
 * 12 & 13. PO/SP receives an email when they deactivate or re-activate their account.
 */
export async function notifyAccountStatusChange(recipientEmail: string, action: "deactivated" | "reactivated") {
  const isDeactivated = action === "deactivated";
  await sendEmail({
    to: recipientEmail,
    subject: `[furlink] Account Successfully ${isDeactivated ? "Deactivated" : "Re-activated"}`,
    html: `
      <p>Hello,</p>
      <p>Your furlink account status has been changed to <strong>${action}</strong>.</p>
      ${isDeactivated ? "<p>If you wish to restore your account in the future, you can simply log back in to re-activate it.</p>" : "<p>Welcome back! Your account is fully active again.</p>"}
    `,
  });
}