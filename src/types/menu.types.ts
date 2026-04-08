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
