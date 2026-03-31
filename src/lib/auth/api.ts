import { AUTH_API_BASE_URL } from "./constants";
import type { AuthSession, UserRole } from "./types";

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
    body: JSON.stringify({ register, registerId: register }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Register selection failed."));
  }

  return (await response.json()) as unknown;
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
  payload: { restaurantId: string; name: string; password: string }
) => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({
      ...payload,
      role: "admin",
    }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to create restaurant admin."));
  }

  return (await response.json()) as unknown;
};
