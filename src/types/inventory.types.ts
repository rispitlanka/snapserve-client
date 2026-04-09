export type InventoryCategory = {
  id: string;
  restaurantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type InventorySubCategory = {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  category?: InventoryCategory;
};

export type InventoryBrand = {
  id: string;
  restaurantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type InventoryItem = {
  id: string;
  restaurantId: string;
  name: string;
  categoryId: string;
  subCategoryId: string;
  brandId: string;
  unit: string;
  currentStock: string;
  expiryDate: string;
  createdAt: string;
  updatedAt: string;
  category?: InventoryCategory;
  subCategory?: InventorySubCategory;
  brand?: InventoryBrand;
};

export type InventoryItemHistoryEntry = {
  id?: string;
  itemId?: string;
  date: string;
  description: string;
  qty: string;
  endingStock: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateInventoryCategoryPayload = {
  name: string;
};

export type CreateInventorySubCategoryPayload = {
  categoryId: string;
  name: string;
};

export type CreateInventoryBrandPayload = {
  name: string;
};

export type CreateInventoryItemPayload = {
  name: string;
  categoryId: string;
  subCategoryId?: string;
  brandId: string;
  unit: string;
  expiryDate?: string;
};

/** PATCH body for setting on-hand quantity (backend may expect number or string). */
export type UpdateInventoryItemStockPayload = {
  currentStock: number;
};
