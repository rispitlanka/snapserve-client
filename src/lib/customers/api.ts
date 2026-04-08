import { AUTH_API_BASE_URL } from "../auth/constants";
import type {
  CreateCustomerPayload,
  Customer,
  CustomerCredit,
  CustomerLoyaltyPoints,
  CustomerSale,
  LoyaltyTransaction,
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

const getNumber = (obj: Record<string, unknown>, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  }

  return undefined;
};

const parseApiError = async (response: Response, fallbackMessage: string) => {
  try {
    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      const body = (await response.json()) as Record<string, unknown>;
      const rawMessage = body.message ?? body.error ?? body.detail;
      if (typeof rawMessage === "string" && rawMessage.trim()) return rawMessage;
      if (Array.isArray(rawMessage) && rawMessage.length > 0) {
        const joined = rawMessage.filter((v): v is string => typeof v === "string").join(", ");
        if (joined) return joined;
      }
    } else {
      const text = (await response.text()).trim();
      if (text) return text;
    }
  } catch {
    // no-op and use fallback message below
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
    if (error instanceof TypeError) {
      throw new Error(
        `Unable to reach the API (${url}). Check NEXT_PUBLIC_API_URL and backend CORS configuration.`
      );
    }

    throw new Error(error instanceof Error ? error.message : "Network request failed.");
  }
};

const getListData = (body: unknown, keys: string[]): unknown[] => {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return [];

  const visited = new Set<unknown>();
  const queue: unknown[] = [body];
  const nestedKeys = ["data", "result", "payload", "response"];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || Array.isArray(current) || visited.has(current)) {
      continue;
    }
    visited.add(current);

    const obj = current as Record<string, unknown>;
    const directArrayCandidates = [
      ...keys.map((key) => obj[key]),
      obj.items,
      obj.results,
      obj.rows,
      obj.list,
      obj.customers,
      obj.sales,
      obj.credits,
    ];

    for (const candidate of directArrayCandidates) {
      if (Array.isArray(candidate)) return candidate;
    }

    for (const key of [...keys, ...nestedKeys]) {
      const value = obj[key];
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object") queue.push(value);
    }
  }

  return [];
};

const mapEntityWithId = <T extends Record<string, unknown>>(raw: unknown): (T & { id: string }) | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const nestedCustomer =
    obj.customer && typeof obj.customer === "object" && !Array.isArray(obj.customer)
      ? (obj.customer as Record<string, unknown>)
      : null;
  const id =
    getString(obj, ["id", "_id", "customerId", "customer_id", "invoiceId", "saleOrderId"]) ||
    (nestedCustomer
      ? getString(nestedCustomer, ["id", "_id", "customerId", "customer_id"])
      : "");
  if (!id) return null;
  return { ...obj, id } as T & { id: string };
};

const mapEntityWithFallbackId = <T extends Record<string, unknown>>(
  raw: unknown,
  index: number
): (T & { id: string }) | null => {
  const mapped = mapEntityWithId<T>(raw);
  if (mapped) return mapped;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const pseudoId =
    getString(obj, ["name", "customerName", "mobileNumber", "phone", "contactNumber", "mobile"]) ||
    `row-${index + 1}`;
  return { ...obj, id: pseudoId } as T & { id: string };
};

const parseUnknownBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

/** POST /customers — create customer (cashier only). */
export const createCustomer = async (
  accessToken: string,
  payload: CreateCustomerPayload
): Promise<Customer> => {
  const response = await makeRequest(`${AUTH_API_BASE_URL}/customers`, {
    method: "POST",
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to create customer."));
  }

  const body = (await parseUnknownBody(response)) as unknown;
  const source =
    body && typeof body === "object" && !Array.isArray(body)
      ? ((body as Record<string, unknown>).data ?? body)
      : body;
  const mapped = mapEntityWithId<Record<string, unknown>>(source);
  if (!mapped) {
    throw new Error("Invalid customer response from server.");
  }
  return mapped as Customer;
};

/** GET /customers — list customers (cashier or restaurant admin). */
export const listCustomers = async (
  accessToken: string,
  query?: { search?: string; page?: number; limit?: number }
): Promise<Customer[]> => {
  const params = new URLSearchParams();
  if (query?.search?.trim()) params.set("search", query.search.trim());
  if (typeof query?.page === "number" && Number.isFinite(query.page) && query.page > 0) {
    params.set("page", String(query.page));
  }
  if (typeof query?.limit === "number" && Number.isFinite(query.limit) && query.limit > 0) {
    params.set("limit", String(query.limit));
  }

  const queryString = params.toString();
  const url = `${AUTH_API_BASE_URL}/customers${queryString ? `?${queryString}` : ""}`;
  const response = await makeRequest(url, {
    method: "GET",
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to load customers."));
  }

  const body = (await parseUnknownBody(response)) as unknown;
  const rows = getListData(body, ["customers"]);
  return rows
    .map((row, index) => mapEntityWithFallbackId<Record<string, unknown>>(row, index))
    .filter((row): row is Customer => row !== null);
};

/** GET /customers/{customerId}/sales — completed sale orders with invoice/payments. */
export const listCustomerSales = async (accessToken: string, customerId: string): Promise<CustomerSale[]> => {
  const response = await makeRequest(
    `${AUTH_API_BASE_URL}/customers/${encodeURIComponent(customerId)}/sales`,
    {
      method: "GET",
      headers: getAuthHeaders(accessToken),
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to load customer sales."));
  }

  const body = (await parseUnknownBody(response)) as unknown;
  const rows = getListData(body, ["sales", "invoices"]);
  return rows.map(mapEntityWithId<Record<string, unknown>>).filter((row): row is CustomerSale => row !== null);
};

/** GET /customers/{customerId}/credits — credit invoices with outstanding > 0. */
export const listCustomerCredits = async (accessToken: string, customerId: string): Promise<CustomerCredit[]> => {
  const response = await makeRequest(
    `${AUTH_API_BASE_URL}/customers/${encodeURIComponent(customerId)}/credits`,
    {
      method: "GET",
      headers: getAuthHeaders(accessToken),
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to load customer credits."));
  }

  const body = (await parseUnknownBody(response)) as unknown;
  const rows = getListData(body, ["credits"]);
  return rows.map(mapEntityWithId<Record<string, unknown>>).filter((row): row is CustomerCredit => row !== null);
};

/** GET /customers/{customerId}/loyalty-points — points balance + recent loyalty transactions. */
export const getCustomerLoyaltyPoints = async (
  accessToken: string,
  customerId: string
): Promise<CustomerLoyaltyPoints> => {
  const response = await makeRequest(
    `${AUTH_API_BASE_URL}/customers/${encodeURIComponent(customerId)}/loyalty-points`,
    {
      method: "GET",
      headers: getAuthHeaders(accessToken),
    }
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Failed to load customer loyalty points."));
  }

  const body = (await parseUnknownBody(response)) as unknown;
  const obj =
    body && typeof body === "object" && !Array.isArray(body)
      ? ((body as Record<string, unknown>).data as Record<string, unknown> | undefined) ??
        (body as Record<string, unknown>)
      : {};

  const transactionsRaw = getListData(obj, ["recentTransactions", "transactions", "history"]);
  const recentTransactions = transactionsRaw
    .map(mapEntityWithId<Record<string, unknown>>)
    .filter((row): row is LoyaltyTransaction => row !== null);

  return {
    ...obj,
    customerId: getString(obj, ["customerId", "customer_id"], customerId),
    pointsBalance: getNumber(obj, ["pointsBalance", "points", "balance"]),
    recentTransactions,
  };
};
