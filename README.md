# furlink

A pet-care booking platform that connects **pet owners** with **grooming service providers**, with an AI booking assistant, online payments, and email notifications.

---

## Features

**Pet owners**
- Browse and book appointments with nearby providers (Leaflet map, location picker, reviews)
- Manage pets and bookings
- AI Booking Assistant for slot inquiries and booking through chat
- AI haircut preview generation for pets
- Online payment via PayMongo

**Service providers**
- Onboarding, waiver, and business listing management (info, media, hours and staff, services)
- Business and service-provider dashboards with analytics

**Admins**
- Dashboard with KPI cards, filters, and PDF report export
- User and service-provider detail pages, booking history, warnings, and suspensions

**Platform**
- Supabase authentication with route protection (middleware)
- Session timeout handling
- Branded email notifications sent through Gmail SMTP

---

## Tech Stack

| Area | Tools |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Backend / Auth / DB | Supabase (`@supabase/supabase-js`, auth helpers) |
| AI | Gemini (booking assistant) with OpenAI fallback; OpenAI / Pollinations for haircut previews |
| Payments | PayMongo |
| Email | Nodemailer (Gmail SMTP) |
| Maps | Leaflet, react-leaflet |
| Charts / Reports | Chart.js, react-chartjs-2, @react-pdf/renderer |

---

## Getting Started

### Prerequisites
- Node.js 22 (the included devcontainer uses Node 22)
- A Supabase project
- API keys for the services you want to run (see below)

### Install and run

```bash
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

You can also open the repo in a devcontainer (VS Code or Codespaces). It installs dependencies automatically and forwards port 3000.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run linting |

---

## Environment Variables

Create a `.env.local` file in the project root. It is already git-ignored, so never commit it.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
GEMINI_API_KEY=
OPENAI_API_KEY=
POLLINATIONS_API_KEY=

# Payments
PAYMONGO_SECRET_KEY=

# Email (Gmail SMTP with an app password)
GMAIL_USER=
GMAIL_APP_PASSWORD=
GMAIL_SMTP_USER=
GMAIL_SMTP_APP_PASSWORD=
```

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client (browser and middleware) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase access (API routes, cron, worker). **Keep secret.** |
| `GEMINI_API_KEY` | AI Booking Assistant |
| `OPENAI_API_KEY` | AI Booking Assistant fallback and haircut preview |
| `POLLINATIONS_API_KEY` | Haircut preview generation |
| `PAYMONGO_SECRET_KEY` | Checkout and payment verification |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Email cron route and notifications worker |
| `GMAIL_SMTP_USER`, `GMAIL_SMTP_APP_PASSWORD` | Mailer in `src/lib/mailer.ts` |

---

## Project Structure

```
furlink/
├── README.md
├── middleware.ts
├── next-env.d.ts
├── notifications-worker.mjs
├── package.json
├── tsconfig.json
├── .last_processed_timestamp.json
├── src/
│   ├── global.d.ts
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── (loggedIn)/
│   │   │   ├── layout.tsx
│   │   │   ├── admin/
│   │   │   │   └── dashboard/
│   │   │   │       ├── page.module.css
│   │   │   │       ├── page.tsx
│   │   │   │       ├── _components/
│   │   │   │       │   ├── AdminReportDocument.tsx
│   │   │   │       │   ├── AdminReportModal.tsx
│   │   │   │       │   ├── DashboardFilters.tsx
│   │   │   │       │   ├── DashboardTable.tsx
│   │   │   │       │   └── KpiCards.tsx
│   │   │   │       ├── _types/
│   │   │   │       │   └── index.ts
│   │   │   │       ├── hooks/
│   │   │   │       │   └── useDashboardData.ts
│   │   │   │       ├── sp_details/
│   │   │   │       │   ├── page.module.css
│   │   │   │       │   ├── page.tsx
│   │   │   │       │   ├── _components/
│   │   │   │       │   │   ├── ActionModals.tsx
│   │   │   │       │   │   ├── EmployeesSection.tsx
│   │   │   │       │   │   ├── GeneralInfoSection.tsx
│   │   │   │       │   │   ├── OperatingHoursSection.tsx
│   │   │   │       │   │   ├── PageHeader.tsx
│   │   │   │       │   │   └── ServicesSection.tsx
│   │   │   │       │   ├── _hooks/
│   │   │   │       │   │   └── useProviderDetails.ts
│   │   │   │       │   └── _types/
│   │   │   │       │       └── index.ts
│   │   │   │       └── user_details/
│   │   │   │           ├── page.module.css
│   │   │   │           ├── page.tsx
│   │   │   │           ├── _components/
│   │   │   │           │   ├── AdminActionsCard.tsx
│   │   │   │           │   ├── AdminModals.tsx
│   │   │   │           │   ├── BookingDetailsModal.tsx
│   │   │   │           │   ├── BookingHistoryTable.tsx
│   │   │   │           │   ├── DateRangeFilter.tsx
│   │   │   │           │   ├── HistoryDetailsModal.tsx
│   │   │   │           │   ├── PageHeader.tsx
│   │   │   │           │   ├── PersonalInfoCard.tsx
│   │   │   │           │   ├── SPBookingDetailsModal.tsx
│   │   │   │           │   ├── SPBookingHistoryTable.tsx
│   │   │   │           │   ├── SuspensionBanner.tsx
│   │   │   │           │   └── WarningSuspensionHistoryTable.tsx
│   │   │   │           ├── _hooks/
│   │   │   │           │   ├── useBookingHistoryPage.ts
│   │   │   │           │   ├── useHistoryPage.ts
│   │   │   │           │   ├── useSpBookings.ts
│   │   │   │           │   └── useUserDetails.ts
│   │   │   │           ├── _types/
│   │   │   │           │   └── index.ts
│   │   │   │           ├── _utils/
│   │   │   │           │   └── buildHistoryEntries.ts
│   │   │   │           ├── bookings/
│   │   │   │           │   └── page.tsx
│   │   │   │           ├── history/
│   │   │   │           │   └── page.tsx
│   │   │   │           └── sp_bookings/
│   │   │   │               └── page.tsx
│   │   │   ├── both_sp_po/
│   │   │   │   └── manage_account/
│   │   │   │       ├── manage_account.css
│   │   │   │       ├── page.tsx
│   │   │   │       ├── components/
│   │   │   │       │   └── StraightEditableField.tsx
│   │   │   │       ├── utils/
│   │   │   │       │   └── warningUtils.ts
│   │   │   │       └── validation/
│   │   │   │           └── manageAccountValidation.ts
│   │   │   ├── pet_owner/
│   │   │   │   ├── browse_listing.css
│   │   │   │   ├── page.tsx
│   │   │   │   ├── book_appointment/
│   │   │   │   │   ├── book_appointment.css
│   │   │   │   │   ├── booking_widget.tsx
│   │   │   │   │   ├── capacity_modal.css
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── PetOwnerMap.tsx
│   │   │   │   │   ├── reviews_section.css
│   │   │   │   │   ├── ReviewsSection.tsx
│   │   │   │   │   ├── ServiceLocationMap.tsx
│   │   │   │   │   └── booking_form/
│   │   │   │   │       ├── booking_form.css
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       ├── types.ts
│   │   │   │   │       ├── validation.ts
│   │   │   │   │       ├── components/
│   │   │   │   │       │   ├── AIHaircutPreview.tsx
│   │   │   │   │       │   ├── CancellationPolicyNotice.tsx
│   │   │   │   │       │   ├── CapacityModal.tsx
│   │   │   │   │       │   ├── FailedModal.tsx
│   │   │   │   │       │   ├── HeaderBar.tsx
│   │   │   │   │       │   ├── InfoSummaryCard.tsx
│   │   │   │   │       │   ├── PayLaterSuccessModal.tsx
│   │   │   │   │       │   ├── PetFormCard.tsx
│   │   │   │   │       │   ├── SuccessModal.tsx
│   │   │   │   │       │   └── SummaryModal.tsx
│   │   │   │   │       ├── hooks/
│   │   │   │   │       │   ├── useActiveBookingId.ts
│   │   │   │   │       │   ├── useAiHaircutPreview.ts
│   │   │   │   │       │   ├── useBookingActions.ts
│   │   │   │   │       │   ├── useBookingModals.ts
│   │   │   │   │       │   ├── useBookingParams.ts
│   │   │   │   │       │   ├── useFreshUser.ts
│   │   │   │   │       │   ├── usePaymentCooldown.ts
│   │   │   │   │       │   ├── usePaymentRedirect.ts
│   │   │   │   │       │   ├── usePetBreeds.ts
│   │   │   │   │       │   ├── usePetForms.ts
│   │   │   │   │       │   ├── usePetValidation.ts
│   │   │   │   │       │   ├── useRegisteredPets.ts
│   │   │   │   │       │   ├── useServices.ts
│   │   │   │   │       │   └── useSlotCapacity.ts
│   │   │   │   │       ├── services/
│   │   │   │   │       │   └── bookingService.ts
│   │   │   │   │       └── utils/
│   │   │   │   │           ├── aiHaircutApi.ts
│   │   │   │   │           ├── dateFormat.ts
│   │   │   │   │           ├── haircutPrompt.ts
│   │   │   │   │           ├── imageUtils.ts
│   │   │   │   │           ├── petFormFactory.ts
│   │   │   │   │           ├── pricing.ts
│   │   │   │   │           └── storage.ts
│   │   │   │   ├── manage_bookings/
│   │   │   │   │   ├── manage_bookings.css
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── tab_counters.css
│   │   │   │   │   ├── modals/
│   │   │   │   │   │   ├── BookingDetailsModal.tsx
│   │   │   │   │   │   ├── CancelBookingModal.tsx
│   │   │   │   │   │   ├── PaymentFailedModal.tsx
│   │   │   │   │   │   ├── PaymentSuccessModal.tsx
│   │   │   │   │   │   ├── RescheduleModal.tsx
│   │   │   │   │   │   ├── RescheduleSuccessModal.tsx
│   │   │   │   │   │   └── SubmitRatingModal.tsx
│   │   │   │   │   ├── types/
│   │   │   │   │   │   └── booking.ts
│   │   │   │   │   └── utils/
│   │   │   │   │       └── bookingFormatters.ts
│   │   │   │   └── manage_pet/
│   │   │   │       ├── manage_pet.css
│   │   │   │       ├── page.tsx
│   │   │   │       ├── petFormValidation.ts
│   │   │   │       └── add_pet/
│   │   │   │           ├── add_pet.css
│   │   │   │           └── page.tsx
│   │   │   └── service_provider/
│   │   │       ├── business-dashboard/
│   │   │       │   ├── business-dashboard.module.css
│   │   │       │   ├── page.tsx
│   │   │       │   ├── type.ts
│   │   │       │   ├── utils.ts
│   │   │       │   └── components/
│   │   │       │       ├── ReportPreviewModal.tsx
│   │   │       │       ├── ReviewsSidebarWidget.tsx
│   │   │       │       ├── ServiceBreakdown.tsx
│   │   │       │       ├── Sidebar.tsx
│   │   │       │       ├── BusinessPerformance/
│   │   │       │       │   ├── index.tsx
│   │   │       │       │   └── components/
│   │   │       │       │       ├── AverageBookings.tsx
│   │   │       │       │       ├── BookedHours.tsx
│   │   │       │       │       └── PeakDays.tsx
│   │   │       │       ├── CustomerInsights/
│   │   │       │       │   ├── index.tsx
│   │   │       │       │   └── components/
│   │   │       │       │       ├── CustomerTypeChart.tsx
│   │   │       │       │       ├── DogBreedsChart.tsx
│   │   │       │       │       ├── PetSizeChart.tsx
│   │   │       │       │       ├── PetTypeChart.tsx
│   │   │       │       │       └── TopCustomersChart.tsx
│   │   │       │       ├── pdf-reports/
│   │   │       │       │   ├── BusinessReportPDF.tsx
│   │   │       │       │   ├── CustomerInsightPDF.tsx
│   │   │       │       │   └── SalesReportPDF.tsx
│   │   │       │       └── SalesPerformance/
│   │   │       │           ├── index.tsx
│   │   │       │           └── components/
│   │   │       │               ├── NewVsReturningChart.tsx
│   │   │       │               ├── OverallSalesChart.tsx
│   │   │       │               ├── RevenueLossChart.tsx
│   │   │       │               └── ServicePerformanceChart.tsx
│   │   │       ├── manage_listing/
│   │   │       │   ├── manage_listing.css
│   │   │       │   ├── page.tsx
│   │   │       │   ├── edit_business_info/
│   │   │       │   │   └── page.tsx
│   │   │       │   ├── edit_hours_staff/
│   │   │       │   │   └── page.tsx
│   │   │       │   ├── edit_listing/
│   │   │       │   │   └── page.tsx
│   │   │       │   ├── edit_media/
│   │   │       │   │   └── page.tsx
│   │   │       │   └── onboarding/
│   │   │       │       ├── ConfirmationModal.tsx
│   │   │       │       ├── constants.ts
│   │   │       │       ├── page.css
│   │   │       │       ├── page.tsx
│   │   │       │       ├── services.css
│   │   │       │       ├── components/
│   │   │       │       │   ├── ApplicationStatusView.tsx
│   │   │       │       │   ├── BusinessInfoForm.tsx
│   │   │       │       │   ├── PricingTable.tsx
│   │   │       │       │   └── ServiceCard.tsx
│   │   │       │       └── hooks/
│   │   │       │           ├── useFileUploads.ts
│   │   │       │           ├── useServiceManager.ts
│   │   │       │           └── useValidation.ts
│   │   │       ├── sp_dashboard/
│   │   │       │   ├── page.tsx
│   │   │       │   ├── sp_dashboard.module.css
│   │   │       │   ├── type.ts
│   │   │       │   ├── utils.ts
│   │   │       │   └── components/
│   │   │       │       ├── BookingDetailsModal.tsx
│   │   │       │       ├── BookingsTable.tsx
│   │   │       │       ├── CalendarModal.tsx
│   │   │       │       ├── DashboardHeader.tsx
│   │   │       │       └── StatusTabs.tsx
│   │   │       └── waiver/
│   │   │           └── page.tsx
│   │   ├── (public)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── about/
│   │   │   │   └── page.tsx
│   │   │   ├── auth/
│   │   │   │   ├── auth.css
│   │   │   │   ├── validation-db.ts
│   │   │   │   ├── admin_first_login/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── admin_signup/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── forgot_password/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── signup/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── validation/
│   │   │   │       ├── adminSignupValidation.ts
│   │   │   │       ├── forgotPasswordValidation.ts
│   │   │   │       ├── loginValidation.ts
│   │   │   │       └── signUpValidation.ts
│   │   │   ├── privacy_policy/
│   │   │   │   └── page.tsx
│   │   │   └── terms_and_conditions/
│   │   │       └── page.tsx
│   │   └── api/
│   │       ├── admin_signup_auth/
│   │       │   └── route.ts
│   │       ├── ai-booking-assistant/
│   │       │   └── book/
│   │       │       └── route.ts
│   │       ├── cron/
│   │       │   └── send-emails/
│   │       │       └── route.js
│   │       ├── generate-haircut-preview/
│   │       │   └── route.ts
│   │       └── paymongo/
│   │           ├── checkout/
│   │           │   └── route.ts
│   │           └── verify/
│   │               └── route.ts
│   ├── components/
│   │   ├── ai_booking_assistant.css
│   │   ├── AIBookingAssistant.tsx
│   │   ├── AIBookingFlow.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── HeaderLoggedIn.tsx
│   │   ├── HeaderResolver.tsx
│   │   ├── LocationPicker.tsx
│   │   ├── NotificationsDropdown.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── PublicLandingPage.tsx
│   │   └── SessionTimeoutModal.tsx
│   ├── config/
│   │   └── routes.ts
│   ├── context/
│   │   └── AccountStatusContext.tsx
│   ├── hooks/
│   │   ├── useDashboardData.ts
│   │   └── useSessionTimeout.ts
│   ├── lib/
│   │   ├── aiBookingServer.ts
│   │   ├── mailer.ts
│   │   ├── paymentAttempts.ts
│   │   └── supabase.ts
│   └── utils/
│       ├── analyticsCalculations.ts
│       └── geocoding.ts
└── .devcontainer/
    └── devcontainer.json
```

---

## Notifications

Email notifications are sent in two ways:

- **Cron route:** `GET /api/cron/send-emails`, which can be called by a scheduler.
- **Worker:** run `node notifications-worker.mjs` with the environment variables above set.

---

## Security Notes

- Never commit `.env*` files or expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- Use Gmail **app passwords**, not your account password.

---

## Team

| Role/s | Name |
| --- | --- |
| Project Manager & Developer | Lalainne C. Andaya |
| Lead Developer | Atasha Frances Gayle S. Doria |
| Developer | Feliz Angelica P. Satling |
| Lead QA & Developer | Michelle Reina B. Pineda |
