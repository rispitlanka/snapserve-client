"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { getAuthSession, ROLE_DASHBOARD_ROUTE } from "@/lib/auth";
import type { CreateMenuItemPayload, MenuType } from "@/lib/menu";
import {
    createMenuCategory,
    createMenuItem,
    listMenuAddons,
    listMenuCategories,
    listMenuVariants,
} from "@/lib/menu";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

type CategoryOption = { id: string; name: string; status: boolean };
type VariantOption = { id: string; name: string; categoryLabel: string };
type AddonOption = { id: string; name: string };

type VariantRow = { rowKey: string; variantId: string; label: string; price: number };
type AddonRow = { rowKey: string; addonId: string; label: string; price: number };

const sortSelectClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const DECIMAL_INPUT_RE = /^\d*\.?\d{0,2}$/;

const getValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
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

const normalizeCategories = (raw: unknown[]): CategoryOption[] =>
  raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((row) => {
      const id = getValue(row, ["id", "categoryId"]);
      if (!id) return null;
      const name = getValue(row, ["name", "categoryName"]) || "—";
      const status = getBool(row, ["status", "active", "isActive"]);
      return { id, name, status };
    })
    .filter((c): c is CategoryOption => c !== null);

const normalizeVariants = (raw: unknown[]): VariantOption[] =>
  raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((row) => {
      const id = getValue(row, ["id", "variantId"]);
      if (!id) return null;
      const name = getValue(row, ["name", "variantName"]) || "—";
      const cat = getValue(row, ["variantCategory", "category", "variant_category"]);
      return { id, name, categoryLabel: cat || "SIZE" };
    })
    .filter((v): v is VariantOption => v !== null);

const normalizeAddons = (raw: unknown[]): AddonOption[] =>
  raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((row) => {
      const id = getValue(row, ["id", "addonId"]);
      if (!id) return null;
      const name = getValue(row, ["name", "addonName"]) || "—";
      return { id, name };
    })
    .filter((a): a is AddonOption => a !== null);

const newRowKey = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());

const toggleSwitchClass = (on: boolean) =>
  `relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-150 focus:outline-hidden focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
    on ? "bg-brand-500" : "bg-gray-200 dark:bg-white/15"
  }`;

const toggleKnobClass = (on: boolean) =>
  `pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition duration-150 ${
    on ? "translate-x-5" : "translate-x-0.5"
  }`;

export default function MenuItemAddClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [addons, setAddons] = useState<AddonOption[]>([]);

  const [menuId, setMenuId] = useState("");
  const [menuName, setMenuName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [typeDineIn, setTypeDineIn] = useState(true);
  const [typeTakeaway, setTypeTakeaway] = useState(true);
  const [kotEnabled, setKotEnabled] = useState(false);
  const [cost, setCost] = useState("");
  const [menuImageData, setMenuImageData] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDragActive, setImageDragActive] = useState(false);
  const imageDragDepth = useRef(0);

  const [variantDraftId, setVariantDraftId] = useState("");
  const [variantDraftPrice, setVariantDraftPrice] = useState("");
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);

  const [addonDraftId, setAddonDraftId] = useState("");
  const [addonDraftPrice, setAddonDraftPrice] = useState("");
  const [addonRows, setAddonRows] = useState<AddonRow[]>([]);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const activeCategories = useMemo(() => categories.filter((c) => c.status), [categories]);

  const loadData = useCallback(async () => {
    const session = getAuthSession();
    if (!session) return;
    try {
      const [cats, vars, adds] = await Promise.all([
        listMenuCategories(session.accessToken),
        listMenuVariants(session.accessToken),
        listMenuAddons(session.accessToken),
      ]);
      setCategories(normalizeCategories(cats as unknown[]));
      setVariants(normalizeVariants(vars as unknown[]));
      setAddons(normalizeAddons(adds as unknown[]));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load form data.");
    }
  }, []);

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      router.replace("/signin");
      return;
    }
    if (session.user.role !== "admin") {
      router.replace(ROLE_DASHBOARD_ROUTE[session.user.role]);
      return;
    }
    setReady(true);
    void loadData();
  }, [router, loadData]);

  const onImageFile = (file: File | null) => {
    if (!file) {
      setMenuImageData(null);
      setImagePreview(null);
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
        setMenuImageData(result);
        setImagePreview(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const onImageDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    imageDragDepth.current += 1;
    setImageDragActive(true);
  };

  const onImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    imageDragDepth.current -= 1;
    if (imageDragDepth.current <= 0) {
      imageDragDepth.current = 0;
      setImageDragActive(false);
    }
  };

  const onImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    imageDragDepth.current = 0;
    setImageDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onImageFile(file);
  };

  const addVariantRow = () => {
    if (!variantDraftId) {
      toast.error("Select a variant.");
      return;
    }
    if (!variantDraftPrice.trim()) {
      toast.error("Variant price is required.");
      return;
    }
    const price = Number(variantDraftPrice);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid variant price.");
      return;
    }
    if (variantRows.some((r) => r.variantId === variantDraftId)) {
      toast.error("That variant is already added.");
      return;
    }
    const v = variants.find((x) => x.id === variantDraftId);
    setVariantRows((prev) => [
      ...prev,
      {
        rowKey: newRowKey(),
        variantId: variantDraftId,
        label: v ? `${v.categoryLabel}: ${v.name}` : variantDraftId,
        price,
      },
    ]);
    setVariantDraftId("");
    setVariantDraftPrice("");
  };

  const addAddonRow = () => {
    if (!addonDraftId) {
      toast.error("Select an add-on.");
      return;
    }
    if (!addonDraftPrice.trim()) {
      toast.error("Add-on price is required.");
      return;
    }
    const price = Number(addonDraftPrice);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid add-on price.");
      return;
    }
    if (addonRows.some((r) => r.addonId === addonDraftId)) {
      toast.error("That add-on is already added.");
      return;
    }
    const selectedAddon = addons.find((x) => x.id === addonDraftId);
    setAddonRows((prev) => [
      ...prev,
      {
        rowKey: newRowKey(),
        addonId: addonDraftId,
        label: selectedAddon?.name ?? addonDraftId,
        price,
      },
    ]);
    setAddonDraftId("");
    setAddonDraftPrice("");
  };

  const submitNewCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) {
      toast.error("Category name is required.");
      return;
    }
    const session = getAuthSession();
    if (!session) return;
    setCreatingCategory(true);
    try {
      await createMenuCategory(session.accessToken, { name, status: true });
      toast.success("Category created.");
      setNewCategoryName("");
      setCategoryModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create category.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleCancel = () => {
    router.push("/manage-menu/list");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedMenuId = menuId.trim();
    if (!normalizedMenuId) {
      toast.error("Menu ID is required.");
      return;
    }
    const name = menuName.trim();
    if (!name) {
      toast.error("Menu name is required.");
      return;
    }
    if (!categoryId) {
      toast.error("Menu category is required.");
      return;
    }
    if (!typeDineIn && !typeTakeaway) {
      toast.error("Select at least one menu type.");
      return;
    }
    const costNum = Number(cost);
    if (!Number.isFinite(costNum) || costNum < 0) {
      toast.error("Enter a valid cost (0 or greater).");
      return;
    }

    const menuType: MenuType[] = [];
    if (typeDineIn) menuType.push("DINEIN");
    if (typeTakeaway) menuType.push("TAKE_AWAY");

    const session = getAuthSession();
    if (!session) {
      toast.error("Session not found.");
      return;
    }

    const payload: CreateMenuItemPayload = {
      id: normalizedMenuId,
      name,
      categoryId,
      menuType,
      kotEnabled,
      cost: costNum,
      menuImage: menuImageData ?? undefined,
      status: true,
      varients:
        variantRows.length > 0
          ? variantRows.map((r) => ({ id: r.variantId, varientPrice: r.price }))
          : undefined,
      addons:
        addonRows.length > 0
          ? addonRows.map((r) => ({ id: r.addonId, addonsPrice: r.price }))
          : undefined,
    };

    setSaving(true);
    try {
      await createMenuItem(session.accessToken, payload);
      toast.success("Menu item created.");
      router.push("/manage-menu/list");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create menu item.");
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-10 lg:items-start">
        <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/3 lg:col-span-7">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Add Menu Item</h1>
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <Label>Menu ID</Label>
              <Input
                value={menuId}
                onChange={(e) => setMenuId(e.target.value)}
                placeholder="Enter menu ID"
              />
            </div>

            <div>
              <Label>
                Menu Name <span className="text-red-500">*</span>
              </Label>
              <Input value={menuName} onChange={(e) => setMenuName(e.target.value)} placeholder="Name" />
            </div>

            <div>
              <Label>
                Menu Category <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={sortSelectClass + " sm:min-w-0 sm:flex-1"}
                  required
                >
                  <option value="">Select category</option>
                  {activeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" size="sm" onClick={() => setCategoryModalOpen(true)}>
                  Add new category
                </Button>
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Menu Type <span className="text-red-500">*</span>
              </span>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-3 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">Dine-In</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={typeDineIn}
                    onClick={() => setTypeDineIn((v) => !v)}
                    className={toggleSwitchClass(typeDineIn)}
                  >
                    <span className={toggleKnobClass(typeDineIn)} />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-3 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">Takeaway</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={typeTakeaway}
                    onClick={() => setTypeTakeaway((v) => !v)}
                    className={toggleSwitchClass(typeTakeaway)}
                  >
                    <span className={toggleKnobClass(typeTakeaway)} />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-3 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    Is KOT enabled <span className="text-red-500">*</span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={kotEnabled}
                    onClick={() => setKotEnabled((v) => !v)}
                    className={toggleSwitchClass(kotEnabled)}
                  >
                    <span className={toggleKnobClass(kotEnabled)} />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <Label>Cost</Label>
              <Input
                type="number"
                min="0"
                step={0.01}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Menu Image</Label>
              <div
                onDragEnter={onImageDragEnter}
                onDragLeave={onImageDragLeave}
                onDragOver={onImageDragOver}
                onDrop={onImageDrop}
                className={`mt-1 rounded-xl border-2 border-dashed transition-colors ${
                  imageDragActive
                    ? "border-brand-500 bg-brand-50/80 dark:bg-brand-500/10"
                    : "border-gray-300 bg-gray-50/80 dark:border-gray-600 dark:bg-gray-900/40"
                }`}
              >
                <input
                  id="menu-image-file"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    onImageFile(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
                <label
                  htmlFor="menu-image-file"
                  className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 px-4 py-8 text-center"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Drag and drop an image here
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">or click to browse</span>
                  <span className="mt-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white">
                    Choose file
                  </span>
                </label>
              </div>
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt=""
                  className="mt-3 h-32 max-w-xs rounded-lg border border-gray-200 object-contain dark:border-gray-700"
                />
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Variants</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                <select
                  value={variantDraftId}
                  onChange={(e) => setVariantDraftId(e.target.value)}
                  className={sortSelectClass + " sm:min-w-[12rem] sm:flex-1"}
                >
                  <option value="">Select Variant</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.categoryLabel}: {v.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="text"
                  inputMode="decimal"
                  pattern="^\\d*\\.?\\d{0,2}$"
                  value={variantDraftPrice}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === "" || DECIMAL_INPUT_RE.test(next)) {
                      setVariantDraftPrice(next);
                    }
                  }}
                  placeholder="Variant Price"
                  className="sm:max-w-[10rem]"
                />
                <Button type="button" variant="outline" size="sm" onClick={addVariantRow}>
                  Add variant
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Addons</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                <select
                  value={addonDraftId}
                  onChange={(e) => setAddonDraftId(e.target.value)}
                  className={sortSelectClass + " sm:min-w-[12rem] sm:flex-1"}
                >
                  <option value="">Select Addons</option>
                  {addons.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="text"
                  inputMode="decimal"
                  pattern="^\\d*\\.?\\d{0,2}$"
                  value={addonDraftPrice}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === "" || DECIMAL_INPUT_RE.test(next)) {
                      setAddonDraftPrice(next);
                    }
                  }}
                  placeholder="Addons Price"
                  className="sm:max-w-[10rem]"
                />
                <Button type="button" variant="outline" size="sm" onClick={addAddonRow}>
                  Add addon
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
              <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving..." : "Add Menu"}
              </Button>
            </div>
          </form>
        </section>

        <aside className="flex w-full min-w-0 flex-col gap-6 lg:col-span-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/3">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Variants</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-500 dark:text-gray-400">
                    <th className="pb-2 pr-2 font-medium">Variant</th>
                    <th className="pb-2 pr-2 font-medium">Price</th>
                    <th className="pb-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {variantRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-3 text-gray-500">
                        No variants yet.
                      </td>
                    </tr>
                  ) : (
                    variantRows.map((r) => (
                      <tr key={r.rowKey}>
                        <td className="py-2 pr-2 text-gray-800 dark:text-gray-200">{r.label}</td>
                        <td className="py-2 pr-2 text-gray-800 dark:text-gray-200">{r.price.toFixed(2)}</td>
                        <td className="py-2">
                          <button
                            type="button"
                            className="text-sm text-red-600 hover:underline dark:text-red-400"
                            onClick={() =>
                              setVariantRows((prev) => prev.filter((x) => x.rowKey !== r.rowKey))
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={() => setVariantRows([])}
            >
              Clear Variants
            </Button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/3">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Addons</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-500 dark:text-gray-400">
                    <th className="pb-2 pr-2 font-medium">Addon Name</th>
                    <th className="pb-2 pr-2 font-medium">Price</th>
                    <th className="pb-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {addonRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-3 text-gray-500">
                        No add-ons yet.
                      </td>
                    </tr>
                  ) : (
                    addonRows.map((r) => (
                      <tr key={r.rowKey}>
                        <td className="py-2 pr-2 text-gray-800 dark:text-gray-200">
                          {r.label}
                        </td>
                        <td className="py-2 pr-2 text-gray-800 dark:text-gray-200">{r.price.toFixed(2)}</td>
                        <td className="py-2">
                          <button
                            type="button"
                            className="text-sm text-red-600 hover:underline dark:text-red-400"
                            onClick={() =>
                              setAddonRows((prev) => prev.filter((x) => x.rowKey !== r.rowKey))
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={() => setAddonRows([])}
            >
              Clear Addons
            </Button>
          </div>
        </aside>
      </div>

      <Modal
        isOpen={categoryModalOpen}
        onClose={() => !creatingCategory && setCategoryModalOpen(false)}
        className="max-w-md p-4 sm:p-6"
      >
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">New category</h3>
        <form className="mt-4 space-y-4" onSubmit={submitNewCategory}>
          <div>
            <Label>Name</Label>
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setCategoryModalOpen(false)}>
              Close
            </Button>
            <Button type="submit" size="sm" disabled={creatingCategory}>
              {creatingCategory ? "Saving..." : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
