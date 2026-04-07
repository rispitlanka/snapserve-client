import { AUTH_API_BASE_URL } from "../auth/constants";

export type MenuType = "DINEIN" | "TAKE_AWAY";

export type MenuIngredientPayload = {
  ingredientId: string;
  quantity: number;
  unit: string;
};

export type MenuAddonPricePayload = {
  id: string;
  addonsPrice: number;
};

export type MenuVariantPricePayload = {
  id: string;
  varientPrice: number;
};

export type CreateMenuItemPayload = {
  name: string;
  categoryId: string;
  menuType: MenuType[];
  kotEnabled: boolean;
  cost: number;
  menuImage?: string;
  varients?: MenuVariantPricePayload[];
  addons?: MenuAddonPricePayload[];
  status: boolean;
};

export type UpdateMenuItemPayload = Partial<CreateMenuItemPayload>;

export type UpsertMenuCategoryPayload = {
  name: string;
  status: boolean;
};

export type CreateMenuVariantPayload = {
  variantCategory: string;
  name: string;
};

export type UpdateMenuVariantPayload = Partial<CreateMenuVariantPayload>;

export type CreateMenuAddonPayload = {
  name: string;
};

export type UpdateMenuAddonPayload = Partial<CreateMenuAddonPayload>;

const getAuthHeaders = (accessToken?: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
};

const parseErrorText = async (response: Response, fallbackMessage: string) => {
  try {
    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      const body = (await response.json()) as Record<string, unknown>;
      const rawMessage = body.message ?? body.error ?? body.detail;
      if (typeof rawMessage === "string" && rawMessage.trim()) return rawMessage;
      if (Array.isArray(rawMessage) && rawMessage.length > 0) {
        return rawMessage.join(", ");
      }
    } else {
      const text = (await response.text()).trim();
      if (text) return text;
    }
  } catch {
    // no-op and return fallback below
  }

  return fallbackMessage;
};

const requestJson = async <TResponse>(
  path: string,
  accessToken: string,
  options: RequestInit,
  fallbackMessage: string
): Promise<TResponse> => {
  const response = await fetch(`${AUTH_API_BASE_URL}${path}`, {
    ...options,
    credentials: "omit",
    headers: {
      ...getAuthHeaders(accessToken),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseErrorText(response, fallbackMessage));
  }

  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    return {} as TResponse;
  }

  return (await response.json()) as TResponse;
};

const extractList = <T>(body: unknown, keys: string[]): T[] => {
  if (Array.isArray(body)) return body as T[];
  if (!body || typeof body !== "object") return [];

  const obj = body as Record<string, unknown>;
  for (const key of keys) {
    const candidate = obj[key];
    if (Array.isArray(candidate)) return candidate as T[];
  }

  if (Array.isArray(obj.data)) return obj.data as T[];
  return [];
};

export const createMenuItemIngredient = async (
  accessToken: string,
  menuItemId: string,
  payload: MenuIngredientPayload
) =>
  requestJson(
    `/menu/items/${encodeURIComponent(menuItemId)}/ingredients`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "Failed to add menu ingredient."
  );

export const createMenuAddonIngredient = async (
  accessToken: string,
  menuItemId: string,
  addonId: string,
  payload: MenuIngredientPayload
) =>
  requestJson(
    `/menu/items/${encodeURIComponent(menuItemId)}/addons/${encodeURIComponent(addonId)}/ingredients`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "Failed to add addon ingredient."
  );

export const addAddonPriceToMenuItem = async (
  accessToken: string,
  menuItemId: string,
  payload: MenuAddonPricePayload
) =>
  requestJson(
    `/menu/items/${encodeURIComponent(menuItemId)}/addons`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "Failed to attach addon price to menu item."
  );

export const createMenuItem = async (
  accessToken: string,
  payload: CreateMenuItemPayload
) =>
  requestJson(
    "/menu/items",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "Failed to create menu item."
  );

export const listMenuItems = async <T = Record<string, unknown>>(accessToken: string) => {
  const body = await requestJson<unknown>(
    "/menu/items",
    accessToken,
    { method: "GET" },
    "Failed to load menu items."
  );
  return extractList<T>(body, ["items", "menuItems", "results"]);
};

export const updateMenuItem = async (
  accessToken: string,
  menuItemId: string,
  payload: UpdateMenuItemPayload
) =>
  requestJson(
    `/menu/items/${encodeURIComponent(menuItemId)}`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "Failed to update menu item."
  );

export const createMenuCategory = async (
  accessToken: string,
  payload: UpsertMenuCategoryPayload
) =>
  requestJson(
    "/menu/categories",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "Failed to create menu category."
  );

export const listMenuCategories = async <T = Record<string, unknown>>(accessToken: string) => {
  const body = await requestJson<unknown>(
    "/menu/categories",
    accessToken,
    { method: "GET" },
    "Failed to load menu categories."
  );
  return extractList<T>(body, ["categories", "results"]);
};

export const updateMenuCategory = async (
  accessToken: string,
  categoryId: string,
  payload: UpsertMenuCategoryPayload
) =>
  requestJson(
    `/menu/categories/${encodeURIComponent(categoryId)}`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "Failed to update menu category."
  );

export const createMenuVariant = async (
  accessToken: string,
  payload: CreateMenuVariantPayload
) =>
  requestJson(
    "/menu/variants",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "Failed to create menu variant."
  );

export const listMenuVariants = async <T = Record<string, unknown>>(accessToken: string) => {
  const body = await requestJson<unknown>(
    "/menu/variants",
    accessToken,
    { method: "GET" },
    "Failed to load menu variants."
  );
  return extractList<T>(body, ["variants", "results"]);
};

export const updateMenuVariant = async (
  accessToken: string,
  variantId: string,
  payload: UpdateMenuVariantPayload
) =>
  requestJson(
    `/menu/variants/${encodeURIComponent(variantId)}`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "Failed to update menu variant."
  );

export const createMenuAddon = async (
  accessToken: string,
  payload: CreateMenuAddonPayload
) =>
  requestJson(
    "/menu/addons",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "Failed to create menu addon."
  );

export const listMenuAddons = async <T = Record<string, unknown>>(accessToken: string) => {
  const body = await requestJson<unknown>(
    "/menu/addons",
    accessToken,
    { method: "GET" },
    "Failed to load menu addons."
  );
  return extractList<T>(body, ["addons", "results"]);
};

export const updateMenuAddon = async (
  accessToken: string,
  addonId: string,
  payload: UpdateMenuAddonPayload
) =>
  requestJson(
    `/menu/addons/${encodeURIComponent(addonId)}`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "Failed to update menu addon."
  );
