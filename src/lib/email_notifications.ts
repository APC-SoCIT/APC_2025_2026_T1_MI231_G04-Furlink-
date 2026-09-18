import { transporter } from "./mailer";

interface SendNotificationParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Helper function that wraps any email body content into the standard Furlink branded template layout.
 */
function wrapEmailTemplate(brandTitleHtml: string, bodyContentHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .email-wrapper {
      background-color: #fefdf6;
      max-width: 520px;
      margin: 30px auto;
      padding: 35px;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }
    .header {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }
    .logo-img {
      height: 38px;
      vertical-align: middle;
      margin-right: 10px;
    }
    .brand-title {
      font-size: 26px;
      font-weight: bold;
      color: #3b429f;
      vertical-align: middle;
      margin: 0;
    }
    .brand-title span {
      font-style: italic;
    }
    .divider {
      border: none;
      border-top: 1px solid #e0ded6;
      margin: 20px 0 25px 0;
    }
    .instruction-text {
      color: #3b429f;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 25px;
    }
    .social-section {
      margin-top: 30px;
    }
    .social-title {
      color: #3b429f;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .social-icons img {
      width: 28px;
      height: 28px;
      margin-right: 12px;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <!-- Header with Logo and Brand Name -->
    <div class="header">
      <img src="https://ofmqtoeqgcbubkrclqxh.supabase.co/storage/v1/object/public/email-assests/furkink-logo.png" alt="FurLink Logo" class="logo-img" />
      <span class="brand-title">${brandTitleHtml}</span>
    </div>

    <hr class="divider" />

    <!-- Instruction / Body Content -->
    <div class="instruction-text">
      ${bodyContentHtml}
    </div>

    <!-- Social Media Section -->
    <div class="social-section">
      <div class="social-title">Stay connected with us.</div>
      <div class="social-icons">
        <a href="https://www.facebook.com/profile.php?id=61576298152992" target="_blank">
          <img src="https://ofmqtoeqgcbubkrclqxh.supabase.co/storage/v1/object/public/email-assests/facebook-logo.png" alt="Facebook" />
        </a>
        <a href="https://www.instagram.com/furbnb_startup/" target="_blank">
          <img src="https://ofmqtoeqgcbubkrclqxh.supabase.co/storage/v1/object/public/email-assests/instagram-logo.png" alt="Instagram" />
        </a>
      </div>
    </div>
  </div>
</body>
</html>
  `;
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
 * 1. Admin receives an email when a service provider submits a new application.
 */
export async function notifyAdminNewApplicationEmail(
  adminEmail: string,
  username: string,
  businessName: string,
  details: {
    bio: string;
    email: string;
    contact: string;
    street: string;
    barangay: string;
    city: string;
    province: string;
    postalCode: string;
    serviceType: string;
    socialMedia?: string;
    googleMap?: string;
    operatingHoursSummary?: string;
    servicesSummary?: string;
    employeesSummary?: string;
  }
) {
  const subject = "New Service Provider Application Submitted - furlink";
  const brandTitle = `New Service Provider Application`;
  const body = `
    <p>Hello Admin,</p>
    <p><strong>${username}</strong> has submitted a new onboarding application for <strong>${businessName}</strong>.</p>
    
    <p><strong>Submitted Business Details:</strong></p>
    <ul>
      <li><strong>Bio:</strong> ${details.bio}</li>
      <li><strong>Email:</strong> ${details.email} | <strong>Contact:</strong> ${details.contact}</li>
      <li><strong>Address:</strong> ${details.street}, ${details.barangay}, ${details.city}, ${details.province}, ${details.postalCode}</li>
      <li><strong>Service Type:</strong> ${details.serviceType}</li>
      <li><strong>Social Media:</strong> ${details.socialMedia || "N/A"} | <strong>Google Map:</strong> ${details.googleMap || "N/A"}</li>
    </ul>

    <p><strong>Operating Hours:</strong><br/>${details.operatingHoursSummary || "Not provided"}</p>
    <p><strong>Services & Pricing Options:</strong><br/>${details.servicesSummary || "Not provided"}</p>
    <p><strong>Registered Employees:</strong><br/>${details.employeesSummary || "Not provided"}</p>

    <p>Please log in to your furlink admin account to review and approve this application.</p>
  `;

  await sendEmail({ to: adminEmail, subject, html: wrapEmailTemplate(brandTitle, body) });
}

/**
 * 2. Admin receives an email when a service provider re-submits an application.
 */
export async function notifyAdminResubmittedApplicationEmail(
  adminEmail: string,
  username: string,
  businessName: string,
  details: {
    bio: string;
    contact: string;
    street: string;
    city: string;
    updatedRecordsSummary?: string;
  }
) {
  const subject = "Service Provider Application Resubmitted - furlink";
  const brandTitle = `Resubmitted SP Application`;
  const body = `
    <p>Hello Admin,</p>
    <p>Here's another re-application submitted: <strong>${username}</strong> has re-submitted their onboarding application updates for <strong>${businessName}</strong>.</p>
    
    <p><strong>Updated Information Summary:</strong></p>
    <ul>
      <li><strong>Bio:</strong> ${details.bio}</li>
      <li><strong>Contact & Address:</strong> ${details.contact} | ${details.street}, ${details.city}</li>
      <li><strong>Operating Hours, Services, Options & Employees:</strong> ${details.updatedRecordsSummary || "Updated records dynamically listed"}</li>
    </ul>

    <p>Please log in to your furlink admin account to review the latest changes.</p>
  `;

  await sendEmail({ to: adminEmail, subject, html: wrapEmailTemplate(brandTitle, body) });
}

/**
 * 3. SP receives an email when their application is approved or rejected.
 */
export async function notifySPApplicationStatusEmail(
  spEmail: string,
  businessName: string,
  status: "approved" | "rejected",
  reason?: string
) {
  const isApproved = status === "approved";
  const subject = isApproved
    ? "Application Approved! Welcome to furlink"
    : "Update Regarding Your furlink Application";
  const brandTitle = `Application Status Update`;
  
  let body = `<p>Hello,</p>`;
  if (isApproved) {
    body += `
      <p>Congratulations! Your application for <strong>${businessName}</strong> has been approved. You are now ready to receive bookings from pet owners on furlink.</p>
      <p>Please log in to your furlink account to set up your dashboard and manage listings.</p>
    `;
  } else {
    body += `
      <p>Your application for <strong>${businessName}</strong> could not be approved due to: <strong>${reason || "unspecified reasons"}</strong>. Please update your details and re-submit.</p>
      <p>If you have any questions or concerns, please reach out to us through our official channels: email support, Instagram, or Facebook.</p>
      <p>Please log in to your furlink account to update your onboarding details.</p>
    `;
  }

  await sendEmail({ to: spEmail, subject, html: wrapEmailTemplate(brandTitle, body) });
}

/**
 * 4. SP receives an email when they get a new booking with status 'pending_sp_response'.
 */
export async function notifySPNewBookingEmail(
  spEmail: string,
  businessName: string,
  bookingDetails: {
    date: string;
    timeslot: string;
    totalAmount: number;
    petName: string;
    petType: string;
    breed: string;
    gender: string;
    dob: string;
    weight: number;
    calculatedSize: string;
    behavior: string;
    groomingNotes: string;
    vaccineLink?: string;
    illnessLink?: string;
    aiHaircutLink?: string;
    servicesList: string;
  }
) {
  const subject = "New Booking Request Received - furlink";
  const brandTitle = `New Booking Request`;
  const body = `
    <p>Hello,</p>
    <p><strong>${businessName}</strong> received a new booking request. Please respond within 24 hours.</p>
    
    <p><strong>Booking Details:</strong></p>
    <ul>
      <li><strong>Date & Timeslot:</strong> ${bookingDetails.date} at ${bookingDetails.timeslot}</li>
      <li><strong>Total Amount:</strong> ₱${bookingDetails.totalAmount}</li>
      <li><strong>Status:</strong> Pending Response</li>
    </ul>

    <p><strong>Pet(s) Information:</strong></p>
    <ul>
      <li><strong>Name & Type:</strong> ${bookingDetails.petName} (${bookingDetails.petType} - ${bookingDetails.breed})</li>
      <li><strong>Gender & DOB:</strong> ${bookingDetails.gender}, ${bookingDetails.dob}</li>
      <li><strong>Weight & Calculated Size:</strong> ${bookingDetails.weight} kg (${bookingDetails.calculatedSize})</li>
      <li><strong>Behaviors & Notes:</strong> ${bookingDetails.behavior} | Notes: ${bookingDetails.groomingNotes}</li>
      <li><strong>Medical & Media Links:</strong> Vaccine Record ${bookingDetails.vaccineLink ? `<a href="${bookingDetails.vaccineLink}">[Link]</a>` : "N/A"}, Illness Proof ${bookingDetails.illnessLink ? `<a href="${bookingDetails.illnessLink}">[Link]</a>` : "N/A"}, AI Haircut ${bookingDetails.aiHaircutLink ? `<a href="${bookingDetails.aiHaircutLink}">[Link]</a>` : "N/A"}</li>
    </ul>

    <p><strong>Services Availed:</strong><br/>${bookingDetails.servicesList}</p>

    <p>Please log in to your furlink account to manage this request.</p>
  `;

  await sendEmail({ to: spEmail, subject, html: wrapEmailTemplate(brandTitle, body) });
}

/**
 * 5. PO receives an email when SP responds to their booking request.
 */
export async function notifyPOBookingStatusEmail(
  poEmail: string,
  businessName: string,
  bookingStatus: string,
  bookingDetails: {
    date: string;
    timeslot: string;
    totalAmount: number;
    petName: string;
    petType: string;
    servicesAvailed: string;
    vaccineLink?: string;
    illnessLink?: string;
    aiHaircutLink?: string;
  }
) {
  const subject = "Update on Your Booking Request - furlink";
  const brandTitle = `Booking Status Update`;
  const body = `
    <p>Hello,</p>
    <p><strong>${businessName}</strong> has <strong>${bookingStatus}</strong> your booking request.</p>
    
    <p><strong>Booking Summary:</strong></p>
    <ul>
      <li><strong>Date & Timeslot:</strong> ${bookingDetails.date} at ${bookingDetails.timeslot}</li>
      <li><strong>Total Amount:</strong> ₱${bookingDetails.totalAmount}</li>
    </ul>

    <p><strong>Pet(s) & Services Availed:</strong></p>
    <ul>
      <li><strong>Pet Name(s):</strong> ${bookingDetails.petName} (${bookingDetails.petType})</li>
      <li><strong>Services:</strong> ${bookingDetails.servicesAvailed}</li>
      <li><strong>Records:</strong> Vaccine Record ${bookingDetails.vaccineLink ? `<a href="${bookingDetails.vaccineLink}">[Link]</a>` : "N/A"}, Illness Proof ${bookingDetails.illnessLink ? `<a href="${bookingDetails.illnessLink}">[Link]</a>` : "N/A"}, AI Haircut ${bookingDetails.aiHaircutLink ? `<a href="${bookingDetails.aiHaircutLink}">[Link]</a>` : "N/A"}</li>
    </ul>

    <p>Please log in to your furlink account to view full booking details.</p>
  `;

  await sendEmail({ to: poEmail, subject, html: wrapEmailTemplate(brandTitle, body) });
}

/**
 * 6. SP receives an email when PO reschedules the booking request.
 */
export async function notifySPBookingRescheduledEmail(
  spEmail: string,
  username: string,
  rescheduleDetails: {
    date: string;
    timeslot: string;
    petName: string;
    petType: string;
    servicesAvailed: string;
    vaccineLink?: string;
    illnessLink?: string;
    aiHaircutLink?: string;
  }
) {
  const subject = "Booking Schedule Updated - furlink";
  const brandTitle = `Booking Rescheduled`;
  const body = `
    <p>Hello,</p>
    <p><strong>${username}</strong> has updated the schedule for their booking request. Please review and respond.</p>

    <p><strong>New Schedule Details:</strong></p>
    <ul>
      <li><strong>New Date & Timeslot:</strong> ${rescheduleDetails.date} at ${rescheduleDetails.timeslot}</li>
      <li><strong>Pet(s) Involved:</strong> ${rescheduleDetails.petName} (${rescheduleDetails.petType})</li>
      <li><strong>Services Availed:</strong> ${rescheduleDetails.servicesAvailed}</li>
      <li><strong>Records:</strong> Vaccine Record ${rescheduleDetails.vaccineLink ? `<a href="${rescheduleDetails.vaccineLink}">[Link]</a>` : "N/A"}, Illness Proof ${rescheduleDetails.illnessLink ? `<a href="${rescheduleDetails.illnessLink}">[Link]</a>` : "N/A"}, AI Haircut ${rescheduleDetails.aiHaircutLink ? `<a href="${rescheduleDetails.aiHaircutLink}">[Link]</a>` : "N/A"}</li>
    </ul>

    <p>Please log in to your furlink account to respond to the rescheduled request.</p>
  `;

  await sendEmail({ to: spEmail, subject, html: wrapEmailTemplate(brandTitle, body) });
}

/**
 * 7. SP receives an email when PO cancels the booking.
 */
export async function notifySPBookingCancelledEmail(
  spEmail: string,
  username: string,
  bookingDate: string,
  timeslot: string,
  petName: string,
  petType: string,
  services: string
) {
  const subject = "Booking Cancelled by Pet Owner - furlink";
  const brandTitle = `Booking Cancelled`;
  const body = `
    <p>Hello,</p>
    <p><strong>${username}</strong> has cancelled their booking scheduled for <strong>${bookingDate}</strong> at <strong>${timeslot}</strong>.</p>
    
    <p><strong>Cancelled Booking Summary:</strong></p>
    <ul>
      <li><strong>Pet(s):</strong> ${petName} (${petType})</li>
      <li><strong>Services:</strong> ${services}</li>
    </ul>

    <p>Please log in to your furlink account to view your updated schedule.</p>
  `;

  await sendEmail({ to: spEmail, subject, html: wrapEmailTemplate(brandTitle, body) });
}

/**
 * 8. PO receives an email when SP cancels the booking.
 */
export async function notifyPOSPCancelledEmail(
  poEmail: string,
  businessName: string,
  bookingDate: string,
  timeslot: string,
  petName: string,
  petType: string,
  services: string
) {
  const subject = "Notice: Booking Cancelled - furlink";
  const brandTitle = `Booking Cancelled`;
  const body = `
    <p>Hello,</p>
    <p><strong>${businessName}</strong> has cancelled your scheduled booking for <strong>${bookingDate}</strong> at <strong>${timeslot}</strong>.</p>
    
    <p><strong>Booking Summary:</strong></p>
    <ul>
      <li><strong>Pet(s):</strong> ${petName} (${petType})</li>
      <li><strong>Services:</strong> ${services}</li>
    </ul>

    <p>Please log in to your furlink account for more information.</p>
  `;

  await sendEmail({ to: poEmail, subject, html: wrapEmailTemplate(brandTitle, body) });
}

/**
 * 9. PO receives an email when SP completes the booking and assigns an employee.
 */
export async function notifyPOBookingCompletedEmail(
  poEmail: string,
  employeeFirstName: string,
  employeeLastName: string,
  businessName: string,
  bookingDate: string,
  timeslot: string,
  petName: string,
  petType: string,
  services: string,
  vaccineLink?: string,
  illnessLink?: string,
  aiHaircutLink?: string
) {
  const subject = "Your Booking Has Been Completed - furlink";
  const brandTitle = `Booking Completed`;
  const body = `
    <p>Hello,</p>
    <p><strong>${employeeFirstName} ${employeeLastName}</strong> from <strong>${businessName}</strong> completed your booking on <strong>${bookingDate}</strong> at <strong>${timeslot}</strong>.</p>
    
    <p><strong>Completed Service Summary:</strong></p>
    <ul>
      <li><strong>Pet(s):</strong> ${petName} (${petType})</li>
      <li><strong>Services Availed:</strong> ${services}</li>
      <li><strong>Records/Media:</strong> Vaccine Record ${vaccineLink ? `<a href="${vaccineLink}">[Link]</a>` : "N/A"}, Illness Proof ${illnessLink ? `<a href="${illnessLink}">[Link]</a>` : "N/A"}, AI Haircut ${aiHaircutLink ? `<a href="${aiHaircutLink}">[Link]</a>` : "N/A"}</li>
    </ul>

    <p>Please log in to your furlink account to share your feedback and rate your experience!</p>
  `;

  await sendEmail({ to: poEmail, subject, html: wrapEmailTemplate(brandTitle, body) });
}

/**
 * 10. SP receives an email when PO provides feedback (rating/comment).
 */
export async function notifySPFeedbackReceivedEmail(
  spEmail: string,
  username: string,
  bookingDate: string,
  timeslot: string,
  overallRating: number,
  staffRating: number | null,
  comment: string | null
) {
  const subject = "New Review and Rating Received - furlink";
  const brandTitle = `New Review Received`;
  const body = `
    <p>Hello,</p>
    <p><strong>${username}</strong> left a review and rating for their completed booking on <strong>${bookingDate}</strong> at <strong>${timeslot}</strong>.</p>
    
    <p><strong>Feedback Breakdown:</strong></p>
    <ul>
      <li><strong>Overall Rating:</strong> ${overallRating} / 5 stars</li>
      ${staffRating !== null ? `<li><strong>Staff Rating:</strong> ${staffRating} / 5 stars</li>` : ""}
      ${comment ? `<li><strong>Comment:</strong> "${comment}"</li>` : ""}
    </ul>

    <p>Please log in to your furlink account to view all client feedback on your dashboard.</p>
  `;

  await sendEmail({ to: spEmail, subject, html: wrapEmailTemplate(brandTitle, body) });
}

/**
 * 11A. PO/SP receives an email when Admin issues a warning.
 */
export async function notifyAccountWarningEmail(recipientEmail: string, warningMessage: string) {
  const subject = "Important: Account Warning Notice - furlink";
  const brandTitle = `Account Warning Issued`;
  const body = `
    <p>Hello,</p>
    <p>Account Notice: A formal warning has been issued regarding your furlink account.</p>
    
    <p><strong>Warning Reason:</strong><br/>"${warningMessage}"</p>
    
    <p>Please review our community guidelines to ensure your account remains in good standing.</p>
    <p>Please log in to your furlink account to manage your profile settings.</p>
  `;

  await sendEmail({ to: recipientEmail, subject, html: wrapEmailTemplate(brandTitle, body) });
}

/**
 * 11B. PO/SP receives an email when Admin issues an account suspension.
 */
export async function notifyAccountSuspensionEmail(
  recipientEmail: string,
  warningsHistoryList: string,
  suspendedUntil: string
) {
  const formattedDate = new Date(suspendedUntil).toLocaleString();
  const subject = "Important: Account Suspension Notice - furlink";
  const brandTitle = `Account Suspended`;
  const body = `
    <p>Hello,</p>
    <p>Account Notice: Your furlink account has been suspended due to accumulated policy infractions. It will last until <strong>${formattedDate}</strong>.</p>
    
    <p><strong>Triggering Warnings History:</strong></p>
    <ul>
      ${warningsHistoryList}
    </ul>
    <p>(All prior active warnings that triggered this suspension are logged above)</p>

    <p>Please log in to your furlink account to review your account status or contact support via our official channels.</p>
  `;

  await sendEmail({ to: recipientEmail, subject, html: wrapEmailTemplate(brandTitle, body) });
}

/**
 * 11C. PO/SP receives an email when account suspension is lifted.
 */
export async function notifyAccountSuspensionLiftedEmail(
  recipientEmail: string,
  reason: string,
  liftedAt: string
) {
  const formattedDate = new Date(liftedAt).toLocaleString();
  const subject = "Good News: Account Suspension Lifted - furlink";
  const brandTitle = `Account Suspension Lifted`;
  const body = `
    <p>Hello,</p>
    <p>Your account suspension due to <strong>${reason}</strong> was lifted at <strong>${formattedDate}</strong>. You may now use your account as usual.</p>
    <p>Please log in to your furlink account to resume your activities.</p>
  `;

  await sendEmail({ to: recipientEmail, subject, html: wrapEmailTemplate(brandTitle, body) });
}

/**
 * 12 & 13. PO/SP receives an email when they deactivate or re-activate their account.
 */
export async function notifyAccountStatusChangeEmail(recipientEmail: string, action: "deactivated" | "reactivated") {
  const isDeactivated = action === "deactivated";
  const subject = isDeactivated
    ? "Account Deactivation Confirmation - furlink"
    : "Welcome Back! Account Re-activated - furlink";
  const brandTitle = isDeactivated ? `Account Deactivated` : `Account Re-activated`;

  let body = `<p>Hello,</p>`;
  if (isDeactivated) {
    body += `
      <p>Your furlink account has been successfully deactivated. If you did not initiate this request, please contact our support team immediately.</p>
      <p>You can re-activate your account at any time simply by logging back in.</p>
      <p>Please log in to your furlink account if you wish to reverse this action.</p>
    `;
  } else {
    body += `
      <p>Your furlink account has been successfully re-activated. You now have full access to your profile, listings, and bookings once again.</p>
      <p>Please log in to your furlink account to resume your activities.</p>
    `;
  }

  await sendEmail({ to: recipientEmail, subject, html: wrapEmailTemplate(brandTitle, body) });
}