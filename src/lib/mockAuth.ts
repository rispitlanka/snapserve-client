export type UserRole = "superadmin" | "admin" | "cashier";

export type MockUser = {
  restaurantId: string;
  name: string;
  password: string;
  role: UserRole;
};

export const MOCK_USERS: MockUser[] = [
  {
    restaurantId: "0RW0SH",
    name: "Santhosh",
    password: "test@123",
    role: "superadmin",
  },
  {
    restaurantId: "AD1001",
    name: "AdminUser",
    password: "admin@123",
    role: "admin",
  },
  {
    restaurantId: "CS2001",
    name: "CashierUser",
    password: "cashier@123",
    role: "cashier",
  },
];

export const ROLE_DASHBOARD_ROUTE: Record<UserRole, string> = {
  superadmin: "/superadmin-dashboard",
  admin: "/admin-dashboard",
  cashier: "/cashier-dashboard",
};

export const MOCK_AUTH_STORAGE_KEY = "mock_auth_user";

export const MOCK_REGISTERS = ["Terminal 1", "Terminal 2", "Terminal 3"] as const;

export type MockRegister = (typeof MOCK_REGISTERS)[number];

export type MockAuthUser = MockUser & {
  register?: MockRegister;
};

export const DYNAMIC_ADMIN_STORAGE_KEY = "mock_admin_users";

export type DynamicAdminUser = MockUser & {
  role: "admin";
};
