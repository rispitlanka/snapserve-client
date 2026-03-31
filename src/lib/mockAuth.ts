// Legacy compatibility layer.
// Prefer importing from "@/lib/auth" in new code.

export {
  AUTH_API_BASE_URL,
  AUTH_STORAGE_KEY,
  REGISTER_OPTIONS as MOCK_REGISTERS,
  ROLE_DASHBOARD_ROUTE
} from "@/lib/auth";

export {
  clearAuthSession as clearStoredSession,
  createRestaurant as createRestaurantApi,
  getAuthSession as getStoredSession,
  listRestaurants as listRestaurantsApi,
  login as loginApi,
  logout as logoutApi,
  parseAuthSession as parseLoginSession,
  refreshSession as refreshApi,
  selectRegister as selectRegisterApi,
  saveAuthSession as setStoredSession
} from "@/lib/auth";

export type {
  AuthSession,
  AuthUser,
  RegisterOption as MockRegister,
  Restaurant,
  UserRole
} from "@/lib/auth";

export { AUTH_STORAGE_KEY as MOCK_AUTH_STORAGE_KEY } from "@/lib/auth";

