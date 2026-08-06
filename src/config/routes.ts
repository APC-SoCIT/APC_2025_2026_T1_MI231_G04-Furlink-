// config/routes.ts

export const ROUTES = {
  HOME: "/",
  AUTH: {
    LOGIN: "/login",
    REGISTER: "/register",
    FORGOT_PASSWORD: "/forgot_password",
    MANAGE_ACCOUNT: "/both_sp_po/manage_account",
  },
  PET_OWNER: {
    DASHBOARD: "/pet_owner",
    MANAGE_BOOKING: "/pet_owner/manage_bookings",
    MANAGE_PET: "/pet_owner/manage_pet",
  },
  SERVICE_PROVIDER: {
    ONBOARDING: "/service_provider/manage_listing/onboarding",
    SUMMARY_DASHBOARD: "/service_provider/sp_dashboard",
    MANAGE_LISTING: "/service_provider/manage_listing",
    EDIT_LISTING: "/service_provider/manage_listing/edit_listing",
    EDIT_BUSINESS_INFO: "/service_provider/manage_listing/edit_business_info",
  },
  ADMIN: {
    ADMIN_DASHBOARD: "/admin/dashboard",
  },
  SHARED: {
    SWITCH_BUSINESS: "/switch-business",
  }
} as const;