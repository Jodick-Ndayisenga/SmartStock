// constants/routes.ts
export const ROUTES = {
  AUTH: {
    ONBOARDING: '/(auth)/onboarding',
    LOGIN: '/(auth)/login',
    REGISTER: '/(auth)/register',
  },
  PROTECTED: {
    TABS: '/(tabs)',
    SELECT_SHOP: '/select-shop',
    CREATE_SHOP: '/create-shop',
  }
} as const;

export type AuthRoutes = typeof ROUTES.AUTH[keyof typeof ROUTES.AUTH];
export type ProtectedRoutes = typeof ROUTES.PROTECTED[keyof typeof ROUTES.PROTECTED];