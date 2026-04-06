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

export type Register = {
  id: string;
  restaurantId: string;
  name: string;
  isActive: boolean;
  occupiedBySessionId: string | null;
  createdAt: string;
  updatedAt: string;
  occupiedBySession?: unknown | null;
};

export type DashboardSummary = {
  totalRestaurants: number;
  totalRestaurantAdmins: number;
  activeRestaurants: number;
  totalOwners: number;
  newRestaurants: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  pendingSubscriptions: number;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type ApiActionResult = {
  success: boolean;
  message: string;
};

export type ChangePasswordResult = ApiActionResult;

export type Staff = {
  id: string;
  restaurantId: string;
  name: string;
  role: string;
  isActive: boolean;
  email: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateStaffPayload = {
  name: string;
  password: string;
  role?: "SUPER_ADMIN" | "RESTAURANT_ADMIN" | "CASHIER" | "WAITER";
};

export type UpdateStaffPayload = {
  name?: string;
  password?: string;
  role?: "SUPER_ADMIN" | "RESTAURANT_ADMIN" | "CASHIER" | "WAITER";
};

export type Supplier = {
  id: string;
  restaurantId: string;
  name: string;
  contactNumber: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateSupplierPayload = {
  restaurantId?: string;
  name: string;
  contactNumber: string;
  description: string;
};

export type RegisterOption = (typeof REGISTER_OPTIONS)[number];

export const REGISTER_OPTIONS = ["Terminal 1", "Terminal 2", "Terminal 3"] as const;
