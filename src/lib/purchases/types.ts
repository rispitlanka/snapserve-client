/** Line item for POST /purchases */
export type CreatePurchaseLineItem = {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  description: string;
  purchasePrice: number;
  sellingPrice: number;
  total: number;
};

/** Body for POST /purchases (restaurant admin) */
export type CreatePurchasePayload = {
  supplierId: string;
  receiveDate: string;
  notes: string;
  refNo: string;
  paymentMethod: string;
  subTotal: number;
  items: CreatePurchaseLineItem[];
};

/** Body for PATCH /purchases/{id}/credit-settlement */
export type CreditSettlementPayload = {
  amount: number;
  method: string;
  note: string;
};

/** GET /purchases — normalized list row (extra fields pass through from API). */
export type Purchase = {
  id: string;
} & Record<string, unknown>;
