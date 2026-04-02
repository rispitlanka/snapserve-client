import { AUTH_API_BASE_URL } from "../auth/constants";
import type {
  CreateInventoryBrandPayload,
  CreateInventoryCategoryPayload,
  CreateInventoryItemPayload,
  CreateInventorySubCategoryPayload,
  InventoryBrand,
  InventoryCategory,
  InventoryItem,
  InventoryItemHistoryEntry,
  InventorySubCategory,
} from "./types";

const getAuthHeaders = (accessToken?: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
};

const getString = (obj: Record<string, unknown>, keys: string[], fallback = "") => {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return fallback;
};

const getListData = (body: unknown): unknown[] => {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return [];

  const obj = body as Record<string, unknown>;
  const candidates = [
    obj.data,
    obj.items,
    obj.results,
    obj.categories,
    obj.subCategories,
    obj.sub_categories,
    obj.brands,
    obj.inventoryItems,
    obj.items,
    obj.history,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
};

const parseApiError = async (response: Response, fallbackMessage: string) => {
  try {
    const contentType = response.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
      const body = (await response.json()) as Record<string, unknown>;
      const rawMessage = body.message;
      if (Array.isArray(rawMessage)) {
        const messages = rawMessage.filter((entry): entry is string => typeof entry === "string");
        if (messages.length > 0) {
          return messages.join(", ");
        }
      }

      if (typeof rawMessage === "string" && rawMessage.trim()) {
        return rawMessage;
      }

      const message = getString(body, ["error", "detail"]);
      if (message) return message;
    } else {
      const text = (await response.text()).trim();
      if (text) return text;
    }
  } catch {
    // Fall through to fallback message.
  }

  return fallbackMessage;
};

const makeRequest = async (url: string, options: RequestInit): Promise<Response> => {
  try {
    return await fetch(url, {
      ...options,
      credentials: "omit",
    });
  } catch (error) {
    const baseMessage =
      error instanceof Error && error.message ? error.message : "Network request failed.";

    if (error instanceof TypeError) {
      throw new Error(
        `Unable to reach the API (${url}). Check NEXT_PUBLIC_API_URL and backend CORS configuration.`
      );
    }

    throw new Error(baseMessage);
  }
};

const mapInventoryCategory = (raw: unknown): InventoryCategory | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;
  const id = getString(obj, ["id", "_id", "categoryId", "category_id"]);
  const restaurantId = getString(obj, ["restaurantId", "restaurant_id", "businessId", "business_id"]);
  const name = getString(obj, ["name", "categoryName", "category_name"]);

  if (!id || !name) return null;

  return {
    id,
    restaurantId,
    name,
    createdAt: getString(obj, ["createdAt", "created_at"]),
    updatedAt: getString(obj, ["updatedAt", "updated_at"]),
  };
};

const mapInventorySubCategory = (raw: unknown): InventorySubCategory | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;
  const id = getString(obj, ["id", "_id", "subCategoryId", "sub_category_id"]);
  const restaurantId = getString(obj, ["restaurantId", "restaurant_id", "businessId", "business_id"]);
  const categoryId = getString(obj, ["categoryId", "category_id"]);
  const name = getString(obj, ["name", "subCategoryName", "sub_category_name"]);

  if (!id || !name) return null;

  return {
    id,
    restaurantId,
    categoryId,
    name,
    createdAt: getString(obj, ["createdAt", "created_at"]),
    updatedAt: getString(obj, ["updatedAt", "updated_at"]),
    category: mapInventoryCategory(obj.category ?? obj.parentCategory ?? obj.parent_category) ?? undefined,
  };
};

const mapInventoryBrand = (raw: unknown): InventoryBrand | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;
  const id = getString(obj, ["id", "_id", "brandId", "brand_id"]);
  const restaurantId = getString(obj, ["restaurantId", "restaurant_id", "businessId", "business_id"]);
  const name = getString(obj, ["name", "brandName", "brand_name"]);

  if (!id || !name) return null;

  return {
    id,
    restaurantId,
    name,
    createdAt: getString(obj, ["createdAt", "created_at"]),
    updatedAt: getString(obj, ["updatedAt", "updated_at"]),
  };
};

const mapInventoryItem = (raw: unknown): InventoryItem | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;
  const id = getString(obj, ["id", "_id", "itemId", "item_id"]);
  const restaurantId = getString(obj, ["restaurantId", "restaurant_id", "businessId", "business_id"]);
  const name = getString(obj, ["name", "itemName", "item_name"]);
  const categoryId = getString(obj, ["categoryId", "category_id"]);
  const subCategoryId = getString(obj, ["subCategoryId", "sub_category_id"]);
  const brandId = getString(obj, ["brandId", "brand_id"]);
  const unit = getString(obj, ["unit"]);
  const currentStock = getString(obj, ["currentStock", "current_stock"], "0");
  const expiryDate = getString(obj, ["expiryDate", "expiry_date"]);

  if (!id || !name) return null;

  return {
    id,
    restaurantId,
    name,
    categoryId,
    subCategoryId,
    brandId,
    unit,
    currentStock,
    expiryDate,
    createdAt: getString(obj, ["createdAt", "created_at"]),
    updatedAt: getString(obj, ["updatedAt", "updated_at"]),
    category: mapInventoryCategory(obj.category) ?? undefined,
    subCategory: mapInventorySubCategory(obj.subCategory ?? obj.sub_category) ?? undefined,
    brand: mapInventoryBrand(obj.brand) ?? undefined,
  };
};

const mapInventoryHistoryEntry = (raw: unknown): InventoryItemHistoryEntry | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;
  const date = getString(obj, ["date", "purchaseDate", "purchase_date", "createdAt", "created_at"]);
  const description = getString(obj, ["description", "note", "remarks"]);
  const qty = getString(obj, ["qty", "quantity", "stockChange", "stock_change"]);
  const endingStock = getString(obj, ["endingStock", "ending_stock", "currentStock", "current_stock"]);

  if (!date && !description && !qty && !endingStock) return null;

  return {
    id: getString(obj, ["id", "_id", "historyId", "history_id"]) || undefined,
    itemId: getString(obj, ["itemId", "item_id"]) || undefined,
    date,
    description,
    qty,
    endingStock,
    createdAt: getString(obj, ["createdAt", "created_at"]) || undefined,
    updatedAt: getString(obj, ["updatedAt", "updated_at"]) || undefined,
  };
};

const getResourceData = async (response: Response, fallbackMessage: string) => {
  if (!response.ok) {
    throw new Error(await parseApiError(response, fallbackMessage));
  }

  return (await response.json()) as unknown;
};

export const listInventoryCategories = async (accessToken: string): Promise<InventoryCategory[]> => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/inventory/categories`, {
    method: "GET",
    headers: getAuthHeaders(accessToken),
  });

  const body = await getResourceData(response, "Failed to load inventory categories.");
  return getListData(body).map(mapInventoryCategory).filter((item): item is InventoryCategory => item !== null);
};

export const createInventoryCategory = async (
  accessToken: string,
  payload: CreateInventoryCategoryPayload
): Promise<InventoryCategory> => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/inventory/categories`, {
    method: "POST",
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  const body = await getResourceData(response, "Failed to create inventory category.");
  const mapped = mapInventoryCategory((body as { data?: unknown })?.data ?? body);
  if (!mapped) {
    throw new Error("Unexpected create inventory category response.");
  }

  return mapped;
};

export const listInventorySubCategories = async (
  accessToken: string
): Promise<InventorySubCategory[]> => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/inventory/sub-categories`, {
    method: "GET",
    headers: getAuthHeaders(accessToken),
  });

  const body = await getResourceData(response, "Failed to load inventory sub-categories.");
  return getListData(body)
    .map(mapInventorySubCategory)
    .filter((item): item is InventorySubCategory => item !== null);
};

export const createInventorySubCategory = async (
  accessToken: string,
  payload: CreateInventorySubCategoryPayload
): Promise<InventorySubCategory> => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/inventory/sub-categories`, {
    method: "POST",
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  const body = await getResourceData(response, "Failed to create inventory sub-category.");
  const mapped = mapInventorySubCategory((body as { data?: unknown })?.data ?? body);
  if (!mapped) {
    throw new Error("Unexpected create inventory sub-category response.");
  }

  return mapped;
};

export const listInventoryBrands = async (accessToken: string): Promise<InventoryBrand[]> => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/inventory/brands`, {
    method: "GET",
    headers: getAuthHeaders(accessToken),
  });

  const body = await getResourceData(response, "Failed to load inventory brands.");
  return getListData(body).map(mapInventoryBrand).filter((item): item is InventoryBrand => item !== null);
};

export const createInventoryBrand = async (
  accessToken: string,
  payload: CreateInventoryBrandPayload
): Promise<InventoryBrand> => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/inventory/brands`, {
    method: "POST",
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  const body = await getResourceData(response, "Failed to create inventory brand.");
  const mapped = mapInventoryBrand((body as { data?: unknown })?.data ?? body);
  if (!mapped) {
    throw new Error("Unexpected create inventory brand response.");
  }

  return mapped;
};

export const listInventoryItems = async (accessToken: string): Promise<InventoryItem[]> => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/inventory/items`, {
    method: "GET",
    headers: getAuthHeaders(accessToken),
  });

  const body = await getResourceData(response, "Failed to load inventory items.");
  return getListData(body).map(mapInventoryItem).filter((item): item is InventoryItem => item !== null);
};

export const getInventoryItem = async (
  accessToken: string,
  itemId: string
): Promise<InventoryItem> => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/inventory/items/${encodeURIComponent(itemId)}`, {
    method: "GET",
    headers: getAuthHeaders(accessToken),
  });

  const body = await getResourceData(response, "Failed to load inventory item.");
  const mapped = mapInventoryItem((body as { data?: unknown })?.data ?? body);
  if (!mapped) {
    throw new Error("Unexpected inventory item response.");
  }

  return mapped;
};

export const getInventoryItemHistory = async (
  accessToken: string,
  itemId: string
): Promise<InventoryItemHistoryEntry[]> => {
  const response = await makeRequest(
    `${AUTH_API_BASE_URL}/inventory/items/${encodeURIComponent(itemId)}/history`,
    {
      method: "GET",
      headers: getAuthHeaders(accessToken),
    }
  );

  const body = await getResourceData(response, "Failed to load inventory item history.");
  return getListData(body)
    .map(mapInventoryHistoryEntry)
    .filter((item): item is InventoryItemHistoryEntry => item !== null);
};

export const createInventoryItem = async (
  accessToken: string,
  payload: CreateInventoryItemPayload
): Promise<InventoryItem> => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/inventory/items`, {
    method: "POST",
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  const body = await getResourceData(response, "Failed to create inventory item.");
  const mapped = mapInventoryItem((body as { data?: unknown })?.data ?? body);
  if (!mapped) {
    throw new Error("Unexpected create inventory item response.");
  }

  return mapped;
};
