import { AUTH_API_BASE_URL } from "./constants";
import type {
    ApiActionResult,
    AuthSession,
    ChangePasswordPayload,
    ChangePasswordResult,
    CreateStaffPayload,
    CreateSupplierPayload,
    Register,
    Staff,
    Supplier,
    UpdateStaffPayload,
    UserRole,
} from "./types";

const normalizeRole = (value: unknown): UserRole => {
  if (typeof value !== "string") return "cashier";

  const role = value.toLowerCase().trim();
  
  // Map backend role names to internal roles
  if (
    role === "superadmin" ||
    role === "super_admin" ||
    role === "super-admin"
  ) {
    return "superadmin";
  }
  
  if (
    role === "admin" ||
    role === "restaurant_admin" ||
    role === "restaurant-admin" ||
    role === "restaurantadmin"
  ) {
    return "admin";
  }
  
  if (role === "cashier") {
    return "cashier";
  }

  return "cashier"; // Default to cashier for unknown roles
};

const getString = (obj: Record<string, unknown>, keys: string[], fallback = "") => {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  return fallback;
};

const getBoolean = (
  obj: Record<string, unknown>,
  keys: string[],
  fallback = false
) => {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "boolean") return value;
  }

  return fallback;
};

const getObject = (obj: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = obj[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  return undefined;
};

const getNestedString = (
  root: Record<string, unknown>,
  nestedKey: string,
  nestedKeys: string[]
) => {
  const nested = getObject(root, [nestedKey]);
  if (!nested) return "";
  return getString(nested, nestedKeys);
};

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  try {
    if (typeof atob === "function") {
      return atob(padded);
    }
  } catch {
    // Fallback below.
  }

  try {
    // Node.js fallback when atob is unavailable.
    return Buffer.from(padded, "base64").toString("utf-8");
  } catch {
    return "";
  }
};

const decodeJwtPayload = (token?: string) => {
  if (!token) return {} as Record<string, unknown>;

  const parts = token.split(".");
  if (parts.length < 2) return {} as Record<string, unknown>;

  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) return {} as Record<string, unknown>;

  try {
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
};

const getAuthHeaders = (accessToken?: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
};

const parseApiError = async (response: Response, fallbackMessage: string) => {
  try {
    const contentType = response.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
      const body = (await response.json()) as Record<string, unknown>;
      const message = getString(body, ["message", "error", "detail"]);
      if (message) return message;
    } else {
      const text = (await response.text()).trim();
      if (text) return text;
    }
  } catch {
    // Fall through to the fallback message.
  }

  return fallbackMessage;
};

const makeRequest = async (url: string, options: RequestInit): Promise<Response> => {
  try {
    const response = await fetch(url, {
      ...options,
      // This API currently uses bearer token + JSON payloads, so avoid
      // credentialed CORS requirements unless explicitly needed later.
      credentials: "omit",
    });

    if (!response.ok) {
      const errorBody = await response.clone().text();
      // 401/403 can happen during role-based flows; avoid noisy console errors.
      if (response.status !== 401 && response.status !== 403) {
        console.error(`API Error [${response.status}]:`, {
          url,
          status: response.status,
          statusText: response.statusText,
          headers: {
            "Content-Type": response.headers.get("Content-Type"),
            "Access-Control-Allow-Origin": response.headers.get(
              "Access-Control-Allow-Origin"
            ),
          },
          body: errorBody,
        });
      }
    }

    return response;
  } catch (error) {
    const baseMessage =
      error instanceof Error && error.message
        ? error.message
        : "Network request failed.";

    if (error instanceof TypeError) {
      throw new Error(
        `Unable to reach the API (${url}). Check NEXT_PUBLIC_API_URL and backend CORS configuration.`
      );
    }

    throw new Error(baseMessage);
  }
};

export const parseAuthSession = (raw: unknown): AuthSession => {
  const root = (raw ?? {}) as Record<string, unknown>;
  const dataObj = getObject(root, ["data"]);
  const userObj =
    getObject(root, ["user"]) ?? getObject(dataObj ?? {}, ["user"]) ?? dataObj ?? root;

  const accessToken =
    getString(root, ["accessToken", "access_token", "token"]) ||
    getString(dataObj ?? {}, ["accessToken", "access_token", "token"]) ||
    getNestedString(root, "tokens", ["accessToken", "access_token", "token"]);
  const refreshToken =
    getString(root, ["refreshToken", "refresh_token"]) ||
    getString(dataObj ?? {}, ["refreshToken", "refresh_token"]) ||
    getNestedString(root, "tokens", ["refreshToken", "refresh_token"]);
  const jwtPayload = decodeJwtPayload(accessToken);
  const restaurantId =
    getString(userObj, ["restaurantId", "restaurant_id", "businessId", "business_id"]) ||
    getString(root, ["restaurantId", "restaurant_id", "businessId", "business_id"]) ||
    getString(jwtPayload, ["restaurantId", "restaurant_id", "businessId", "business_id"]);
  const registerId =
    getString(root, ["registerId", "register_id"]) ||
    getString(userObj, ["registerId", "register_id"]) ||
    getString(jwtPayload, ["registerId", "register_id"]);
  const name =
    getString(userObj, ["name", "username", "userName", "fullName"]) ||
    getString(root, ["name", "username", "userName", "fullName"]);
  const role = normalizeRole(
    userObj.role ??
      root.role ??
      userObj.userRole ??
      root.userRole ??
      userObj.type ??
      jwtPayload.role
  );
  const register =
    getString(userObj, ["register", "registerName", "terminal"]) || registerId;
  const requiresRegisterSelection = getBoolean(root, [
    "requiresRegisterSelection",
    "requires_register_selection",
  ]);
  const resolvedName = name || role;

  if (!accessToken || !refreshToken) {
    throw new Error("Unexpected login response.");
  }

  return {
    accessToken,
    refreshToken,
    requiresRegisterSelection,
    registerId: registerId || null,
    user: {
      restaurantId,
      name: resolvedName,
      role,
      register,
      registerId: registerId || null,
    },
  };
};

export const login = async (payload: {
  restaurantId?: string;
  name?: string;
  password: string;
}) => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Login failed."));
  }

  return (await response.json()) as unknown;
};

export const refreshSession = async (refreshToken: string) => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Refresh failed."));
  }

  return (await response.json()) as unknown;
};

export const logout = async (refreshToken?: string) => {
  const body = refreshToken ? JSON.stringify({ refreshToken }) : undefined;
  const response = await makeRequest(`${AUTH_API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: getAuthHeaders(),
    body,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Logout failed."));
  }
};

export const selectRegister = async (accessToken: string, register: string) => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/auth/select-register`, {
    method: "POST",
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ registerId: register }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Register selection failed."));
  }

  return (await response.json()) as unknown;
};

const mapRegister = (raw: unknown): Register | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;
  const id = getString(obj, ["id"]);
  const restaurantId = getString(obj, ["restaurantId", "restaurant_id"]);
  const name = getString(obj, ["name"]);

  if (!id || !name) return null;

  return {
    id,
    restaurantId,
    name,
    isActive: getBoolean(obj, ["isActive", "is_active"], true),
    occupiedBySessionId:
      getString(obj, ["occupiedBySessionId", "occupied_by_session_id"]) || null,
    createdAt: getString(obj, ["createdAt", "created_at"]),
    updatedAt: getString(obj, ["updatedAt", "updated_at"]),
    occupiedBySession: obj.occupiedBySession ?? null,
  };
};

const getListData = (body: unknown): unknown[] => {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return [];

  const obj = body as Record<string, unknown>;
  const candidates = [
    obj.data,
    obj.items,
    obj.results,
    obj.staff,
    obj.suppliers,
    obj.users,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
};

const mapStaff = (raw: unknown): Staff | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;
  const id = getString(obj, ["id", "_id", "userId", "user_id"]);
  const restaurantId = getString(obj, ["restaurantId", "restaurant_id", "businessId", "business_id"]);
  const name = getString(obj, ["name", "userName", "username", "fullName"]);

  if (!id || !name) return null;

  return {
    id,
    restaurantId,
    name,
    role: getString(obj, ["role", "userRole", "type"], "cashier"),
    isActive: getBoolean(obj, ["isActive", "is_active"], true),
    email: getString(obj, ["email"]) || null,
    phone: getString(obj, ["phone", "phoneNumber", "phone_number"]) || null,
    createdAt: getString(obj, ["createdAt", "created_at"]),
    updatedAt: getString(obj, ["updatedAt", "updated_at"]),
  };
};

const mapSupplier = (raw: unknown): Supplier | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;
  const id = getString(obj, ["id", "_id", "supplierId", "supplier_id"]);
  const restaurantId = getString(obj, ["restaurantId", "restaurant_id", "businessId", "business_id"]);
  const name = getString(obj, ["name", "supplierName", "supplier_name"]);

  if (!id || !name) return null;

  return {
    id,
    restaurantId,
    name,
    contactNumber:
      getString(obj, ["contactNumber", "contact_number", "phone", "phoneNumber", "phone_number"]) ||
      null,
    description: getString(obj, ["description"]) || null,
    isActive: getBoolean(obj, ["isActive", "is_active"], true),
    createdAt: getString(obj, ["createdAt", "created_at"]),
    updatedAt: getString(obj, ["updatedAt", "updated_at"]),
  };
};

export const listRegisters = async (accessToken: string, restaurantId?: string) => {
  let response = await makeRequest(`${AUTH_API_BASE_URL}/registers`, {
    method: "GET",
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok && response.status === 403 && restaurantId) {
    const scopedUrl = `${AUTH_API_BASE_URL}/registers?restaurantId=${encodeURIComponent(
      restaurantId
    )}`;
    response = await makeRequest(scopedUrl, {
      method: "GET",
      headers: getAuthHeaders(accessToken),
    });
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to load registers."));
  }

  const body = (await response.json()) as unknown;
  const data =
    Array.isArray(body)
      ? body
      : (body as { data?: unknown; registers?: unknown })?.data ??
        (body as { data?: unknown; registers?: unknown })?.registers;

  if (!Array.isArray(data)) return [];

  return data.map(mapRegister).filter((item): item is Register => item !== null);
};

export const listRestaurants = async (accessToken: string) => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/restaurants`, {
    method: "GET",
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to load restaurants."));
  }

  return (await response.json()) as unknown;
};

export const createRestaurant = async (
  accessToken: string,
  payload: { name: string; isActive: boolean }
) => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/restaurants`, {
    method: "POST",
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to create restaurant."));
  }

  return (await response.json()) as unknown;
};

export const createRestaurantAdmin = async (
  accessToken: string,
  payload: { restaurantId: string; businessId?: string; name: string; password: string }
) => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/users/admins`, {
    method: "POST",
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to create restaurant admin."));
  }

  return (await response.json()) as unknown;
};

export const listRestaurantAdmins = async (accessToken: string) => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/users/admins`, {
    method: "GET",
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to load restaurant admins."));
  }

  return (await response.json()) as unknown;
};

export const changePassword = async (
  accessToken: string,
  payload: ChangePasswordPayload
): Promise<ChangePasswordResult> => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/auth/change-password`, {
    method: "PATCH",
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to change password."));
  }

  const body = (await response.json()) as Record<string, unknown>;
  return {
    success: getBoolean(body, ["success"], true),
    message: getString(body, ["message", "detail"], "Password changed successfully."),
  };
};

export const listStaff = async (accessToken: string): Promise<Staff[]> => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/users/staff/`, {
    method: "GET",
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to load staff."));
  }

  const body = (await response.json()) as unknown;
  return getListData(body).map(mapStaff).filter((item): item is Staff => item !== null);
};

export const createStaff = async (
  accessToken: string,
  payload: CreateStaffPayload
): Promise<Staff> => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/users/staff/`, {
    method: "POST",
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to create staff."));
  }

  const body = (await response.json()) as unknown;
  const mapped = mapStaff((body as { data?: unknown })?.data ?? body);
  if (!mapped) {
    throw new Error("Unexpected create staff response.");
  }

  return mapped;
};

export const updateStaff = async (
  accessToken: string,
  staffId: string,
  payload: UpdateStaffPayload
): Promise<Staff> => {
  const response = await makeRequest(
    `${AUTH_API_BASE_URL}/users/staff/${encodeURIComponent(staffId)}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(accessToken),
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to update staff."));
  }

  const body = (await response.json()) as unknown;
  const mapped = mapStaff((body as { data?: unknown })?.data ?? body);
  if (!mapped) {
    throw new Error("Unexpected update staff response.");
  }

  return mapped;
};

export const deleteStaff = async (
  accessToken: string,
  staffId: string
): Promise<ApiActionResult> => {
  const response = await makeRequest(
    `${AUTH_API_BASE_URL}/users/staff/${encodeURIComponent(staffId)}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(accessToken),
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to delete staff."));
  }

  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    const body = (await response.json()) as Record<string, unknown>;
    return {
      success: getBoolean(body, ["success"], true),
      message: getString(body, ["message", "detail"], "Staff deleted successfully."),
    };
  }

  return {
    success: true,
    message: "Staff deleted successfully.",
  };
};

export const listSuppliers = async (accessToken: string): Promise<Supplier[]> => {
  let response = await makeRequest(`${AUTH_API_BASE_URL}/suppliers`, {
    method: "GET",
    headers: getAuthHeaders(accessToken),
  });

  // Backward compatibility for APIs that still expose singular route.
  if (!response.ok && (response.status === 404 || response.status === 405)) {
    response = await makeRequest(`${AUTH_API_BASE_URL}/supplier/`, {
      method: "GET",
      headers: getAuthHeaders(accessToken),
    });
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to load suppliers."));
  }

  const body = (await response.json()) as unknown;
  return getListData(body)
    .map(mapSupplier)
    .filter((item): item is Supplier => item !== null);
};

export const createSupplier = async (
  accessToken: string,
  payload: CreateSupplierPayload
): Promise<Supplier> => {
  let response = await makeRequest(`${AUTH_API_BASE_URL}/suppliers`, {
    method: "POST",
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  // Backward compatibility for APIs that still expose singular route.
  if (!response.ok && (response.status === 404 || response.status === 405)) {
    response = await makeRequest(`${AUTH_API_BASE_URL}/supplier/`, {
      method: "POST",
      headers: getAuthHeaders(accessToken),
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to create supplier."));
  }

  const body = (await response.json()) as unknown;
  const mapped = mapSupplier((body as { data?: unknown })?.data ?? body);
  if (!mapped) {
    throw new Error("Unexpected create supplier response.");
  }

  return mapped;
};
