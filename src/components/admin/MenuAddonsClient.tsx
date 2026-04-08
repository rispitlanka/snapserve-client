"use client";

import ClientTablePagination from "@/components/common/ClientTablePagination";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { getAuthSession, ROLE_DASHBOARD_ROUTE } from "@/lib/auth";
import {
  createMenuAddon,
  listMenuAddons,
  updateMenuAddon,
} from "@/lib/menu";
import { useClientPagedSlice } from "@/lib/pagination/clientPaging";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type AddonFormState = {
  name: string;
};

const emptyAddonForm: AddonFormState = { name: "" };

type MenuAddonRow = {
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

const normalizeAddons = (raw: unknown[]): MenuAddonRow[] =>
  raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((row) => {
      const id = getValue(row, ["id", "addonId"]);
      if (!id) return null;
      const name = getValue(row, ["name", "addonName", "label"]) || "Unnamed";
      return { id, name };
    })
    .filter((row): row is MenuAddonRow => row !== null);

export default function MenuAddonsClient() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [addons, setAddons] = useState<MenuAddonRow[]>([]);
  const [isLoadingAddons, setIsLoadingAddons] = useState(false);
  const [isSavingAddon, setIsSavingAddon] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [addonForm, setAddonForm] = useState<AddonFormState>(emptyAddonForm);
  const [addonPage, setAddonPage] = useState(1);
  const [addonPageSize, setAddonPageSize] = useState(10);

  const refreshAddons = async () => {
    const session = getAuthSession();
    if (!session) return;
    setIsLoadingAddons(true);
    try {
      const list = await listMenuAddons(session.accessToken);
      setAddons(normalizeAddons(list));
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : "Failed to load add-ons.");
    } finally {
      setIsLoadingAddons(false);
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
      await refreshAddons();
    };

    void initialize();
  }, [router]);

  const filteredAddons = useMemo(() => {
    const query = normalizeText(searchQuery);
    if (!query) return addons;
    return addons.filter((record) => normalizeText(record.name).includes(query));
  }, [addons, searchQuery]);

  const pagedAddons = useClientPagedSlice(filteredAddons, addonPage, addonPageSize);

  useEffect(() => {
    setAddonPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (pagedAddons.safePage !== addonPage) {
      setAddonPage(pagedAddons.safePage);
    }
  }, [addonPage, pagedAddons.safePage]);

  const openAddModal = () => {
    setEditingAddonId(null);
    setAddonForm(emptyAddonForm);
    setIsAddonModalOpen(true);
  };

  const openEditModal = (row: MenuAddonRow) => {
    setEditingAddonId(row.id);
    setAddonForm({ name: row.name });
    setIsAddonModalOpen(true);
  };

  const closeAddonModal = () => {
    setIsAddonModalOpen(false);
    setEditingAddonId(null);
    setAddonForm(emptyAddonForm);
  };

  const handleAddonSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = addonForm.name.trim();
    if (!name) {
      toast.error("Add-on name is required.");
      return;
    }

    const session = getAuthSession();
    if (!session) {
      toast.error("Session not found. Please sign in again.");
      return;
    }

    setIsSavingAddon(true);
    try {
      if (editingAddonId) {
        await updateMenuAddon(session.accessToken, editingAddonId, { name });
        toast.success("Add-on updated.");
      } else {
        await createMenuAddon(session.accessToken, { name });
        toast.success("Add-on created.");
      }
      closeAddonModal();
      await refreshAddons();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Failed to save add-on.";
      toast.error(message);
    } finally {
      setIsSavingAddon(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading add-ons...</p>
      </div>
    );
  }

  const isEditMode = Boolean(editingAddonId);

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Add On</h1>
        <Button type="button" size="sm" onClick={openAddModal}>
          Add add-on
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
              {isLoadingAddons ? (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                    Loading add-ons...
                  </td>
                </tr>
              ) : filteredAddons.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                    No add-ons found.
                  </td>
                </tr>
              ) : (
                pagedAddons.slice.map((row) => (
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

        {!isLoadingAddons ? (
          <ClientTablePagination
            page={pagedAddons.safePage}
            totalPages={pagedAddons.totalPages}
            totalItems={pagedAddons.total}
            pageSize={addonPageSize}
            rangeFrom={pagedAddons.rangeFrom}
            rangeTo={pagedAddons.rangeTo}
            onPageChange={setAddonPage}
            onPageSizeChange={(size) => {
              setAddonPageSize(size);
              setAddonPage(1);
            }}
            disabled={isLoadingAddons}
          />
        ) : null}
      </section>

      <Modal isOpen={isAddonModalOpen} onClose={closeAddonModal} className="max-w-[560px] p-4 sm:p-6">
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {isEditMode ? "Edit add-on" : "Add add-on"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isEditMode ? "Update the add-on name." : "Create a reusable add-on for menu items."}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleAddonSave}>
            <div>
              <Label>Name</Label>
              <Input
                type="text"
                value={addonForm.name}
                onChange={(event) => setAddonForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="e.g. Extra cheese"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" size="sm" variant="outline" onClick={closeAddonModal}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingAddon}>
                {isSavingAddon ? "Saving..." : isEditMode ? "Save changes" : "Create add-on"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
