// config/routes.ts

export const ROUTES = {
  HOME: "/",
  AUTH: {
    LOGIN: "/login",
    REGISTER: "/register",
    MANAGE_ACCOUNT: "/both_sp_po/manage_account",
  },
  PET_OWNER: {
    ONBOARDING: "/pet_owner/onboarding",
    DASHBOARD: "/pet_owner/manage_bookings",
  },
  SERVICE_PROVIDER: {
    ONBOARDING: "/service_provider/onboarding",
    MANAGE_LISTING: "/service_provider/sp_dashboard",
  },
  SHARED: {
    SWITCH_BUSINESS: "/switch-business",
  }
} as const;