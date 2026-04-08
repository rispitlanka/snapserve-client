"use client";

import ClientTablePagination from "@/components/common/ClientTablePagination";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { getAuthSession, ROLE_DASHBOARD_ROUTE } from "@/lib/auth";
import {
  createMenuVariant,
  listMenuVariants,
  updateMenuVariant,
} from "@/lib/menu";
import { useClientPagedSlice } from "@/lib/pagination/clientPaging";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

/** Menu variants in this product are always grouped under the SIZE category. */
const VARIANT_CATEGORY_SIZE = "SIZE";

type VariantFormState = {
  name: string;
};

const emptyVariantForm: VariantFormState = { name: "" };

type MenuVariantRow = {
  id: string;
  name: string;
};

const normalizeText = (value: string) => value.trim().toLowerCase();

const getValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
};

const normalizeVariants = (raw: unknown[]): MenuVariantRow[] =>
  raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((row) => {
      const id = getValue(row, ["id", "variantId"]);
      if (!id) return null;
      const variantCategory = getValue(row, [
        "variantCategory",
        "category",
        "variant_category",
        "variantCategoryName",
      ]);
      const name = getValue(row, ["name", "variantName", "label"]) || "Unnamed";
      return { id, variantCategory, name };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .filter((row) => normalizeText(row.variantCategory) === normalizeText(VARIANT_CATEGORY_SIZE))
    .map(({ id, name }) => ({ id, name }));

export default function MenuVariantsClient() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [variants, setVariants] = useState<MenuVariantRow[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [isSavingVariant, setIsSavingVariant] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState<VariantFormState>(emptyVariantForm);
  const [variantPage, setVariantPage] = useState(1);
  const [variantPageSize, setVariantPageSize] = useState(10);

  const refreshVariants = async () => {
    const session = getAuthSession();
    if (!session) return;
    setIsLoadingVariants(true);
    try {
      const list = await listMenuVariants(session.accessToken);
      setVariants(normalizeVariants(list));
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : "Failed to load variants.");
    } finally {
      setIsLoadingVariants(false);
    }
  };

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
      await refreshVariants();
    };

    void initialize();
  }, [router]);

  const filteredVariants = useMemo(() => {
    const query = normalizeText(searchQuery);
    if (!query) return variants;
    return variants.filter((record) => normalizeText(record.name).includes(query));
  }, [variants, searchQuery]);

  const pagedVariants = useClientPagedSlice(filteredVariants, variantPage, variantPageSize);

  useEffect(() => {
    setVariantPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (pagedVariants.safePage !== variantPage) {
      setVariantPage(pagedVariants.safePage);
    }
  }, [variantPage, pagedVariants.safePage]);

  const openAddModal = () => {
    setEditingVariantId(null);
    setVariantForm(emptyVariantForm);
    setIsVariantModalOpen(true);
  };

  const openEditModal = (row: MenuVariantRow) => {
    setEditingVariantId(row.id);
    setVariantForm({ name: row.name });
    setIsVariantModalOpen(true);
  };

  const closeVariantModal = () => {
    setIsVariantModalOpen(false);
    setEditingVariantId(null);
    setVariantForm(emptyVariantForm);
  };

  const handleVariantSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = variantForm.name.trim();

    if (!name) {
      toast.error("Variant name is required.");
      return;
    }

    const session = getAuthSession();
    if (!session) {
      toast.error("Session not found. Please sign in again.");
      return;
    }

    setIsSavingVariant(true);
    try {
      if (editingVariantId) {
        await updateMenuVariant(session.accessToken, editingVariantId, {
          variantCategory: VARIANT_CATEGORY_SIZE,
          name,
        });
        toast.success("Variant updated.");
      } else {
        await createMenuVariant(session.accessToken, {
          variantCategory: VARIANT_CATEGORY_SIZE,
          name,
        });
        toast.success("Variant created.");
      }
      closeVariantModal();
      await refreshVariants();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Failed to save variant.";
      toast.error(message);
    } finally {
      setIsSavingVariant(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading variants...</p>
      </div>
    );
  }

  const isEditMode = Boolean(editingVariantId);

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Variant</h1>
        <Button type="button" size="sm" onClick={openAddModal}>
          Add variant
        </Button>
      </div>

      <section className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <Input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name"
          className="h-10! md:max-w-sm"
        />

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoadingVariants ? (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                    Loading variants...
                  </td>
                </tr>
              ) : filteredVariants.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                    No variants found.
                  </td>
                </tr>
              ) : (
                pagedVariants.slice.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-3 text-sm text-gray-800 dark:text-gray-100">{row.name}</td>
                    <td className="px-3 py-3 text-right">
                      <Button type="button" size="sm" variant="outline" onClick={() => openEditModal(row)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoadingVariants ? (
          <ClientTablePagination
            page={pagedVariants.safePage}
            totalPages={pagedVariants.totalPages}
            totalItems={pagedVariants.total}
            pageSize={variantPageSize}
            rangeFrom={pagedVariants.rangeFrom}
            rangeTo={pagedVariants.rangeTo}
            onPageChange={setVariantPage}
            onPageSizeChange={(size) => {
              setVariantPageSize(size);
              setVariantPage(1);
            }}
            disabled={isLoadingVariants}
          />
        ) : null}
      </section>

      <Modal isOpen={isVariantModalOpen} onClose={closeVariantModal} className="max-w-[560px] p-4 sm:p-6">
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {isEditMode ? "Edit variant" : "Add variant"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Sizes only — category is fixed as {VARIANT_CATEGORY_SIZE}. Enter the label (e.g. Small, Large).
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleVariantSave}>
            <div>
              <Label>Name</Label>
              <Input
                type="text"
                value={variantForm.name}
                onChange={(event) => setVariantForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="e.g. Large"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" size="sm" variant="outline" onClick={closeVariantModal}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingVariant}>
                {isSavingVariant ? "Saving..." : isEditMode ? "Save changes" : "Create variant"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
