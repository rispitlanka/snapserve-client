"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { CalenderIcon, PlusIcon } from "@/icons";
import { getAuthSession, ROLE_DASHBOARD_ROUTE } from "@/lib/auth";
import type {
  InventoryBrand,
  InventoryCategory,
  InventorySubCategory,
} from "@/lib/inventory";
import {
  createInventoryBrand,
  createInventoryCategory,
  createInventoryItem,
  createInventorySubCategory,
  listInventoryBrands,
  listInventoryCategories,
  listInventoryItems,
  listInventorySubCategories,
} from "@/lib/inventory";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type ItemFormState = {
  name: string;
  categoryId: string;
  subCategoryId: string;
  brandId: string;
  unit: string;
  expiryDate: string;
};

type CategoryCreateFormState = { name: string };
type SubCategoryCreateFormState = { name: string; categoryId: string };
type BrandCreateFormState = { name: string };

const emptyItemForm: ItemFormState = {
  name: "",
  categoryId: "",
  subCategoryId: "",
  brandId: "",
  unit: "PCS",
  expiryDate: "",
};

const emptyCategoryCreateForm: CategoryCreateFormState = { name: "" };
const emptySubCategoryCreateForm: SubCategoryCreateFormState = { name: "", categoryId: "" };
const emptyBrandCreateForm: BrandCreateFormState = { name: "" };

const detectUnitFromName = (name: string): "KG" | "L" | "PCS" => {
  const value = name.trim().toLowerCase();
  if (!value) return "PCS";

  const liquidKeywords = ["milk", "oil", "juice", "water", "syrup", "drink", "beverage", "litre", "liter"];
  const weightKeywords = [
    "rice",
    "flour",
    "sugar",
    "salt",
    "meat",
    "beef",
    "chicken",
    "fish",
    "fruit",
    "vegetable",
    "veg",
    "kg",
    "kilo",
    "kilogram",
  ];

  const tokens = value.split(/[^a-z]+/).filter(Boolean);

  const matchesKeyword = (keywords: string[]) =>
    keywords.some(
      (word) =>
        value.includes(word) ||
        tokens.some((token) => word.startsWith(token) || token.startsWith(word))
    );

  // Match anywhere in the phrase, while still supporting early typing.
  if (matchesKeyword(liquidKeywords)) return "L";
  if (matchesKeyword(weightKeywords)) return "KG";

  return "PCS";
};

export default function AddInventoryItemClient() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [subCategories, setSubCategories] = useState<InventorySubCategory[]>([]);
  const [brands, setBrands] = useState<InventoryBrand[]>([]);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingSubCategory, setIsCreatingSubCategory] = useState(false);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [existingItemNames, setExistingItemNames] = useState<string[]>([]);
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm);
  const [categoryCreateForm, setCategoryCreateForm] = useState<CategoryCreateFormState>(emptyCategoryCreateForm);
  const [subCategoryCreateForm, setSubCategoryCreateForm] = useState<SubCategoryCreateFormState>(emptySubCategoryCreateForm);
  const [brandCreateForm, setBrandCreateForm] = useState<BrandCreateFormState>(emptyBrandCreateForm);

  const getScopedAdminSession = useCallback(() => {
    const session = getAuthSession();
    if (!session) {
      router.replace("/signin");
      return null;
    }

    if (session.user.role !== "admin") {
      router.replace(ROLE_DASHBOARD_ROUTE[session.user.role]);
      return null;
    }

    if (!session.user.restaurantId) {
      toast.error("Invalid session scope. Please sign in again.");
      router.replace("/signin");
      return null;
    }

    return session;
  }, [router]);

  useEffect(() => {
    const initialize = async () => {
      const session = getScopedAdminSession();
      if (!session) {
        return;
      }

      setSessionReady(true);
      try {
        const [categoryList, subCategoryList, brandList, existingItems] = await Promise.all([
          listInventoryCategories(session.accessToken),
          listInventorySubCategories(session.accessToken),
          listInventoryBrands(session.accessToken),
          listInventoryItems(session.accessToken),
        ]);

        setCategories(categoryList);
        setSubCategories(subCategoryList);
        setBrands(brandList);
        setExistingItemNames(
          Array.from(
            new Set(
              existingItems
                .map((item) => item.name?.trim())
                .filter((name): name is string => Boolean(name))
            )
          )
        );

        const defaultCategoryId = categoryList[0]?.id ?? "";
        const defaultSubCategoryId =
          subCategoryList.find((entry) => entry.categoryId === defaultCategoryId)?.id ??
          subCategoryList[0]?.id ??
          "";

        setItemForm({
          name: "",
          categoryId: defaultCategoryId,
          subCategoryId: defaultSubCategoryId,
          brandId: brandList[0]?.id ?? "",
          unit: "PCS",
          expiryDate: "",
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load inventory data.");
      }
    };

    void initialize();
  }, [getScopedAdminSession]);

  const filteredSubCategories = useMemo(() => {
    if (!itemForm.categoryId) return subCategories;
    return subCategories.filter((subCategory) => subCategory.categoryId === itemForm.categoryId);
  }, [itemForm.categoryId, subCategories]);

  const itemNameSuggestions = useMemo(() => {
    const query = itemForm.name.trim().toLowerCase();
    if (!query) return [];
    return existingItemNames
      .filter((name) => name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [existingItemNames, itemForm.name]);

  const openCategoryModal = () => {
    setCategoryCreateForm(emptyCategoryCreateForm);
    setIsCategoryModalOpen(true);
  };

  const openSubCategoryModal = () => {
    setSubCategoryCreateForm({
      name: "",
      categoryId: itemForm.categoryId || categories[0]?.id || "",
    });
    setIsSubCategoryModalOpen(true);
  };

  const openBrandModal = () => {
    setBrandCreateForm(emptyBrandCreateForm);
    setIsBrandModalOpen(true);
  };

  const handleCreateCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = categoryCreateForm.name.trim();
    if (!name) {
      toast.error("Category name is required.");
      return;
    }

    const session = getScopedAdminSession();
    if (!session) {
      toast.error("Session not found. Please sign in again.");
      return;
    }

    setIsCreatingCategory(true);
    try {
      const created = await createInventoryCategory(session.accessToken, { name });
      setCategories((current) => [...current, created]);
      setItemForm((current) => ({
        ...current,
        categoryId: created.id,
        subCategoryId: "",
      }));
      setIsCategoryModalOpen(false);
      toast.success("Category created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create category.");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCreateSubCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = subCategoryCreateForm.name.trim();
    if (!name) {
      toast.error("Sub-category name is required.");
      return;
    }

    if (!subCategoryCreateForm.categoryId) {
      toast.error("Category is required.");
      return;
    }

    const session = getScopedAdminSession();
    if (!session) {
      toast.error("Session not found. Please sign in again.");
      return;
    }

    setIsCreatingSubCategory(true);
    try {
      const created = await createInventorySubCategory(session.accessToken, {
        name,
        categoryId: subCategoryCreateForm.categoryId,
      });
      setSubCategories((current) => [...current, created]);
      setItemForm((current) => ({
        ...current,
        categoryId: created.categoryId || current.categoryId,
        subCategoryId: created.id,
      }));
      setIsSubCategoryModalOpen(false);
      toast.success("Sub-category created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create sub-category.");
    } finally {
      setIsCreatingSubCategory(false);
    }
  };

  const handleCreateBrand = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = brandCreateForm.name.trim();
    if (!name) {
      toast.error("Brand name is required.");
      return;
    }

    const session = getScopedAdminSession();
    if (!session) {
      toast.error("Session not found. Please sign in again.");
      return;
    }

    setIsCreatingBrand(true);
    try {
      const created = await createInventoryBrand(session.accessToken, { name });
      setBrands((current) => [...current, created]);
      setItemForm((current) => ({ ...current, brandId: created.id }));
      setIsBrandModalOpen(false);
      toast.success("Brand created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create brand.");
    } finally {
      setIsCreatingBrand(false);
    }
  };

  const handleItemSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = itemForm.name.trim();
    const trimmedUnit = itemForm.unit.trim();
    const trimmedExpiryDate = itemForm.expiryDate.trim();

    if (!trimmedName) {
      toast.error("Item name is required.");
      return;
    }

    if (!itemForm.categoryId) {
      toast.error("Category is required.");
      return;
    }

    if (!itemForm.brandId) {
      toast.error("Brand is required.");
      return;
    }

    if (!trimmedUnit) {
      toast.error("Unit is required.");
      return;
    }

    const session = getScopedAdminSession();
    if (!session) {
      toast.error("Session not found. Please sign in again.");
      return;
    }

    setIsCreatingItem(true);
    try {
      await createInventoryItem(session.accessToken, {
        name: trimmedName,
        categoryId: itemForm.categoryId,
        ...(itemForm.subCategoryId ? { subCategoryId: itemForm.subCategoryId } : {}),
        brandId: itemForm.brandId,
        unit: trimmedUnit,
        ...(trimmedExpiryDate ? { expiryDate: trimmedExpiryDate } : {}),
      });

      toast.success("Inventory item created successfully.");
      router.push("/manage-inventory-items");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create inventory item.";
      toast.error(message);
    } finally {
      setIsCreatingItem(false);
    }
  };

  const selectClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
  const inputClass =
    "h-11 rounded-lg border-gray-300 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-gray-500";
  const fieldLabelClass = "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300";

  if (!sessionReady) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="mb-6 border-b border-gray-200 pb-5 dark:border-gray-800">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <span aria-hidden="true">←</span>
            <span>Back</span>
          </button>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Add Inventory Item</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Create a new tracked inventory item for your restaurant.
          </p>
        </div>
      </div>

      <div className="w-full">
        <form
          className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/40 sm:p-6"
          onSubmit={handleItemSave}
        >
          <div>
            <Label htmlFor="item-name" className={fieldLabelClass}>Name</Label>
            <Input
              id="item-name"
              type="text"
              list="inventory-item-name-suggestions"
              autoComplete="off"
              value={itemForm.name}
              onChange={(event) =>
                setItemForm((current) => {
                  const nextName = event.target.value;
                  return {
                    ...current,
                    name: nextName,
                    unit: detectUnitFromName(nextName),
                  };
                })
              }
              placeholder="Enter inventory item name"
              className={inputClass}
            />
            {itemNameSuggestions.length > 0 ? (
              <datalist id="inventory-item-name-suggestions">
                {itemNameSuggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <Label htmlFor="item-category" className="mb-0 text-sm font-medium text-gray-700 dark:text-gray-300">Category</Label>
                <button
                  type="button"
                  onClick={openCategoryModal}
                  aria-label="Add category"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <PlusIcon className="size-4" />
                </button>
              </div>
              <div>
                <select
                  id="item-category"
                  value={itemForm.categoryId}
                  onChange={(event) => {
                    const nextCategoryId = event.target.value;
                    const nextSubCategoryId = subCategories.find((entry) => entry.categoryId === nextCategoryId)?.id ?? "";
                    setItemForm((current) => ({ ...current, categoryId: nextCategoryId, subCategoryId: nextSubCategoryId }));
                  }}
                  className={selectClass}
                >
                  <option value="" disabled>Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <Label htmlFor="item-sub-category" className="mb-0 text-sm font-medium text-gray-700 dark:text-gray-300">Sub-category</Label>
                <button
                  type="button"
                  onClick={openSubCategoryModal}
                  aria-label="Add sub-category"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <PlusIcon className="size-4" />
                </button>
              </div>
              <div>
                <select
                  id="item-sub-category"
                  value={itemForm.subCategoryId}
                  onChange={(event) => setItemForm((current) => ({ ...current, subCategoryId: event.target.value }))}
                  className={selectClass}
                >
                  <option value="">No sub-category</option>
                  {filteredSubCategories.map((subCategory) => (
                    <option key={subCategory.id} value={subCategory.id}>{subCategory.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <Label htmlFor="item-brand" className="mb-0 text-sm font-medium text-gray-700 dark:text-gray-300">Brand</Label>
                <button
                  type="button"
                  onClick={openBrandModal}
                  aria-label="Add brand"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <PlusIcon className="size-4" />
                </button>
              </div>
              <div>
                <select
                  id="item-brand"
                  value={itemForm.brandId}
                  onChange={(event) => setItemForm((current) => ({ ...current, brandId: event.target.value }))}
                  className={selectClass}
                >
                  <option value="" disabled>Select brand</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            <div>
              <Label htmlFor="item-unit" className={fieldLabelClass}>Type (Auto-detected)</Label>
              <input
                id="item-unit"
                type="text"
                value={itemForm.unit}
                readOnly
                className={`h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 ${inputClass}`}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="item-expiry" className={fieldLabelClass}>Expiry Date</Label>
            <div className="relative">
              <Input
                id="item-expiry"
                type="date"
                value={itemForm.expiryDate}
                onChange={(event) => setItemForm((current) => ({ ...current, expiryDate: event.target.value }))}
                className={`${inputClass} pr-12`}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                <CalenderIcon className="size-5" />
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-800 sm:flex-row sm:items-center">
            <Button
              type="button"
              size="md"
              variant="outline"
              onClick={() => router.back()}
              className="rounded-xl px-6 py-3"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="md"
              disabled={isCreatingItem}
              className="rounded-xl px-7 py-3"
            >
              {isCreatingItem ? "Saving..." : "Save Item"}
            </Button>
          </div>
        </form>
      </div>

      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} className="max-w-md p-4 sm:p-5">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Add Category</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create a category without leaving this page.</p>
          </div>

          <form className="space-y-3" onSubmit={handleCreateCategory}>
            <div>
              <Label htmlFor="new-category-name">Name</Label>
              <Input
                id="new-category-name"
                type="text"
                value={categoryCreateForm.name}
                onChange={(event) => setCategoryCreateForm({ name: event.target.value })}
                placeholder="Vegetables"
                className={inputClass}
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreatingCategory}>
                {isCreatingCategory ? "Saving..." : "Save Category"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={isSubCategoryModalOpen} onClose={() => setIsSubCategoryModalOpen(false)} className="max-w-md p-4 sm:p-5">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Add Sub-category</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create a sub-category and link it to a category.</p>
          </div>

          <form className="space-y-3" onSubmit={handleCreateSubCategory}>
            <div>
              <Label htmlFor="new-sub-category-name">Name</Label>
              <Input
                id="new-sub-category-name"
                type="text"
                value={subCategoryCreateForm.name}
                onChange={(event) => setSubCategoryCreateForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Leafy"
                className={inputClass}
              />
            </div>

            <div>
              <Label htmlFor="new-sub-category-category">Category</Label>
              <select
                id="new-sub-category-category"
                value={subCategoryCreateForm.categoryId}
                onChange={(event) => setSubCategoryCreateForm((current) => ({ ...current, categoryId: event.target.value }))}
                className={selectClass}
              >
                <option value="" disabled>Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsSubCategoryModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreatingSubCategory}>
                {isCreatingSubCategory ? "Saving..." : "Save Sub-category"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={isBrandModalOpen} onClose={() => setIsBrandModalOpen(false)} className="max-w-md p-4 sm:p-5">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Add Brand</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create a brand without leaving this page.</p>
          </div>

          <form className="space-y-3" onSubmit={handleCreateBrand}>
            <div>
              <Label htmlFor="new-brand-name">Name</Label>
              <Input
                id="new-brand-name"
                type="text"
                value={brandCreateForm.name}
                onChange={(event) => setBrandCreateForm({ name: event.target.value })}
                placeholder="FreshCo"
                className={inputClass}
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsBrandModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreatingBrand}>
                {isCreatingBrand ? "Saving..." : "Save Brand"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </section>
  );
}
