import type { UserRole } from "./types";

export const AUTH_STORAGE_KEY = "auth_session";

export const AUTH_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://snapserve-backend.onrender.com";

export const ROLE_DASHBOARD_ROUTE: Record<UserRole, string> = {
  superadmin: "/superadmin-dashboard",
  admin: "/admin-dashboard",
  cashier: "/cashier-dashboard",
};
