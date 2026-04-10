"use client";

import ClientTablePagination from "@/components/common/ClientTablePagination";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { getAuthSession, ROLE_DASHBOARD_ROUTE } from "@/lib/auth";
import { listInventoryItems, type InventoryItem } from "@/lib/inventory";
import {
  addAddonPriceToMenuItem,
  createMenuAddonIngredient,
  createMenuItemIngredient,
  listMenuAddons,
  listMenuCategories,
  listMenuItems,
  updateMenuItem,
} from "@/lib/menu";
import { useClientPagedSlice } from "@/lib/pagination/clientPaging";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type MenuItemRow = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  menuImage: string;
  sellingPrice: number;
  cost: number;
  status: boolean;
  updatedAtMs: number;
};

type IngredientDraftState = {
  ingredientId: string;
  quantity: string;
  unit: string;
};

type AddonIngredientDraftState = IngredientDraftState;

type AddedIngredientRow = {
  rowKey: string;
  targetType: "item" | "addon";
  addonId?: string;
  addonName?: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
};

type SortOption = "category" | "price" | "status" | "updatedAt";

const normalizeText = (value: string) => value.trim().toLowerCase();
const DECIMAL_INPUT_RE = /^\d*\.?\d{0,2}$/;

const getValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
};

const getNumber = (record: Record<string, unknown>, keys: string[]): number => {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
};

const getBool = (record: Record<string, unknown>, keys: string[]): boolean => {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === "boolean") return v;
    if (v === "true" || v === 1) return true;
    if (v === "false" || v === 0) return false;
  }
  return true;
};

const getUpdatedMs = (record: Record<string, unknown>): number => {
  const raw = getValue(record, ["updatedAt", "updated_at"]);
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
};

const getSellingPrice = (row: Record<string, unknown>): number => {
  const direct = getNumber(row, [
    "sellingPrice",
    "selling_price",
    "price",
    "salePrice",
    "menuPrice",
    "menu_price",
  ]);
  if (direct !== 0) return direct;
  const variantsRaw = row["varients"] ?? row["variants"];
  if (Array.isArray(variantsRaw) && variantsRaw.length > 0) {
    const first = variantsRaw[0] as Record<string, unknown>;
    const vp = getNumber(first, ["varientPrice", "variantPrice", "price"]);
    if (vp !== 0) return vp;
  }
  return getNumber(row, ["cost"]);
};

const formatMoney = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const sortSelectClass =
  "h-10 min-w-[12rem] rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const newRowKey = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());

const emptyIngredientDraft = (): IngredientDraftState => ({
  ingredientId: "",
  quantity: "",
  unit: "",
});

const normalizeMenuItems = (
  raw: unknown[],
  categoryNameById: Record<string, string>
): MenuItemRow[] =>
  raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((row) => {
      const id = getValue(row, ["id", "menuItemId", "itemId"]);
      if (!id) return null;

      let categoryId = getValue(row, ["categoryId", "menuCategoryId", "category_id"]);
      const nestedCat = row["category"];
      if (!categoryId && nestedCat && typeof nestedCat === "object" && !Array.isArray(nestedCat)) {
        categoryId = getValue(nestedCat as Record<string, unknown>, ["id", "categoryId"]);
      }

      let categoryName = "";
      if (nestedCat && typeof nestedCat === "object" && !Array.isArray(nestedCat)) {
        categoryName = getValue(nestedCat as Record<string, unknown>, ["name", "categoryName"]);
      }
      if (!categoryName && categoryId) categoryName = categoryNameById[categoryId] ?? "";
      if (!categoryName) categoryName = "—";

      const name = getValue(row, ["name", "title", "itemName"]) || "Unnamed";
      const menuImage = getValue(row, ["menuImage", "image", "imageUrl", "photo"]);
      const cost = getNumber(row, ["cost", "baseCost"]);
      const sellingPrice = getSellingPrice(row);
      const status = getBool(row, ["status", "active", "isActive"]);
      const updatedAtMs = getUpdatedMs(row);

      return {
        id,
        name,
        categoryId: categoryId || "",
        categoryName,
        menuImage,
        sellingPrice,
        cost,
        status,
        updatedAtMs,
      };
    })
    .filter((row): row is MenuItemRow => row !== null);

type CategoryOption = { id: string; name: string; status: boolean };

export default function MenuListClient() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [addons, setAddons] = useState<{ id: string; name: string }[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("updatedAt");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsItemId, setDetailsItemId] = useState<string | null>(null);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    menuId: "",
    name: "",
    menuImage: "",
    cost: "",
    defaultVariantPrice: "",
  });
  const [detailsNewImageData, setDetailsNewImageData] = useState<string | null>(null);
  const [detailsImagePreview, setDetailsImagePreview] = useState<string>("");
  const [detailsImageUploadName, setDetailsImageUploadName] = useState<string>("");
  const [detailsImageDragActive, setDetailsImageDragActive] = useState(false);

  const [addonOpen, setAddonOpen] = useState(false);
  const [addonItemId, setAddonItemId] = useState<string | null>(null);
  const [addonSaving, setAddonSaving] = useState(false);
  const [addonForm, setAddonForm] = useState({ addonId: "", addonsPrice: "" });

  const [ingredientOpen, setIngredientOpen] = useState(false);
  const [ingredientItemId, setIngredientItemId] = useState<string | null>(null);
  const [ingredientSaving, setIngredientSaving] = useState(false);
  const [menuIngredientDraft, setMenuIngredientDraft] = useState<IngredientDraftState>(emptyIngredientDraft);
  const [selectedAddonId, setSelectedAddonId] = useState("");
  const [addonIngredientDrafts, setAddonIngredientDrafts] = useState<Record<string, AddonIngredientDraftState>>({});
  const [addedIngredients, setAddedIngredients] = useState<AddedIngredientRow[]>([]);

  const loadAll = useCallback(async () => {
    const session = getAuthSession();
    if (!session) return;
    setIsLoading(true);
    try {
      const [catList, itemList, addonList, invList] = await Promise.all([
        listMenuCategories(session.accessToken),
        listMenuItems(session.accessToken),
        listMenuAddons(session.accessToken),
        listInventoryItems(session.accessToken),
      ]);

      const catRows: CategoryOption[] = catList
        .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
        .map((row) => {
          const id = getValue(row, ["id", "categoryId"]);
          if (!id) return null;
          const name = getValue(row, ["name", "categoryName"]) || "—";
          const status = getBool(row, ["status", "active", "isActive"]);
          return { id, name, status };
        })
        .filter((c): c is CategoryOption => c !== null);

      const nameMap: Record<string, string> = {};
      for (const c of catRows) nameMap[c.id] = c.name;

      setItems(normalizeMenuItems(itemList as unknown[], nameMap));

      const addonRows = addonList
        .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
        .map((row) => {
          const id = getValue(row, ["id", "addonId"]);
          if (!id) return null;
          const name = getValue(row, ["name", "addonName"]) || "—";
          return { id, name };
        })
        .filter((a): a is { id: string; name: string } => a !== null);
      setAddons(addonRows);
      setInventoryItems(invList);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load menu list.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const session = getAuthSession();
      if (!session) {
        router.replace("/signin");
        return;
      }
      if (session.user.role !== "admin") {
        router.replace(ROLE_DASHBOARD_ROUTE[session.user.role]);
        return;
      }
      setSessionReady(true);
      await loadAll();
    };
    void init();
  }, [router, loadAll]);

  const filtered = useMemo(() => {
    const q = normalizeText(searchQuery);
    if (!q) return items;
    return items.filter((row) => {
      const hay = `${row.name} ${row.categoryName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, searchQuery]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const byName = (a: MenuItemRow, b: MenuItemRow) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

    if (sortBy === "category") {
      list.sort((a, b) => {
        const c = a.categoryName.localeCompare(b.categoryName, undefined, { sensitivity: "base" });
        if (c !== 0) return c;
        return byName(a, b);
      });
      return list;
    }
    if (sortBy === "price") {
      list.sort((a, b) => {
        const d = a.sellingPrice - b.sellingPrice;
        if (d !== 0) return d;
        return byName(a, b);
      });
      return list;
    }
    if (sortBy === "status") {
      list.sort((a, b) => {
        if (a.status !== b.status) return a.status ? -1 : 1;
        return byName(a, b);
      });
      return list;
    }
    list.sort((a, b) => {
      const d = b.updatedAtMs - a.updatedAtMs;
      if (d !== 0) return d;
      return byName(a, b);
    });
    return list;
  }, [filtered, sortBy]);

  const paged = useClientPagedSlice(sorted, page, pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortBy]);

  useEffect(() => {
    if (paged.safePage !== page) setPage(paged.safePage);
  }, [page, paged.safePage]);

  const openEditDetails = (row: MenuItemRow) => {
    setDetailsItemId(row.id);
    setDetailsForm({
      menuId: row.id,
      name: row.name,
      menuImage: row.menuImage,
      cost: row.cost ? String(row.cost) : "",
      defaultVariantPrice: row.sellingPrice ? String(row.sellingPrice) : "",
    });
    setDetailsNewImageData(null);
    setDetailsImagePreview(row.menuImage || "");
    setDetailsImageUploadName("");
    setDetailsImageDragActive(false);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsItemId(null);
    setDetailsNewImageData(null);
    setDetailsImagePreview("");
    setDetailsImageUploadName("");
    setDetailsImageDragActive(false);
  };

  const onDetailsImageFile = (file: File | null) => {
    if (!file) {
      setDetailsNewImageData(null);
      setDetailsImagePreview(detailsForm.menuImage || "");
      setDetailsImageUploadName("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setDetailsNewImageData(result);
        setDetailsImagePreview(result);
        setDetailsImageUploadName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const onDetailsImageDrop = (ev: React.DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    setDetailsImageDragActive(false);
    onDetailsImageFile(ev.dataTransfer.files?.[0] ?? null);
  };

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = detailsForm.name.trim();
    if (!name) {
      toast.error("Name is required.");
      return;
    }
    const costNum = Number(detailsForm.cost);
    if (!Number.isFinite(costNum) || costNum < 0) {
      toast.error("Enter a valid cost (0 or greater).");
      return;
    }
    if (detailsForm.defaultVariantPrice.trim()) {
      const defaultVariantPriceNum = Number(detailsForm.defaultVariantPrice);
      if (!Number.isFinite(defaultVariantPriceNum) || defaultVariantPriceNum < 0) {
        toast.error("Enter a valid default variant price (0 or greater).");
        return;
      }
    }

    const session = getAuthSession();
    if (!session) {
      toast.error("Session not found.");
      return;
    }

    const menuImage = detailsNewImageData ?? (detailsForm.menuImage.trim() || undefined);

    if (!detailsItemId) {
      toast.error("Nothing to update.");
      return;
    }

    setDetailsSaving(true);
    try {
      await updateMenuItem(session.accessToken, detailsItemId, {
        name,
        cost: costNum,
        menuImage,
      });
      toast.success("Menu item updated.");
      closeDetails();
      await loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setDetailsSaving(false);
    }
  };

  const handleStatusToggle = async (row: MenuItemRow, next: boolean) => {
    if (next === row.status) return;
    const session = getAuthSession();
    if (!session) {
      toast.error("Session not found.");
      return;
    }
    setUpdatingStatusId(row.id);
    try {
      await updateMenuItem(session.accessToken, row.id, { status: next });
      setItems((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, status: next, updatedAtMs: Date.now() } : r
        )
      );
      toast.success(next ? "Item activated." : "Item deactivated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const openAddon = (row: MenuItemRow) => {
    setAddonItemId(row.id);
    setAddonForm({ addonId: "", addonsPrice: "" });
    setAddonOpen(true);
  };

  const closeAddon = () => {
    setAddonOpen(false);
    setAddonItemId(null);
  };

  const submitAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addonItemId) return;
    if (!addonForm.addonId) {
      toast.error("Select an add-on.");
      return;
    }
    if (!addonForm.addonsPrice.trim()) {
      toast.error("Add-on price is required.");
      return;
    }
    const price = Number(addonForm.addonsPrice);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid add-on price.");
      return;
    }
    const session = getAuthSession();
    if (!session) {
      toast.error("Session not found.");
      return;
    }
    setAddonSaving(true);
    try {
      await addAddonPriceToMenuItem(session.accessToken, addonItemId, {
        id: addonForm.addonId,
        addonsPrice: price,
      });
      toast.success("Add-on price saved.");
      closeAddon();
      await loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add add-on.");
    } finally {
      setAddonSaving(false);
    }
  };

  const openIngredient = (row: MenuItemRow) => {
    router.push(`/manage-menu/list/${row.id}/ingredients`);
  };

  const closeIngredient = () => {
    setIngredientOpen(false);
    setIngredientItemId(null);
    setMenuIngredientDraft(emptyIngredientDraft());
    setSelectedAddonId("");
    setAddonIngredientDrafts({});
    setAddedIngredients([]);
  };

  const onPickMenuIngredient = (id: string) => {
    const inv = inventoryItems.find((i) => i.id === id);
    setMenuIngredientDraft((prev) => ({
      ...prev,
      ingredientId: id,
      unit: inv?.unit ?? prev.unit,
    }));
  };

  const onPickAddonIngredient = (addonId: string, id: string) => {
    const inv = inventoryItems.find((i) => i.id === id);
    setAddonIngredientDrafts((prev) => ({
      ...prev,
      [addonId]: {
        ...(prev[addonId] ?? emptyIngredientDraft()),
        ingredientId: id,
        unit: inv?.unit ?? prev[addonId]?.unit ?? "",
      },
    }));
  };

  const addMenuIngredientRow = () => {
    if (!menuIngredientDraft.ingredientId) {
      toast.error("Select an ingredient item.");
      return;
    }
    const qty = Number(menuIngredientDraft.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity.");
      return;
    }
    const unit = menuIngredientDraft.unit.trim();
    if (!unit) {
      toast.error("Select a unit.");
      return;
    }

    const ingredientName =
      inventoryItems.find((inv) => inv.id === menuIngredientDraft.ingredientId)?.name ??
      menuIngredientDraft.ingredientId;

    setAddedIngredients((prev) => [
      ...prev,
      {
        rowKey: newRowKey(),
        targetType: "item",
        ingredientId: menuIngredientDraft.ingredientId,
        ingredientName,
        quantity: qty,
        unit,
      },
    ]);

    setMenuIngredientDraft({ ingredientId: "", quantity: "", unit: "" });
  };

  const addAddonIngredientRow = (addonId: string) => {
    const draft = addonIngredientDrafts[addonId] ?? emptyIngredientDraft();

    if (!addonId) {
      toast.error("Select an add-on.");
      return;
    }
    if (!draft.ingredientId) {
      toast.error("Select an ingredient item.");
      return;
    }
    const qty = Number(draft.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity.");
      return;
    }
    const unit = draft.unit.trim();
    if (!unit) {
      toast.error("Select a unit.");
      return;
    }

    const ingredientName =
      inventoryItems.find((inv) => inv.id === draft.ingredientId)?.name ?? draft.ingredientId;
    const addonName = addons.find((a) => a.id === addonId)?.name ?? addonId;

    setAddedIngredients((prev) => [
      ...prev,
      {
        rowKey: newRowKey(),
        targetType: "addon",
        addonId,
        addonName,
        ingredientId: draft.ingredientId,
        ingredientName,
        quantity: qty,
        unit,
      },
    ]);

    setAddonIngredientDrafts((prev) => ({
      ...prev,
      [addonId]: emptyIngredientDraft(),
    }));
  };

  const submitIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredientItemId) return;
    if (addedIngredients.length === 0) {
      toast.error("Add at least one ingredient.");
      return;
    }

    const session = getAuthSession();
    if (!session) {
      toast.error("Session not found.");
      return;
    }

    setIngredientSaving(true);
    try {
      for (const row of addedIngredients) {
        const payload = {
          ingredientId: row.ingredientId,
          quantity: row.quantity,
          unit: row.unit,
        };

        if (row.targetType === "addon" && row.addonId) {
          await createMenuAddonIngredient(session.accessToken, ingredientItemId, row.addonId, payload);
        } else {
          await createMenuItemIngredient(session.accessToken, ingredientItemId, payload);
        }
      }

      toast.success("Ingredients saved.");
      closeIngredient();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save ingredients.");
    } finally {
      setIngredientSaving(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading menu...</p>
      </div>
    );
  }

  const menuAddedIngredients = addedIngredients.filter((row) => row.targetType === "item");

  const addonRows = addedIngredients.filter(
    (row): row is AddedIngredientRow & { addonId: string } =>
      row.targetType === "addon" && Boolean(row.addonId)
  );

  const addonGroupIdSet = new Set<string>();
  if (selectedAddonId) addonGroupIdSet.add(selectedAddonId);
  for (const row of addonRows) addonGroupIdSet.add(row.addonId);

  const addonGroupIds = addons
    .map((addon) => addon.id)
    .filter((addonId) => addonGroupIdSet.has(addonId));

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Menu List</h1>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-400">Sort</span>
            <select
              value={sortBy}
              onChange={(ev) => setSortBy(ev.target.value as SortOption)}
              className={sortSelectClass}
            >
              <option value="category">Category (A–Z)</option>
              <option value="price">Selling price (low to high)</option>
              <option value="status">Status (active first)</option>
              <option value="updatedAt">Date updated (recent first)</option>
            </select>
          </div>
          <Button type="button" size="sm" onClick={() => router.push("/manage-menu/list/add")}>
            Add menu item
          </Button>
        </div>
      </div>

      <section className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <Input
            type="text"
            value={searchQuery}
            onChange={(ev) => setSearchQuery(ev.target.value)}
            placeholder="Search by name or category"
            className="h-10! md:max-w-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="px-2 py-3">Image</th>
                <th className="px-2 py-3">Food name</th>
                <th className="px-2 py-3">Category</th>
                <th className="px-2 py-3">Selling price</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-sm text-gray-500 dark:text-gray-400">
                    Loading menu items...
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-sm text-gray-500 dark:text-gray-400">
                    No menu items found.
                  </td>
                </tr>
              ) : (
                paged.slice.map((row) => {
                  const busy = updatingStatusId === row.id;
                  return (
                    <tr key={row.id}>
                      <td className="px-2 py-2 align-middle">
                        {row.menuImage ? (
                          // Remote menu image URLs come from the API; avoid next/image domain config.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.menuImage}
                            alt=""
                            className="h-12 w-12 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-[10px] text-gray-400 dark:border-gray-600 dark:bg-gray-900">
                            No img
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3 text-sm font-medium text-gray-800 dark:text-gray-100">
                        {row.name}
                      </td>
                      <td className="px-2 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {row.categoryName}
                      </td>
                      <td className="px-2 py-3 text-sm text-gray-800 dark:text-gray-100">
                        {formatMoney(row.sellingPrice)}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={row.status}
                            disabled={busy}
                            onClick={() => void handleStatusToggle(row, !row.status)}
                            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-150 focus:outline-hidden focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                              row.status ? "bg-brand-500" : "bg-gray-200 dark:bg-white/15"
                            } ${busy ? "cursor-wait opacity-60" : "cursor-pointer"}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition duration-150 ${
                                row.status ? "translate-x-5" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {row.status ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDetails(row)}
                          >
                            Edit details
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => openAddon(row)}>
                            Add-ons
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openIngredient(row)}
                          >
                            Ingredients
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading ? (
          <ClientTablePagination
            page={paged.safePage}
            totalPages={paged.totalPages}
            totalItems={paged.total}
            pageSize={pageSize}
            rangeFrom={paged.rangeFrom}
            rangeTo={paged.rangeTo}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
            disabled={isLoading}
          />
        ) : null}
      </section>

      <Modal isOpen={detailsOpen} onClose={closeDetails} className="max-w-4xl p-5">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Update Menu Item</h3>
          </div>

          <form className="space-y-5" onSubmit={submitDetails}>
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Basic Details</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Menu ID</Label>
                  <Input value={detailsForm.menuId} disabled />
                </div>
                <div>
                  <Label>Menu Name</Label>
                  <Input
                    value={detailsForm.name}
                    onChange={(ev) => setDetailsForm((p) => ({ ...p, name: ev.target.value }))}
                    placeholder="Veg Biriyani"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Image Section</h4>
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="shrink-0">
                  <Label>Current Image</Label>
                  {detailsImagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={detailsImagePreview}
                      alt="Menu preview"
                      className="h-[90px] w-[90px] rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                    />
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No image uploaded</p>
                  )}
                </div>
                <div className="w-full md:max-w-md">
                  <Label htmlFor="details-menu-image-file">Upload New Image</Label>
                  <input
                    id="details-menu-image-file"
                    type="file"
                    accept="image/*"
                    onChange={(ev) => {
                      onDetailsImageFile(ev.target.files?.[0] ?? null);
                      ev.target.value = "";
                    }}
                    className="sr-only"
                  />
                  <div
                    onDragEnter={() => setDetailsImageDragActive(true)}
                    onDragOver={(ev) => {
                      ev.preventDefault();
                      ev.dataTransfer.dropEffect = "copy";
                      if (!detailsImageDragActive) setDetailsImageDragActive(true);
                    }}
                    onDragLeave={() => setDetailsImageDragActive(false)}
                    onDrop={onDetailsImageDrop}
                    className={`rounded-lg border border-dashed p-4 transition ${
                      detailsImageDragActive
                        ? "border-brand-400 bg-brand-50/50 dark:bg-brand-500/10"
                        : "border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    <label
                      htmlFor="details-menu-image-file"
                      className="block cursor-pointer text-center text-sm text-gray-600 dark:text-gray-300"
                    >
                      Drag and drop an image here, or click to browse
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {detailsImageUploadName || "Leave empty to keep current image"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Pricing</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Menu Cost</Label>
                  <Input
                    type="number"
                    min="0"
                    step={0.01}
                    value={detailsForm.cost}
                    onChange={(ev) => setDetailsForm((p) => ({ ...p, cost: ev.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Variant Prices</Label>
                  <Input
                    type="number"
                    min="0"
                    step={0.01}
                    value={detailsForm.defaultVariantPrice}
                    onChange={(ev) =>
                      setDetailsForm((p) => ({ ...p, defaultVariantPrice: ev.target.value }))
                    }
                    placeholder="Default Price"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" size="sm" onClick={closeDetails}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={detailsSaving}>
                {detailsSaving ? "Saving..." : "Update"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={addonOpen} onClose={closeAddon} className="max-w-md p-4 sm:p-6">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Add add-on to item</h3>
          <form className="space-y-4" onSubmit={submitAddon} noValidate>
            <div>
              <Label>Add-on</Label>
              <select
                value={addonForm.addonId}
                onChange={(ev) => setAddonForm((p) => ({ ...p, addonId: ev.target.value }))}
                className={sortSelectClass + " w-full"}
              >
                <option value="">Select add-on</option>
                {addons.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Price</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={addonForm.addonsPrice}
                onChange={(ev) => {
                  const next = ev.target.value.replace(",", ".");
                  if (next === "" || DECIMAL_INPUT_RE.test(next)) {
                    setAddonForm((p) => ({ ...p, addonsPrice: next }));
                  }
                }}
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={closeAddon}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={addonSaving}>
                {addonSaving ? "Saving..." : "Attach add-on"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={ingredientOpen} onClose={closeIngredient} className="max-w-4xl p-4 sm:p-6">
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Add Ingredient</h3>
          </div>

          <form className="space-y-5" onSubmit={submitIngredient}>
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Menu Info</h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label>Food Name</Label>
                  <Input
                    value={items.find((it) => it.id === ingredientItemId)?.name ?? ""}
                    disabled
                  />
                </div>
                <div>
                  <Label>Variant</Label>
                  <Input value="Default" disabled />
                </div>
                <div>
                  <Label>Variant Price</Label>
                  <Input
                    value={formatMoney(items.find((it) => it.id === ingredientItemId)?.sellingPrice ?? 0)}
                    disabled
                  />
                </div>
                <div>
                  <Label>Total Cost</Label>
                  <Input
                    value={formatMoney(items.find((it) => it.id === ingredientItemId)?.cost ?? 0)}
                    disabled
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800" />

            <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Add Ingredients</h4>
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-4 lg:items-end">
                <div>
                  <Label>Ingredient Item</Label>
                  <select
                    value={menuIngredientDraft.ingredientId}
                    onChange={(ev) => onPickMenuIngredient(ev.target.value)}
                    className={sortSelectClass + " w-full"}
                  >
                    <option value="">Select Item</option>
                    {inventoryItems.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    step={0.001}
                    value={menuIngredientDraft.quantity}
                    onChange={(ev) =>
                      setMenuIngredientDraft((p) => ({ ...p, quantity: ev.target.value }))
                    }
                    placeholder="0"
                    className="h-10! py-2"
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <select
                    value={menuIngredientDraft.unit}
                    onChange={(ev) =>
                      setMenuIngredientDraft((p) => ({ ...p, unit: ev.target.value }))
                    }
                    className={sortSelectClass + " w-full"}
                  >
                    <option value="">Select Unit</option>
                    {[...new Set(inventoryItems.map((i) => i.unit).filter(Boolean))].map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button type="button" size="sm" className="h-10 w-full" onClick={addMenuIngredientRow}>
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Add Ingredients for Addons</h4>
              <div>
                <Label>Select Addon</Label>
                <select
                  value={selectedAddonId}
                  onChange={(ev) => {
                    const addonId = ev.target.value;
                    setSelectedAddonId(addonId);
                    if (!addonId) return;
                    setAddonIngredientDrafts((prev) => ({
                      ...prev,
                      [addonId]: prev[addonId] ?? emptyIngredientDraft(),
                    }));
                  }}
                  className={sortSelectClass + " w-full"}
                >
                  <option value="">Select Addon</option>
                  {addons.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {addonGroupIds.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select an add-on to add ingredients.
                </p>
              ) : (
                <div className="space-y-3">
                  {addonGroupIds.map((addonId) => {
                    const addonName = addons.find((a) => a.id === addonId)?.name ?? addonId;
                    const addonDraft = addonIngredientDrafts[addonId] ?? emptyIngredientDraft();
                    const rows = addonRows.filter((row) => row.addonId === addonId);

                    return (
                      <div key={addonId} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h5 className="text-sm font-semibold text-gray-800 dark:text-white/90">{addonName}</h5>
                        </div>

                        <div className="grid grid-cols-1 gap-2 lg:grid-cols-4 lg:items-end">
                          <div>
                            <Label>Ingredient Item</Label>
                            <select
                              value={addonDraft.ingredientId}
                              onChange={(ev) => onPickAddonIngredient(addonId, ev.target.value)}
                              className={sortSelectClass + " w-full"}
                            >
                              <option value="">Select Item</option>
                              {inventoryItems.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                  {inv.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              min="0"
                              step={0.001}
                              value={addonDraft.quantity}
                              onChange={(ev) =>
                                setAddonIngredientDrafts((prev) => ({
                                  ...prev,
                                  [addonId]: {
                                    ...(prev[addonId] ?? emptyIngredientDraft()),
                                    quantity: ev.target.value,
                                  },
                                }))
                              }
                              placeholder="0"
                              className="h-10! py-2"
                            />
                          </div>
                          <div>
                            <Label>Unit</Label>
                            <select
                              value={addonDraft.unit}
                              onChange={(ev) =>
                                setAddonIngredientDrafts((prev) => ({
                                  ...prev,
                                  [addonId]: {
                                    ...(prev[addonId] ?? emptyIngredientDraft()),
                                    unit: ev.target.value,
                                  },
                                }))
                              }
                              className={sortSelectClass + " w-full"}
                            >
                              <option value="">Select Unit</option>
                              {[...new Set(inventoryItems.map((i) => i.unit).filter(Boolean))].map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              size="sm"
                              className="h-10 w-full"
                              onClick={() => addAddonIngredientRow(addonId)}
                            >
                              Add
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 overflow-x-auto">
                          <table className="min-w-full text-left text-sm">
                            <thead>
                              <tr className="text-gray-500 dark:text-gray-400">
                                <th className="pb-2 pr-3 font-medium">Ingredient Name</th>
                                <th className="pb-2 pr-3 font-medium">Quantity</th>
                                <th className="pb-2 pr-3 font-medium">Unit</th>
                                <th className="pb-2 font-medium">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {rows.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="py-3 text-gray-500">
                                    No ingredients added yet
                                  </td>
                                </tr>
                              ) : (
                                rows.map((row) => (
                                  <tr key={row.rowKey}>
                                    <td className="py-2 pr-3 text-gray-800 dark:text-gray-200">
                                      {row.ingredientName}
                                    </td>
                                    <td className="py-2 pr-3 text-gray-800 dark:text-gray-200">{row.quantity}</td>
                                    <td className="py-2 pr-3 text-gray-800 dark:text-gray-200">{row.unit}</td>
                                    <td className="py-2">
                                      <button
                                        type="button"
                                        className="text-sm text-red-600 hover:underline dark:text-red-400"
                                        onClick={() =>
                                          setAddedIngredients((prev) =>
                                            prev.filter((x) => x.rowKey !== row.rowKey)
                                          )
                                        }
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800" />

            <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Added Ingredients</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-gray-500 dark:text-gray-400">
                      <th className="pb-2 pr-3 font-medium">Item Name</th>
                      <th className="pb-2 pr-3 font-medium">Quantity</th>
                      <th className="pb-2 pr-3 font-medium">Unit</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {menuAddedIngredients.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-3 text-gray-500">
                          No ingredients added yet
                        </td>
                      </tr>
                    ) : (
                      menuAddedIngredients.map((row) => (
                        <tr key={row.rowKey}>
                          <td className="py-2 pr-3 text-gray-800 dark:text-gray-200">
                            {row.ingredientName}
                          </td>
                          <td className="py-2 pr-3 text-gray-800 dark:text-gray-200">{row.quantity}</td>
                          <td className="py-2 pr-3 text-gray-800 dark:text-gray-200">{row.unit}</td>
                          <td className="py-2">
                            <button
                              type="button"
                              className="text-sm text-red-600 hover:underline dark:text-red-400"
                              onClick={() =>
                                setAddedIngredients((prev) => prev.filter((x) => x.rowKey !== row.rowKey))
                              }
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={closeIngredient}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={ingredientSaving}>
                {ingredientSaving ? "Saving..." : "Save Ingredients"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
