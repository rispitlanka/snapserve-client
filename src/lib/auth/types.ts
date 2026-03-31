export type UserRole = "superadmin" | "admin" | "cashier";

export type AuthUser = {
  restaurantId: string;
  name: string;
  role: UserRole;
  register?: string;
  registerId?: string | null;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  requiresRegisterSelection?: boolean;
  registerId?: string | null;
  user: AuthUser;
};

export type Restaurant = {
  id?: string;
  restaurantId?: string;
  name: string;
  isActive: boolean;
};

export type RegisterOption = (typeof REGISTER_OPTIONS)[number];

export const REGISTER_OPTIONS = ["Terminal 1", "Terminal 2", "Terminal 3"] as const;
