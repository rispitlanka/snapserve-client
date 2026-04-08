"use client";

import ClientTablePagination from "@/components/common/ClientTablePagination";
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
  createInventorySubCategory,
  getInventoryItem,
  getInventoryItemHistory,
  listInventoryBrands,
  listInventoryCategories,
  listInventoryItems,
  listInventorySubCategories,
  updateInventoryItemCurrentStock,
} from "@/lib/inventory";
import { formatDateTimeForDisplay } from "@/lib/format";
import { useClientPagedSlice } from "@/lib/pagination/clientPaging";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type InventoryTab = "categories" | "subCategories" | "brands" | "items";
type InventorySection = "overview" | InventoryTab;

type CategoryFormState = { name: string };
type SubCategoryFormState = { name: string; categoryId: string };
type BrandFormState = { name: string };

const emptyCategoryForm: CategoryFormState = { name: "" };
const emptySubCategoryForm: SubCategoryFormState = { name: "", categoryId: "" };
const emptyBrandForm: BrandFormState = { name: "" };

const localeSort = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });

const sortByCreatedAtDesc = <T extends { createdAt: string }>(a: T, b: T) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

type NameRecentSort = "name" | "recent";
type SubCategorySortOption = "category" | "name" | "recent";

const inventorySelectClass =
  "h-11 min-w-[12rem] rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

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
  const [isItemDetailModalOpen, setIsItemDetailModalOpen] = useState(false);

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingSubCategory, setIsCreatingSubCategory] = useState(false);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);

  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [subCategoryForm, setSubCategoryForm] = useState<SubCategoryFormState>(emptySubCategoryForm);
  const [brandForm, setBrandForm] = useState<BrandFormState>(emptyBrandForm);

  const [categoryError, setCategoryError] = useState("");
  const [subCategoryError, setSubCategoryError] = useState("");
  const [brandError, setBrandError] = useState("");

  const [categorySuccess, setCategorySuccess] = useState("");
  const [subCategorySuccess, setSubCategorySuccess] = useState("");
  const [brandSuccess, setBrandSuccess] = useState("");

  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryPageSize, setCategoryPageSize] = useState(10);
  const [subCategoryPage, setSubCategoryPage] = useState(1);
  const [subCategoryPageSize, setSubCategoryPageSize] = useState(10);
  const [brandPage, setBrandPage] = useState(1);
  const [brandPageSize, setBrandPageSize] = useState(10);
  const [itemPage, setItemPage] = useState(1);
  const [itemPageSize, setItemPageSize] = useState(10);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [categorySort, setCategorySort] = useState<NameRecentSort>("name");
  const [brandSort, setBrandSort] = useState<NameRecentSort>("name");
  const [subCategorySort, setSubCategorySort] = useState<SubCategorySortOption>("category");

  const [showManualStockInput, setShowManualStockInput] = useState(false);
  const [manualStockInput, setManualStockInput] = useState("");
  const [isSavingStock, setIsSavingStock] = useState(false);

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

  const categoryNameById = useMemo(() => {
    return categories.reduce<Record<string, string>>((accumulator, category) => {
      accumulator[category.id] = category.name;
      return accumulator;
    }, {});
  }, [categories]);

  const sortedCategories = useMemo(() => {
    const list = [...categories];
    if (categorySort === "name") {
      list.sort((a, b) => localeSort(a.name, b.name));
    } else {
      list.sort(sortByCreatedAtDesc);
    }
    return list;
  }, [categories, categorySort]);

  const sortedBrands = useMemo(() => {
    const list = [...brands];
    if (brandSort === "name") {
      list.sort((a, b) => localeSort(a.name, b.name));
    } else {
      list.sort(sortByCreatedAtDesc);
    }
    return list;
  }, [brands, brandSort]);

  const sortedSubCategories = useMemo(() => {
    const list = [...subCategories];
    const categoryLabel = (sub: InventorySubCategory) =>
      sub.category?.name ?? categoryNameById[sub.categoryId] ?? "";

    if (subCategorySort === "category") {
      list.sort((a, b) => {
        const byCat = localeSort(categoryLabel(a), categoryLabel(b));
        if (byCat !== 0) return byCat;
        return localeSort(a.name, b.name);
      });
    } else if (subCategorySort === "name") {
      list.sort((a, b) => localeSort(a.name, b.name));
    } else {
      list.sort(sortByCreatedAtDesc);
    }
    return list;
  }, [subCategories, subCategorySort, categoryNameById]);

  const filteredItems = useMemo(() => {
    const q = itemSearchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = [
        item.name,
        item.category?.name,
        item.subCategory?.name,
        item.brand?.name,
        item.unit,
        item.currentStock,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, itemSearchQuery]);

  const categoryPaged = useClientPagedSlice(sortedCategories, categoryPage, categoryPageSize);
  const subCategoryPaged = useClientPagedSlice(sortedSubCategories, subCategoryPage, subCategoryPageSize);
  const brandPaged = useClientPagedSlice(sortedBrands, brandPage, brandPageSize);
  const itemPaged = useClientPagedSlice(filteredItems, itemPage, itemPageSize);
  const historyPaged = useClientPagedSlice(itemHistory, historyPage, historyPageSize);

  useEffect(() => {
    if (categoryPaged.safePage !== categoryPage) setCategoryPage(categoryPaged.safePage);
  }, [categoryPaged.safePage, categoryPage]);

  useEffect(() => {
    if (subCategoryPaged.safePage !== subCategoryPage) setSubCategoryPage(subCategoryPaged.safePage);
  }, [subCategoryPaged.safePage, subCategoryPage]);

  useEffect(() => {
    if (brandPaged.safePage !== brandPage) setBrandPage(brandPaged.safePage);
  }, [brandPaged.safePage, brandPage]);

  useEffect(() => {
    if (itemPaged.safePage !== itemPage) setItemPage(itemPaged.safePage);
  }, [itemPaged.safePage, itemPage]);

  useEffect(() => {
    if (historyPaged.safePage !== historyPage) setHistoryPage(historyPaged.safePage);
  }, [historyPaged.safePage, historyPage]);

  useEffect(() => {
    setHistoryPage(1);
  }, [selectedItemId]);

  useEffect(() => {
    setItemPage(1);
  }, [itemSearchQuery]);

  useEffect(() => {
    setCategoryPage(1);
  }, [categorySort]);

  useEffect(() => {
    setBrandPage(1);
  }, [brandSort]);

  useEffect(() => {
    setSubCategoryPage(1);
  }, [subCategorySort]);

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

  const openAddItemPage = () => {
    router.push("/manage-inventory-items/add");
  };

  const openItemDetailModal = (itemId?: string) => {
    const idToUse = itemId ?? selectedItemId;
    if (!idToUse) return;
    setSelectedItemId(idToUse);
    setIsItemDetailModalOpen(true);
  };

  const closeItemDetailModal = () => {
    setIsItemDetailModalOpen(false);
    setShowManualStockInput(false);
    setManualStockInput("");
  };

  const handleToggleManualAdjustment = () => {
    setShowManualStockInput((prev) => {
      const next = !prev;
      if (next && selectedItem) {
        setManualStockInput(selectedItem.currentStock);
      }
      return next;
    });
  };

  const handleApplyManualStock = async () => {
    if (!selectedItemId || !selectedItem) return;

    const parsed = Number(manualStockInput);
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error("Enter a valid stock amount (0 or greater).");
      return;
    }

    const session = getScopedAdminSession();
    if (!session) return;

    setIsSavingStock(true);
    try {
      const updated = await updateInventoryItemCurrentStock(session.accessToken, selectedItemId, {
        currentStock: parsed,
      });
      setSelectedItem(updated);
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, currentStock: updated.currentStock } : item))
      );
      const history = await getInventoryItemHistory(session.accessToken, selectedItemId);
      setItemHistory(history);
      toast.success("Stock updated.");
      setShowManualStockInput(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update stock.");
    } finally {
      setIsSavingStock(false);
    }
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



  if (!sessionReady) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading inventory dashboard...</p>
      </div>
    );
  }

  const sectionHeading =
    section === "items"
      ? "Manage Items"
      : section === "brands"
        ? "Manage Brands"
        : section === "categories"
          ? "Manage Category"
          : section === "subCategories"
            ? "Manage Sub Category"
            : "Manage Inventory";
  const sectionAction =
    section === "items"
      ? { label: "Add Item", onClick: openAddItemPage, disabled: false }
      : section === "brands"
        ? { label: "Add Brand", onClick: openBrandModal, disabled: false }
        : section === "categories"
          ? { label: "Add Category", onClick: openCategoryModal, disabled: false }
          : section === "subCategories"
            ? { label: "Add Sub-category", onClick: openSubCategoryModal, disabled: categories.length === 0 }
            : null;

  const headerSortClass = `${inventorySelectClass} min-w-[11rem] max-w-full sm:max-w-[min(100%,18rem)]`;

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <h1 className="min-w-0 shrink-0 text-2xl font-semibold text-gray-800 dark:text-white/90">{sectionHeading}</h1>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
          {section === "categories" && !isLoading && categories.length > 0 ? (
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
              <span className="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-400">Sort</span>
              <select
                id="inventory-category-sort"
                value={categorySort}
                onChange={(event) => setCategorySort(event.target.value as NameRecentSort)}
                className={headerSortClass}
              >
                <option value="name">Name (A–Z)</option>
                <option value="recent">Recent (newest first)</option>
              </select>
            </div>
          ) : null}

          {section === "subCategories" && !isLoading && subCategories.length > 0 ? (
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
              <span className="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-400">Sort</span>
              <select
                id="inventory-subcategory-sort"
                value={subCategorySort}
                onChange={(event) => setSubCategorySort(event.target.value as SubCategorySortOption)}
                className={`${headerSortClass} sm:max-w-[min(100%,22rem)]`}
              >
                <option value="category">Category, then name</option>
                <option value="name">Name (A–Z)</option>
                <option value="recent">Recent (newest first)</option>
              </select>
            </div>
          ) : null}

          {section === "brands" && !isLoading && brands.length > 0 ? (
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
              <span className="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-400">Sort</span>
              <select
                id="inventory-brand-sort"
                value={brandSort}
                onChange={(event) => setBrandSort(event.target.value as NameRecentSort)}
                className={headerSortClass}
              >
                <option value="name">Name (A–Z)</option>
                <option value="recent">Recent (newest first)</option>
              </select>
            </div>
          ) : null}

          {section === "items" && !isLoading && items.length > 0 ? (
            <div className="flex w-full min-w-40 flex-1 sm:min-w-48 lg:max-w-md">
              <Input
                id="inventory-items-search"
                type="text"
                value={itemSearchQuery}
                onChange={(event) => setItemSearchQuery(event.target.value)}
                placeholder="Search name, category, brand..."
                className="h-10! py-2"
              />
            </div>
          ) : null}

          {sectionAction ? (
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              onClick={sectionAction.onClick}
              disabled={sectionAction.disabled}
            >
              {sectionAction.label}
            </Button>
          ) : null}
        </div>
      </div>

      {section === "overview" ? (
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
      ) : null}

      {section === "categories" ? (
        <div className="space-y-4">
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
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {categoryPaged.slice.map((category) => (
                    <TableRow key={category.id} className="bg-white dark:bg-transparent">
                      <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">{category.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ClientTablePagination
                page={categoryPaged.safePage}
                totalPages={categoryPaged.totalPages}
                totalItems={categoryPaged.total}
                pageSize={categoryPageSize}
                rangeFrom={categoryPaged.rangeFrom}
                rangeTo={categoryPaged.rangeTo}
                onPageChange={setCategoryPage}
                onPageSizeChange={(size) => {
                  setCategoryPageSize(size);
                  setCategoryPage(1);
                }}
                disabled={isLoading}
              />
            </div>
          )}
        </div>
      ) : null}

      {section === "subCategories" ? (
        <div className="space-y-4">
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
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {subCategoryPaged.slice.map((subCategory) => (
                    <TableRow key={subCategory.id} className="bg-white dark:bg-transparent">
                      <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">{subCategory.name}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {subCategory.category?.name ?? categoryNameById[subCategory.categoryId] ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ClientTablePagination
                page={subCategoryPaged.safePage}
                totalPages={subCategoryPaged.totalPages}
                totalItems={subCategoryPaged.total}
                pageSize={subCategoryPageSize}
                rangeFrom={subCategoryPaged.rangeFrom}
                rangeTo={subCategoryPaged.rangeTo}
                onPageChange={setSubCategoryPage}
                onPageSizeChange={(size) => {
                  setSubCategoryPageSize(size);
                  setSubCategoryPage(1);
                }}
                disabled={isLoading}
              />
            </div>
          )}
        </div>
      ) : null}

      {section === "brands" ? (
        <div className="space-y-4">
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
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {brandPaged.slice.map((brand) => (
                    <TableRow key={brand.id} className="bg-white dark:bg-transparent">
                      <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">{brand.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ClientTablePagination
                page={brandPaged.safePage}
                totalPages={brandPaged.totalPages}
                totalItems={brandPaged.total}
                pageSize={brandPageSize}
                rangeFrom={brandPaged.rangeFrom}
                rangeTo={brandPaged.rangeTo}
                onPageChange={setBrandPage}
                onPageSizeChange={(size) => {
                  setBrandPageSize(size);
                  setBrandPage(1);
                }}
                disabled={isLoading}
              />
            </div>
          )}
        </div>
      ) : null}

      {section === "items" ? (
        <div className="space-y-4">
            {isLoading ? (
              renderEmptyState("Loading inventory items...")
            ) : items.length === 0 ? (
              renderEmptyState("No inventory items found.")
            ) : filteredItems.length === 0 ? (
              renderEmptyState("No items match your search.")
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-900/60">
                    <TableRow className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      <TableCell isHeader className="px-4 py-3">Name</TableCell>
                      <TableCell isHeader className="px-4 py-3">Category</TableCell>
                      <TableCell isHeader className="px-4 py-3">Sub-category</TableCell>
                      <TableCell isHeader className="px-4 py-3">Brand</TableCell>
                      <TableCell isHeader className="px-4 py-3">Unit</TableCell>
                      <TableCell isHeader className="px-4 py-3">Stock</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {itemPaged.slice.map((item) => (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer bg-white transition-colors hover:bg-gray-50 dark:bg-transparent dark:hover:bg-gray-900/60"
                        onClick={() => openItemDetailModal(item.id)}
                      >
                        <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">{item.name}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.category?.name ?? item.categoryId}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.subCategory?.name ?? item.subCategoryId}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.brand?.name ?? item.brandId}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.unit}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.currentStock}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ClientTablePagination
                  page={itemPaged.safePage}
                  totalPages={itemPaged.totalPages}
                  totalItems={itemPaged.total}
                  pageSize={itemPageSize}
                  rangeFrom={itemPaged.rangeFrom}
                  rangeTo={itemPaged.rangeTo}
                  onPageChange={setItemPage}
                  onPageSizeChange={(size) => {
                    setItemPageSize(size);
                    setItemPage(1);
                  }}
                  disabled={isLoading}
                />
              </div>

            )}
          </div>
      ) : null}

      <Modal isOpen={isCategoryModalOpen} onClose={closeCategoryModal} className="max-w-[520px] p-4 sm:p-6">
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Add Category</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create a new inventory category.</p>
          </div>

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

      <Modal
        isOpen={isItemDetailModalOpen}
        onClose={closeItemDetailModal}
        showCloseButton={false}
        className="max-w-[760px] p-4 sm:p-6"
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 pr-2">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Purchase History</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {selectedItem ? selectedItem.name : "Item history records"}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:max-w-[min(100%,22rem)]">
              <Button
                type="button"
                size="sm"
                variant={showManualStockInput ? "outline" : "primary"}
                onClick={handleToggleManualAdjustment}
                disabled={!selectedItem || isItemDetailLoading}
              >
                Manual Adjustment
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={closeItemDetailModal}>
                Close
              </Button>
            </div>
          </div>

          {showManualStockInput && selectedItem ? (
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="manual-stock">New current stock ({selectedItem.unit})</Label>
                <Input
                  id="manual-stock"
                  type="number"
                  min="0"
                  step={0.01}
                  value={manualStockInput}
                  onChange={(e) => setManualStockInput(e.target.value)}
                  placeholder={String(selectedItem.currentStock)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyManualStock}
                  disabled={isSavingStock || isItemDetailLoading}
                >
                  {isSavingStock ? "Saving..." : "Update stock"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowManualStockInput(false)}
                  disabled={isSavingStock}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {isItemDetailLoading ? (
            renderEmptyState("Loading item details...")
          ) : itemDetailError ? (
            renderEmptyState(itemDetailError)
          ) : selectedItem ? (
            <>
              <div className="space-y-3">
                {itemHistory.length === 0 ? (
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
                        {historyPaged.slice.map((entry, index) => (
                          <TableRow key={entry.id ?? `${entry.date}-${index}`} className="bg-white dark:bg-transparent">
                            <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                              {formatDateTimeForDisplay(entry.date)}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">{entry.description || "History entry"}</TableCell>
                            <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{entry.qty || "-"}</TableCell>
                            <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{entry.endingStock || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <ClientTablePagination
                      page={historyPaged.safePage}
                      totalPages={historyPaged.totalPages}
                      totalItems={historyPaged.total}
                      pageSize={historyPageSize}
                      rangeFrom={historyPaged.rangeFrom}
                      rangeTo={historyPaged.rangeTo}
                      onPageChange={setHistoryPage}
                      onPageSizeChange={(size) => {
                        setHistoryPageSize(size);
                        setHistoryPage(1);
                      }}
                      disabled={isItemDetailLoading}
                      className="border-t-0 pt-3"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            renderEmptyState("Select an item to inspect details.")
          )}
        </div>
      </Modal>
    </section>
  );
}
