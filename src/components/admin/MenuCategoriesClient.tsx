"use client";

import ClientTablePagination from "@/components/common/ClientTablePagination";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { getAuthSession, ROLE_DASHBOARD_ROUTE } from "@/lib/auth";
import {
  createMenuCategory,
  listMenuCategories,
  updateMenuCategory,
} from "@/lib/menu";
import { useClientPagedSlice } from "@/lib/pagination/clientPaging";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type CategoryFormState = {
  name: string;
  status: boolean;
};

const emptyCategoryForm: CategoryFormState = { name: "", status: true };

type MenuCategoryRow = {
  id: string;
  name: string;
  status: boolean;
  updatedAtMs: number;
};

type SortOption = "status" | "name" | "updatedAt";

const normalizeText = (value: string) => value.trim().toLowerCase();

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

const getUpdatedMs = (record: Record<string, unknown>): number => {
  const raw = getValue(record, ["updatedAt", "updated_at"]);
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
};

const localeSortName = (a: MenuCategoryRow, b: MenuCategoryRow) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

const normalizeCategories = (raw: unknown[]): MenuCategoryRow[] =>
  raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((row) => {
      const id = getValue(row, ["id", "categoryId"]);
      if (!id) return null;
      const name = getValue(row, ["name", "categoryName", "label"]) || "Unnamed";
      const status = getBool(row, ["status", "active", "isActive"]);
      const updatedAtMs = getUpdatedMs(row);
      return { id, name, status, updatedAtMs };
    })
    .filter((row): row is MenuCategoryRow => row !== null);

const sortSelectClass =
  "h-10 min-w-[12rem] rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function MenuCategoriesClient() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [categories, setCategories] = useState<MenuCategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingModal, setIsSavingModal] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("updatedAt");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const refreshCategories = useCallback(async () => {
    const session = getAuthSession();
    if (!session) return;
    setIsLoading(true);
    try {
      const list = await listMenuCategories(session.accessToken);
      setCategories(normalizeCategories(list));
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : "Failed to load categories.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
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
      await refreshCategories();
    };

    void initialize();
  }, [router, refreshCategories]);

  const filtered = useMemo(() => {
    const query = normalizeText(searchQuery);
    if (!query) return categories;
    return categories.filter((c) => normalizeText(c.name).includes(query));
  }, [categories, searchQuery]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortBy === "name") {
      list.sort(localeSortName);
      return list;
    }
    if (sortBy === "updatedAt") {
      list.sort((a, b) => {
        const diff = b.updatedAtMs - a.updatedAtMs;
        if (diff !== 0) return diff;
        return localeSortName(a, b);
      });
      return list;
    }
    // status: active first, then name
    list.sort((a, b) => {
      if (a.status !== b.status) return a.status ? -1 : 1;
      return localeSortName(a, b);
    });
    return list;
  }, [filtered, sortBy]);

  const paged = useClientPagedSlice(sorted, page, pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortBy]);

  useEffect(() => {
    if (paged.safePage !== page) {
      setPage(paged.safePage);
    }
  }, [page, paged.safePage]);

  const openAdd = () => {
    setModalMode("add");
    setEditingCategoryId(null);
    setForm(emptyCategoryForm);
    setIsModalOpen(true);
  };

  const openEdit = (row: MenuCategoryRow) => {
    setModalMode("edit");
    setEditingCategoryId(row.id);
    setForm({ name: row.name, status: row.status });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalMode("add");
    setEditingCategoryId(null);
    setForm(emptyCategoryForm);
  };

  const handleModalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error("Category name is required.");
      return;
    }

    const session = getAuthSession();
    if (!session) {
      toast.error("Session not found. Please sign in again.");
      return;
    }

    setIsSavingModal(true);
    try {
      if (modalMode === "edit" && editingCategoryId) {
        await updateMenuCategory(session.accessToken, editingCategoryId, {
          name,
          status: form.status,
        });
        toast.success("Category name updated.");
      } else {
        await createMenuCategory(session.accessToken, { name, status: form.status });
        toast.success("Category created.");
      }
      closeModal();
      await refreshCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save category.");
    } finally {
      setIsSavingModal(false);
    }
  };

  const handleStatusToggle = async (row: MenuCategoryRow, next: boolean) => {
    if (next === row.status) return;

    const session = getAuthSession();
    if (!session) {
      toast.error("Session not found. Please sign in again.");
      return;
    }

    setUpdatingStatusId(row.id);
    try {
      await updateMenuCategory(session.accessToken, row.id, { name: row.name, status: next });
      setCategories((prev) =>
        prev.map((c) =>
          c.id === row.id ? { ...c, status: next, updatedAtMs: Date.now() } : c
        )
      );
      toast.success(next ? "Category activated." : "Category deactivated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  if (!sessionReady) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Menu Category</h1>
        <Button type="button" size="sm" onClick={openAdd}>
          Add category
        </Button>
      </div>

      <section className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <Input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name"
            className="h-10! md:max-w-sm"
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={sortSelectClass}
            >
              <option value="status">Status (active first)</option>
              <option value="name">Name (A–Z)</option>
              <option value="updatedAt">Updated (recent first)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                    Loading categories...
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                    No categories found.
                  </td>
                </tr>
              ) : (
                paged.slice.map((row) => {
                  const busy = updatingStatusId === row.id;
                  return (
                    <tr key={row.id}>
                      <td className="px-3 py-3 text-sm text-gray-800 dark:text-gray-100">{row.name}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
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
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {row.status ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button type="button" size="sm" variant="outline" onClick={() => openEdit(row)}>
                          Edit
                        </Button>
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
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            disabled={isLoading}
          />
        ) : null}
      </section>

      <Modal isOpen={isModalOpen} onClose={closeModal} className="max-w-[560px] p-4 sm:p-6">
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {modalMode === "edit" ? "Edit category name" : "Add category"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {modalMode === "edit"
                ? "Update the category display name. Use the table toggle to change active status."
                : "Set the display name and whether this category is active on the menu."}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleModalSubmit}>
            <div>
              <Label>Name</Label>
              <Input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="e.g. Starters"
              />
            </div>

            {modalMode === "add" ? (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-3 py-3 dark:border-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">Active</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Inactive categories can be hidden from ordering flows.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.status}
                  onClick={() => setForm((prev) => ({ ...prev, status: !prev.status }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-150 focus:outline-hidden focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                    form.status ? "bg-brand-500" : "bg-gray-200 dark:bg-white/15"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition duration-150 ${
                      form.status ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              <Button type="button" size="sm" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingModal}>
                {isSavingModal
                  ? "Saving..."
                  : modalMode === "edit"
                    ? "Save name"
                    : "Create category"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
