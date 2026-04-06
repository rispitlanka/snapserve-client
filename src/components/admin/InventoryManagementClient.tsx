"use client";

import MetricCard from "@/components/common/MetricCard";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { BoxCubeIcon, FolderIcon, GroupIcon, TableIcon } from "@/icons";
import { getAuthSession, ROLE_DASHBOARD_ROUTE } from "@/lib/auth";
import type {
    InventoryBrand,
    InventoryCategory,
    InventoryItem,
    InventoryItemHistoryEntry,
    InventorySubCategory,
} from "@/lib/inventory";
import {
    createInventoryBrand,
    createInventoryCategory,
    createInventoryItem,
    createInventorySubCategory,
    getInventoryItem,
    getInventoryItemHistory,
    listInventoryBrands,
    listInventoryCategories,
    listInventoryItems,
    listInventorySubCategories,
} from "@/lib/inventory";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type InventoryTab = "categories" | "subCategories" | "brands" | "items";
type InventorySection = "overview" | InventoryTab;

type CategoryFormState = { name: string };
type SubCategoryFormState = { name: string; categoryId: string };
type BrandFormState = { name: string };
type ItemFormState = {
  name: string;
  categoryId: string;
  subCategoryId: string;
  brandId: string;
  unit: string;
  expiryDate: string;
};

const emptyCategoryForm: CategoryFormState = { name: "" };
const emptySubCategoryForm: SubCategoryFormState = { name: "", categoryId: "" };
const emptyBrandForm: BrandFormState = { name: "" };
const emptyItemForm: ItemFormState = {
  name: "",
  categoryId: "",
  subCategoryId: "",
  brandId: "",
  unit: "PCS",
  expiryDate: "",
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";
  return date.toLocaleDateString();
};

type InventoryManagementClientProps = {
  section?: InventorySection;
};

export default function InventoryManagementClient({
  section = "overview",
}: InventoryManagementClientProps) {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [subCategories, setSubCategories] = useState<InventorySubCategory[]>([]);
  const [brands, setBrands] = useState<InventoryBrand[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemHistory, setItemHistory] = useState<InventoryItemHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isItemDetailLoading, setIsItemDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [itemDetailError, setItemDetailError] = useState("");

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isItemDetailModalOpen, setIsItemDetailModalOpen] = useState(false);

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingSubCategory, setIsCreatingSubCategory] = useState(false);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [isCreatingItem, setIsCreatingItem] = useState(false);

  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [subCategoryForm, setSubCategoryForm] = useState<SubCategoryFormState>(emptySubCategoryForm);
  const [brandForm, setBrandForm] = useState<BrandFormState>(emptyBrandForm);
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm);

  const [categoryError, setCategoryError] = useState("");
  const [subCategoryError, setSubCategoryError] = useState("");
  const [brandError, setBrandError] = useState("");
  const [itemCreateError, setItemCreateError] = useState("");

  const [categorySuccess, setCategorySuccess] = useState("");
  const [subCategorySuccess, setSubCategorySuccess] = useState("");
  const [brandSuccess, setBrandSuccess] = useState("");
  const [itemCreateSuccess, setItemCreateSuccess] = useState("");

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
      setError("Invalid session scope. Please sign in again.");
      router.replace("/signin");
      return null;
    }

    return session;
  }, [router]);

  const reloadInventory = async (accessToken: string) => {
    const [categoryList, subCategoryList, brandList, itemList] = await Promise.all([
      listInventoryCategories(accessToken),
      listInventorySubCategories(accessToken),
      listInventoryBrands(accessToken),
      listInventoryItems(accessToken),
    ]);

    setCategories(categoryList);
    setSubCategories(subCategoryList);
    setBrands(brandList);
    setItems(itemList);
    setSelectedItemId((current) => current ?? itemList[0]?.id ?? null);
  };

  const reloadSelectedItem = async (accessToken: string, itemId: string) => {
    const [detail, history] = await Promise.all([
      getInventoryItem(accessToken, itemId),
      getInventoryItemHistory(accessToken, itemId),
    ]);

    setSelectedItem(detail);
    setItemHistory(history);
  };

  useEffect(() => {
    const initialize = async () => {
      const session = getScopedAdminSession();
      if (!session) {
        return;
      }

      setSessionReady(true);
      setIsLoading(true);
      setError("");
      setItemDetailError("");

      try {
        await reloadInventory(session.accessToken);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load inventory data.");
      } finally {
        setIsLoading(false);
      }
    };

    void initialize();
  }, [getScopedAdminSession]);

  useEffect(() => {
    const loadSelectedItem = async () => {
      if (!selectedItemId) {
        setSelectedItem(null);
        setItemHistory([]);
        return;
      }

      const session = getScopedAdminSession();
      if (!session) return;

      setIsItemDetailLoading(true);
      setItemDetailError("");

      try {
        await reloadSelectedItem(session.accessToken, selectedItemId);
      } catch (err) {
        setItemDetailError(err instanceof Error ? err.message : "Failed to load item details.");
        setSelectedItem(null);
        setItemHistory([]);
      } finally {
        setIsItemDetailLoading(false);
      }
    };

    void loadSelectedItem();
  }, [getScopedAdminSession, selectedItemId]);

  const activeCounts = useMemo(
    () => ({
      categories: categories.length,
      subCategories: subCategories.length,
      brands: brands.length,
      items: items.length,
    }),
    [categories.length, subCategories.length, brands.length, items.length]
  );

  const filteredSubCategories = useMemo(() => {
    if (!itemForm.categoryId) return subCategories;
    return subCategories.filter((subCategory) => subCategory.categoryId === itemForm.categoryId);
  }, [itemForm.categoryId, subCategories]);

  const categoryNameById = useMemo(() => {
    return categories.reduce<Record<string, string>>((accumulator, category) => {
      accumulator[category.id] = category.name;
      return accumulator;
    }, {});
  }, [categories]);

  const renderEmptyState = (message: string) => (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
      {message}
    </div>
  );

  const openCategoryModal = () => {
    setCategoryError("");
    setCategorySuccess("");
    setCategoryForm(emptyCategoryForm);
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setCategoryForm(emptyCategoryForm);
  };

  const openSubCategoryModal = () => {
    setSubCategoryError("");
    setSubCategorySuccess("");
    setSubCategoryForm({ name: "", categoryId: categories[0]?.id ?? "" });
    setIsSubCategoryModalOpen(true);
  };

  const closeSubCategoryModal = () => {
    setIsSubCategoryModalOpen(false);
    setSubCategoryForm(emptySubCategoryForm);
  };

  const openBrandModal = () => {
    setBrandError("");
    setBrandSuccess("");
    setBrandForm(emptyBrandForm);
    setIsBrandModalOpen(true);
  };

  const closeBrandModal = () => {
    setIsBrandModalOpen(false);
    setBrandForm(emptyBrandForm);
  };

  const openItemModal = () => {
    setItemCreateError("");
    setItemCreateSuccess("");
    const defaultCategoryId = categories[0]?.id ?? "";
    const defaultSubCategoryId =
      subCategories.find((entry) => entry.categoryId === defaultCategoryId)?.id ??
      subCategories[0]?.id ??
      "";
    setItemForm({
      name: "",
      categoryId: defaultCategoryId,
      subCategoryId: defaultSubCategoryId,
      brandId: brands[0]?.id ?? "",
      unit: "PCS",
      expiryDate: "",
    });
    setIsItemModalOpen(true);
  };

  const closeItemModal = () => {
    setIsItemModalOpen(false);
    setItemForm(emptyItemForm);
  };

  const openItemDetailModal = () => {
    if (!selectedItemId) return;
    setIsItemDetailModalOpen(true);
  };

  const closeItemDetailModal = () => {
    setIsItemDetailModalOpen(false);
  };

  const handleCategorySave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCategoryError("");
    setCategorySuccess("");

    const trimmedName = categoryForm.name.trim();
    if (!trimmedName) {
      setCategoryError("Category name is required.");
      return;
    }

    const session = getScopedAdminSession();
    if (!session) {
      setCategoryError("Session not found. Please sign in again.");
      return;
    }

    setIsCreatingCategory(true);
    try {
      await createInventoryCategory(session.accessToken, { name: trimmedName });
      setCategorySuccess("Category created successfully.");
      toast.success("Category created successfully.");
      closeCategoryModal();
      await reloadInventory(session.accessToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create category.";
      setCategoryError(message);
      toast.error(message);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleSubCategorySave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubCategoryError("");
    setSubCategorySuccess("");

    const trimmedName = subCategoryForm.name.trim();
    if (!trimmedName) {
      setSubCategoryError("Sub-category name is required.");
      return;
    }

    if (!subCategoryForm.categoryId) {
      setSubCategoryError("Category is required.");
      return;
    }

    const session = getScopedAdminSession();
    if (!session) {
      setSubCategoryError("Session not found. Please sign in again.");
      return;
    }

    setIsCreatingSubCategory(true);
    try {
      await createInventorySubCategory(session.accessToken, {
        name: trimmedName,
        categoryId: subCategoryForm.categoryId,
      });
      setSubCategorySuccess("Sub-category created successfully.");
      toast.success("Sub-category created successfully.");
      closeSubCategoryModal();
      await reloadInventory(session.accessToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create sub-category.";
      setSubCategoryError(message);
      toast.error(message);
    } finally {
      setIsCreatingSubCategory(false);
    }
  };

  const handleBrandSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBrandError("");
    setBrandSuccess("");

    const trimmedName = brandForm.name.trim();
    if (!trimmedName) {
      setBrandError("Brand name is required.");
      return;
    }

    const session = getScopedAdminSession();
    if (!session) {
      setBrandError("Session not found. Please sign in again.");
      return;
    }

    setIsCreatingBrand(true);
    try {
      await createInventoryBrand(session.accessToken, { name: trimmedName });
      setBrandSuccess("Brand created successfully.");
      toast.success("Brand created successfully.");
      closeBrandModal();
      await reloadInventory(session.accessToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create brand.";
      setBrandError(message);
      toast.error(message);
    } finally {
      setIsCreatingBrand(false);
    }
  };

  const handleItemSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setItemCreateError("");
    setItemCreateSuccess("");

    const trimmedName = itemForm.name.trim();
    const trimmedUnit = itemForm.unit.trim();
    const trimmedExpiryDate = itemForm.expiryDate.trim();

    if (!trimmedName) {
      setItemCreateError("Item name is required.");
      return;
    }

    if (!itemForm.categoryId) {
      setItemCreateError("Category is required.");
      return;
    }

    if (!itemForm.subCategoryId) {
      setItemCreateError("Sub-category is required.");
      return;
    }

    if (!itemForm.brandId) {
      setItemCreateError("Brand is required.");
      return;
    }

    if (!trimmedUnit) {
      setItemCreateError("Unit is required.");
      return;
    }

    if (!trimmedExpiryDate) {
      setItemCreateError("Expiry date is required.");
      return;
    }

    const session = getScopedAdminSession();
    if (!session) {
      setItemCreateError("Session not found. Please sign in again.");
      return;
    }

    setIsCreatingItem(true);
    try {
      const createdItem = await createInventoryItem(session.accessToken, {
        name: trimmedName,
        categoryId: itemForm.categoryId,
        subCategoryId: itemForm.subCategoryId,
        brandId: itemForm.brandId,
        unit: trimmedUnit,
        expiryDate: trimmedExpiryDate,
      });

      setItemCreateSuccess("Inventory item created successfully.");
      toast.success("Inventory item created successfully.");
      closeItemModal();
      await reloadInventory(session.accessToken);
      setSelectedItemId(createdItem.id);
      await reloadSelectedItem(session.accessToken, createdItem.id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create inventory item.";
      setItemCreateError(message);
      toast.error(message);
    } finally {
      setIsCreatingItem(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading inventory dashboard...</p>
      </div>
    );
  }

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Manage Inventory</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {section === "overview"
            ? "Overview of categories, sub-categories, brands, and inventory items."
            : "Manage inventory data for this restaurant section."}
        </p>
      </div>

      {error ? <p className="text-sm text-error-500">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Categories"
          value={activeCounts.categories.toLocaleString()}
          description="Item categories available to this restaurant"
          icon={<FolderIcon className="size-6 text-brand-600 dark:text-brand-400" />}
          accentClassName="bg-brand-50 dark:bg-brand-500/10"
          isLoading={isLoading}
          href="/manage-inventory-categories"
        />
        <MetricCard
          title="Sub-categories"
          value={activeCounts.subCategories.toLocaleString()}
          description="Nested category groups"
          icon={<GroupIcon className="size-6 text-success-600 dark:text-success-400" />}
          accentClassName="bg-success-50 dark:bg-success-500/10"
          isLoading={isLoading}
          href="/manage-inventory-sub-categories"
        />
        <MetricCard
          title="Brands"
          value={activeCounts.brands.toLocaleString()}
          description="Inventory brands configured"
          icon={<BoxCubeIcon className="size-6 text-warning-600 dark:text-warning-400" />}
          accentClassName="bg-warning-50 dark:bg-warning-500/10"
          isLoading={isLoading}
          href="/manage-inventory-brands"
        />
        <MetricCard
          title="Items"
          value={activeCounts.items.toLocaleString()}
          description="Tracked inventory items"
          icon={<TableIcon className="size-6 text-indigo-600 dark:text-indigo-400" />}
          accentClassName="bg-indigo-50 dark:bg-indigo-500/10"
          isLoading={isLoading}
          href="/manage-inventory-items"
        />
      </div>

      {section === "categories" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Categories</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">All item categories currently available.</p>
            </div>
            <Button type="button" size="sm" onClick={openCategoryModal}>
              Add Category
            </Button>
          </div>

          {categorySuccess ? <p className="text-sm text-success-600 dark:text-success-400">{categorySuccess}</p> : null}

          {isLoading ? (
            renderEmptyState("Loading categories...")
          ) : categories.length === 0 ? (
            renderEmptyState("No categories found.")
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900/60">
                  <TableRow className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <TableCell isHeader className="px-4 py-3">Name</TableCell>
                    <TableCell isHeader className="px-4 py-3">Restaurant</TableCell>
                    <TableCell isHeader className="px-4 py-3">Created</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {categories.map((category) => (
                    <TableRow key={category.id} className="bg-white dark:bg-transparent">
                      <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">{category.name}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{category.restaurantId}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(category.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : null}

      {section === "subCategories" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Sub-categories</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sub-categories grouped under parent categories.</p>
            </div>
            <Button type="button" size="sm" onClick={openSubCategoryModal} disabled={categories.length === 0}>
              Add Sub-category
            </Button>
          </div>

          {subCategorySuccess ? <p className="text-sm text-success-600 dark:text-success-400">{subCategorySuccess}</p> : null}

          {isLoading ? (
            renderEmptyState("Loading sub-categories...")
          ) : subCategories.length === 0 ? (
            renderEmptyState("No sub-categories found.")
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900/60">
                  <TableRow className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <TableCell isHeader className="px-4 py-3">Name</TableCell>
                    <TableCell isHeader className="px-4 py-3">Category</TableCell>
                    <TableCell isHeader className="px-4 py-3">Restaurant</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {subCategories.map((subCategory) => (
                    <TableRow key={subCategory.id} className="bg-white dark:bg-transparent">
                      <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">{subCategory.name}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {subCategory.category?.name ?? categoryNameById[subCategory.categoryId] ?? "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{subCategory.restaurantId}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : null}

      {section === "brands" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Brands</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Brand list linked to this restaurant.</p>
            </div>
            <Button type="button" size="sm" onClick={openBrandModal}>
              Add Brand
            </Button>
          </div>

          {brandSuccess ? <p className="text-sm text-success-600 dark:text-success-400">{brandSuccess}</p> : null}

          {isLoading ? (
            renderEmptyState("Loading brands...")
          ) : brands.length === 0 ? (
            renderEmptyState("No brands found.")
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900/60">
                  <TableRow className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <TableCell isHeader className="px-4 py-3">Name</TableCell>
                    <TableCell isHeader className="px-4 py-3">Restaurant</TableCell>
                    <TableCell isHeader className="px-4 py-3">Created</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {brands.map((brand) => (
                    <TableRow key={brand.id} className="bg-white dark:bg-transparent">
                      <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">{brand.name}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{brand.restaurantId}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(brand.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : null}

      {section === "items" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Inventory Items</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Select an item to view its details.</p>
              </div>
              <Button type="button" size="sm" onClick={openItemModal} disabled={categories.length === 0 || brands.length === 0}>
                Add Item
              </Button>
            </div>

            {itemCreateSuccess ? <p className="text-sm text-success-600 dark:text-success-400">{itemCreateSuccess}</p> : null}

            {isLoading ? (
              renderEmptyState("Loading inventory items...")
            ) : items.length === 0 ? (
              renderEmptyState("No inventory items found.")
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-900/60">
                    <TableRow className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      <TableCell isHeader className="px-4 py-3">Name</TableCell>
                      <TableCell isHeader className="px-4 py-3">Category</TableCell>
                      <TableCell isHeader className="px-4 py-3">Brand</TableCell>
                      <TableCell isHeader className="px-4 py-3">Unit</TableCell>
                      <TableCell isHeader className="px-4 py-3">Stock</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map((item) => (
                      <TableRow
                        key={item.id}
                        className={`cursor-pointer bg-white transition-colors hover:bg-gray-50 dark:bg-transparent dark:hover:bg-gray-900/60 ${selectedItemId === item.id ? "bg-brand-50/50 dark:bg-brand-500/10" : ""}`}
                        onClick={() => setSelectedItemId(item.id)}
                      >
                        <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">{item.name}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.category?.name ?? item.categoryId}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.brand?.name ?? item.brandId}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.unit}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.currentStock}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <aside className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div className="flex items-center justify-between gap-3">
              <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Item Details</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Overview for the selected item.</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={openItemDetailModal}
                disabled={!selectedItemId || isItemDetailLoading}
              >
                View All History
              </Button>
            </div>

            {isItemDetailLoading ? (
              renderEmptyState("Loading item details...")
            ) : itemDetailError ? (
              <p className="text-sm text-error-500">{itemDetailError}</p>
            ) : selectedItem ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-4"><dt className="text-gray-500 dark:text-gray-400">Name</dt><dd className="text-right font-medium text-gray-800 dark:text-gray-100">{selectedItem.name}</dd></div>
                    <div className="flex items-start justify-between gap-4"><dt className="text-gray-500 dark:text-gray-400">Category</dt><dd className="text-right font-medium text-gray-800 dark:text-gray-100">{selectedItem.category?.name ?? selectedItem.categoryId}</dd></div>
                    <div className="flex items-start justify-between gap-4"><dt className="text-gray-500 dark:text-gray-400">Sub-category</dt><dd className="text-right font-medium text-gray-800 dark:text-gray-100">{selectedItem.subCategory?.name ?? selectedItem.subCategoryId}</dd></div>
                    <div className="flex items-start justify-between gap-4"><dt className="text-gray-500 dark:text-gray-400">Brand</dt><dd className="text-right font-medium text-gray-800 dark:text-gray-100">{selectedItem.brand?.name ?? selectedItem.brandId}</dd></div>
                    <div className="flex items-start justify-between gap-4"><dt className="text-gray-500 dark:text-gray-400">Unit</dt><dd className="text-right font-medium text-gray-800 dark:text-gray-100">{selectedItem.unit}</dd></div>
                    <div className="flex items-start justify-between gap-4"><dt className="text-gray-500 dark:text-gray-400">Current stock</dt><dd className="text-right font-medium text-gray-800 dark:text-gray-100">{selectedItem.currentStock}</dd></div>
                    <div className="flex items-start justify-between gap-4"><dt className="text-gray-500 dark:text-gray-400">Expiry</dt><dd className="text-right font-medium text-gray-800 dark:text-gray-100">{formatDate(selectedItem.expiryDate)}</dd></div>
                  </dl>
                </div>
              </div>
            ) : (
              renderEmptyState("Select an item to inspect details.")
            )}
          </aside>
        </div>
      ) : null}

      <Modal isOpen={isCategoryModalOpen} onClose={closeCategoryModal} className="max-w-[520px] p-4 sm:p-6">
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Add Category</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create a new inventory category.</p>
          </div>

          {categoryError ? <p className="text-sm text-error-500">{categoryError}</p> : null}

          <form className="space-y-4" onSubmit={handleCategorySave}>
            <div>
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                type="text"
                value={categoryForm.name}
                onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Vegetables"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" size="sm" variant="outline" onClick={closeCategoryModal}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isCreatingCategory}>{isCreatingCategory ? "Saving..." : "Save Category"}</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={isSubCategoryModalOpen} onClose={closeSubCategoryModal} className="max-w-[520px] p-4 sm:p-6">
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Add Sub-category</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create a new inventory sub-category.</p>
          </div>

          {subCategoryError ? <p className="text-sm text-error-500">{subCategoryError}</p> : null}

          <form className="space-y-4" onSubmit={handleSubCategorySave}>
            <div>
              <Label htmlFor="subcategory-name">Name</Label>
              <Input
                id="subcategory-name"
                type="text"
                value={subCategoryForm.name}
                onChange={(event) => setSubCategoryForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Leafy"
              />
            </div>

            <div>
              <Label htmlFor="subcategory-category">Category</Label>
              <select
                id="subcategory-category"
                value={subCategoryForm.categoryId}
                onChange={(event) => setSubCategoryForm((current) => ({ ...current, categoryId: event.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="" disabled>Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" size="sm" variant="outline" onClick={closeSubCategoryModal}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isCreatingSubCategory}>{isCreatingSubCategory ? "Saving..." : "Save Sub-category"}</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={isBrandModalOpen} onClose={closeBrandModal} className="max-w-[520px] p-4 sm:p-6">
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Add Brand</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create a new inventory brand.</p>
          </div>

          {brandError ? <p className="text-sm text-error-500">{brandError}</p> : null}

          <form className="space-y-4" onSubmit={handleBrandSave}>
            <div>
              <Label htmlFor="brand-name">Name</Label>
              <Input
                id="brand-name"
                type="text"
                value={brandForm.name}
                onChange={(event) => setBrandForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="FreshCo"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" size="sm" variant="outline" onClick={closeBrandModal}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isCreatingBrand}>{isCreatingBrand ? "Saving..." : "Save Brand"}</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={isItemModalOpen} onClose={closeItemModal} className="max-w-[720px] p-4 sm:p-6">
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Add Inventory Item</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create a new tracked inventory item.</p>
          </div>

          {itemCreateError ? <p className="text-sm text-error-500">{itemCreateError}</p> : null}

          <form className="space-y-4" onSubmit={handleItemSave}>
            <div>
              <Label htmlFor="item-name">Name</Label>
              <Input
                id="item-name"
                type="text"
                value={itemForm.name}
                onChange={(event) => setItemForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Tomato Grade A"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="item-category">Category</Label>
                <select
                  id="item-category"
                  value={itemForm.categoryId}
                  onChange={(event) => {
                    const nextCategoryId = event.target.value;
                    const nextSubCategoryId = subCategories.find((entry) => entry.categoryId === nextCategoryId)?.id ?? "";
                    setItemForm((current) => ({ ...current, categoryId: nextCategoryId, subCategoryId: nextSubCategoryId }));
                  }}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="" disabled>Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="item-sub-category">Sub-category</Label>
                <select
                  id="item-sub-category"
                  value={itemForm.subCategoryId}
                  onChange={(event) => setItemForm((current) => ({ ...current, subCategoryId: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="" disabled>Select sub-category</option>
                  {filteredSubCategories.map((subCategory) => (
                    <option key={subCategory.id} value={subCategory.id}>{subCategory.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="item-brand">Brand</Label>
                <select
                  id="item-brand"
                  value={itemForm.brandId}
                  onChange={(event) => setItemForm((current) => ({ ...current, brandId: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="" disabled>Select brand</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="item-unit">Unit</Label>
                <select
                  id="item-unit"
                  value={itemForm.unit}
                  onChange={(event) => setItemForm((current) => ({ ...current, unit: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="KG">KG</option>
                  <option value="L">L</option>
                  <option value="PCS">PCS</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="item-expiry">Expiry Date</Label>
              <Input
                id="item-expiry"
                type="date"
                value={itemForm.expiryDate}
                onChange={(event) => setItemForm((current) => ({ ...current, expiryDate: event.target.value }))}
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" size="sm" variant="outline" onClick={closeItemModal}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isCreatingItem}>{isCreatingItem ? "Saving..." : "Save Item"}</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={isItemDetailModalOpen} onClose={closeItemDetailModal} className="max-w-[760px] p-4 sm:p-6">
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Purchase History</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {selectedItem ? `All history entries for ${selectedItem.name}.` : "All history entries for the selected item."}
            </p>
          </div>

          {isItemDetailLoading ? (
            renderEmptyState("Loading item details...")
          ) : itemDetailError ? (
            <p className="text-sm text-error-500">{itemDetailError}</p>
          ) : selectedItem ? (
            itemHistory.length === 0 ? (
              renderEmptyState("No purchase history found for this item.")
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-900/60">
                    <TableRow className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      <TableCell isHeader className="px-4 py-3">Date</TableCell>
                      <TableCell isHeader className="px-4 py-3">Description</TableCell>
                      <TableCell isHeader className="px-4 py-3">Qty</TableCell>
                      <TableCell isHeader className="px-4 py-3">Ending Stock</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {itemHistory.map((entry, index) => (
                      <TableRow key={entry.id ?? `${entry.date}-${index}`} className="bg-white dark:bg-transparent">
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(entry.date)}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">{entry.description || "History entry"}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{entry.qty || "-"}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{entry.endingStock || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : (
            renderEmptyState("Select an item to inspect details.")
          )}

          <div className="flex items-center justify-end">
            <Button type="button" size="sm" variant="outline" onClick={closeItemDetailModal}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
