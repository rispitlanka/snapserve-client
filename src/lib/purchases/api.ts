import { AUTH_API_BASE_URL } from "../auth/constants";
import type { CreatePurchasePayload, CreditSettlementPayload, Purchase } from "./types";

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
  const candidates = [obj.data, obj.items, obj.results, obj.purchases];

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

const mapPurchase = (raw: unknown): Purchase | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;
  const id = getString(obj, ["id", "_id", "purchaseId", "purchase_id"]);
  if (!id) return null;

  return { ...obj, id } as Purchase;
};

/** GET /purchases — list all purchases for this restaurant. */
export const listPurchases = async (accessToken: string): Promise<Purchase[]> => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/purchases`, {
    method: "GET",
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to load purchases."));
  }

  const body = (await response.json()) as unknown;
  const list = getListData(body);

  return list.map(mapPurchase).filter((row): row is Purchase => row !== null);
};

/** POST /purchases — create purchase with line items (restaurant admin). */
export const createPurchase = async (
  accessToken: string,
  payload: CreatePurchasePayload
): Promise<unknown> => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/purchases`, {
    method: "POST",
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to create purchase."));
  }

  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

/** PATCH /purchases/{id}/credit-settlement — partial or full credit settlement. */
export const settlePurchaseCredit = async (
  accessToken: string,
  purchaseId: string,
  payload: CreditSettlementPayload
): Promise<unknown> => {
  const response = await makeRequest(
    `${AUTH_API_BASE_URL}/purchases/${encodeURIComponent(purchaseId)}/credit-settlement`,
    {
      method: "PATCH",
      headers: getAuthHeaders(accessToken),
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to settle purchase credit."));
  }

  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};
