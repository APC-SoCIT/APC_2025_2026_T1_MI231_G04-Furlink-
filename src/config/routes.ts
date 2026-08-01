// config/routes.ts

export const ROUTES = {
  HOME: "/",
  AUTH: {
    LOGIN: "/login",
    REGISTER: "/register",
    MANAGE_ACCOUNT: "/both_sp_po/manage_account",
  },
  PET_OWNER: {
    DASHBOARD: "/pet_owner/manage_bookings",
  },
  SERVICE_PROVIDER: {
    ONBOARDING: "/service_provider/manage_listing/onboarding",
    SUMMARY_DASHBOARD: "/service_provider/sp_dashboard",
    MANAGE_LISTING: "/service_provider/manage_listing",
    EDIT_LISTING: "/service_provider/manage_listing/edit_listing",
    EDIT_BUSINESS_INFO: "/service_provider/manage_listing/edit_business_info",
  },
  SHARED: {
    SWITCH_BUSINESS: "/switch-business",
  }
} as const;