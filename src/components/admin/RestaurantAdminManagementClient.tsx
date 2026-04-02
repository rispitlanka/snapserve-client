"use client";

import type { Staff, Supplier, UpdateStaffPayload } from "@/lib/auth";
import {
  createStaff,
  createSupplier,
  deleteStaff,
  getAuthSession,
  listStaff,
  listSuppliers,
  ROLE_DASHBOARD_ROUTE,
  updateStaff,
} from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";

type AdminTab = "staff" | "suppliers";
type StaffMode = "create" | "edit";

type StaffFormState = {
  name: string;
  password: string;
  role: "CASHIER" | "WAITER";
};

type SupplierFormState = {
  name: string;
  contactNumber: string;
  description: string;
};

type RestaurantAdminManagementClientProps = {
  defaultActiveTab?: AdminTab;
  showTabSwitcher?: boolean;
};

const emptyStaffForm: StaffFormState = {
  name: "",
  password: "",
  role: "CASHIER",
};

const emptySupplierForm: SupplierFormState = {
  name: "",
  contactNumber: "",
  description: "",
};

const normalizeText = (value: string) => value.trim().toLowerCase();

export default function RestaurantAdminManagementClient({
  defaultActiveTab = "staff",
  showTabSwitcher = true,
}: RestaurantAdminManagementClientProps) {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>(defaultActiveTab);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [staffError, setStaffError] = useState("");
  const [supplierError, setSupplierError] = useState("");
  const [staffSuccess, setStaffSuccess] = useState("");
  const [supplierSuccess, setSupplierSuccess] = useState("");
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staffMode, setStaffMode] = useState<StaffMode>("create");
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [isDeletingStaff, setIsDeletingStaff] = useState(false);
  const [staffForm, setStaffForm] = useState<StaffFormState>(emptyStaffForm);
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>(emptySupplierForm);

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

      setIsLoadingStaff(true);
      setIsLoadingSuppliers(true);
      setStaffError("");
      setSupplierError("");

      try {
        const [staffList, supplierList] = await Promise.all([
          listStaff(session.accessToken),
          listSuppliers(session.accessToken),
        ]);

        setStaff(staffList);
        setSuppliers(supplierList);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load admin data.";
        setStaffError(message);
        setSupplierError(message);
      } finally {
        setIsLoadingStaff(false);
        setIsLoadingSuppliers(false);
      }
    };

    void initialize();
  }, [router]);

  const refreshStaff = async () => {
    const session = getAuthSession();
    if (!session) return;

    setIsLoadingStaff(true);
    setStaffError("");
    try {
      setStaff(await listStaff(session.accessToken));
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : "Failed to load staff.");
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const refreshSuppliers = async () => {
    const session = getAuthSession();
    if (!session) return;

    setIsLoadingSuppliers(true);
    setSupplierError("");
    try {
      setSuppliers(await listSuppliers(session.accessToken));
    } catch (error) {
      setSupplierError(error instanceof Error ? error.message : "Failed to load suppliers.");
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  const openStaffModal = (mode: StaffMode, record?: Staff) => {
    setStaffError("");
    setStaffSuccess("");
    setStaffMode(mode);

    if (record) {
      setEditingStaffId(record.id);
      setStaffForm({
        name: record.name,
        password: "",
        role: (record.role?.toUpperCase() ?? "CASHIER") as "CASHIER" | "WAITER",
      });
    } else {
      setEditingStaffId(null);
      setStaffForm(emptyStaffForm);
    }

    setIsStaffModalOpen(true);
  };

  const closeStaffModal = () => {
    setIsStaffModalOpen(false);
    setEditingStaffId(null);
    setStaffForm(emptyStaffForm);
  };

  const openSupplierModal = () => {
    setSupplierError("");
    setSupplierSuccess("");
    setSupplierForm(emptySupplierForm);
    setIsSupplierModalOpen(true);
  };

  const closeSupplierModal = () => {
    setIsSupplierModalOpen(false);
    setSupplierForm(emptySupplierForm);
  };

  const openDeleteModal = (record: Staff) => {
    setDeletingStaff(record);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeletingStaff(null);
    setIsDeleteModalOpen(false);
  };

  const staffFiltered = useMemo(() => {
    const query = normalizeText(staffSearch);
    if (!query) return staff;
    return staff.filter((record) => {
      const searchable = `${record.name} ${record.email ?? ""} ${record.phone ?? ""} ${record.role}`;
      return searchable.toLowerCase().includes(query);
    });
  }, [staff, staffSearch]);

  const supplierFiltered = useMemo(() => {
    const query = normalizeText(supplierSearch);
    if (!query) return suppliers;
    return suppliers.filter((record) => {
      const searchable = `${record.name} ${record.contactNumber ?? ""} ${record.description ?? ""}`;
      return searchable.toLowerCase().includes(query);
    });
  }, [suppliers, supplierSearch]);

  const handleStaffSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStaffError("");
    setStaffSuccess("");

    const trimmedName = staffForm.name.trim();
    const trimmedPassword = staffForm.password.trim();

    if (!trimmedName) {
      setStaffError("Staff name is required.");
      return;
    }

    if (staffMode === "create" && trimmedPassword.length < 6) {
      setStaffError("Password must be at least 6 characters.");
      return;
    }

    const session = getAuthSession();
    if (!session) {
      setStaffError("Session not found. Please sign in again.");
      return;
    }

    setIsSavingStaff(true);
    try {
      if (staffMode === "create") {
        await createStaff(session.accessToken, {
          name: trimmedName,
          password: trimmedPassword,
          role: staffForm.role,
        });
        setStaffSuccess("Staff member created successfully.");
      } else if (editingStaffId) {
        const payload: UpdateStaffPayload = {
          name: trimmedName,
          role: staffForm.role,
        };

        if (trimmedPassword) {
          payload.password = trimmedPassword;
        }

        await updateStaff(session.accessToken, editingStaffId, payload);
        setStaffSuccess("Staff member updated successfully.");
      }

      closeStaffModal();
      await refreshStaff();
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : "Failed to save staff member.");
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!deletingStaff) return;

    const session = getAuthSession();
    if (!session) {
      setStaffError("Session not found. Please sign in again.");
      return;
    }

    setIsDeletingStaff(true);
    setStaffError("");
    try {
      await deleteStaff(session.accessToken, deletingStaff.id);
      setStaffSuccess("Staff member deleted successfully.");
      closeDeleteModal();
      await refreshStaff();
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : "Failed to delete staff member.");
    } finally {
      setIsDeletingStaff(false);
    }
  };

  const handleSupplierSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSupplierError("");
    setSupplierSuccess("");

    const trimmedName = supplierForm.name.trim();
    const trimmedContactNumber = supplierForm.contactNumber.trim();
    const trimmedDescription = supplierForm.description.trim();

    if (!trimmedName) {
      setSupplierError("Supplier name is required.");
      return;
    }

    if (!trimmedContactNumber) {
      setSupplierError("Supplier contact number is required.");
      return;
    }

    if (!trimmedDescription) {
      setSupplierError("Supplier description is required.");
      return;
    }

    const session = getAuthSession();
    if (!session) {
      setSupplierError("Session not found. Please sign in again.");
      return;
    }

    setIsSavingSupplier(true);
    try {
      await createSupplier(session.accessToken, {
        name: trimmedName,
        contactNumber: trimmedContactNumber,
        description: trimmedDescription,
      });
      setSupplierSuccess("Supplier created successfully.");
      closeSupplierModal();
      await refreshSuppliers();
    } catch (error) {
      setSupplierError(error instanceof Error ? error.message : "Failed to create supplier.");
    } finally {
      setIsSavingSupplier(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading admin dashboard...</p>
      </div>
    );
  }

  const pageHeading = showTabSwitcher
    ? "Admin Dashboard"
    : activeTab === "staff"
      ? "Manage Staff"
      : "Manage Suppliers";

  const pageDescription = showTabSwitcher
    ? "Manage cashier staff and suppliers for your restaurant."
    : activeTab === "staff"
      ? "Add, edit, and remove cashier and waiter accounts."
      : "Create and manage suppliers for your restaurant.";

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {pageHeading}
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {pageDescription}
        </p>
      </div>

      {showTabSwitcher ? (
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => setActiveTab("staff")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "staff"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            Staff
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("suppliers")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "suppliers"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            Suppliers
          </button>
        </div>
      ) : null}

      {activeTab === "staff" ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Restaurant Cashiers
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Add, edit, and remove cashier accounts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openStaffModal("create")}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Add Cashier
            </button>
          </div>

          {staffError ? <p className="text-sm text-error-500">{staffError}</p> : null}
          {staffSuccess ? <p className="text-sm text-success-600 dark:text-success-400">{staffSuccess}</p> : null}

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <input
              type="text"
              value={staffSearch}
              onChange={(event) => setStaffSearch(event.target.value)}
              placeholder="Search staff by name, email, phone, or role"
              className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 md:max-w-sm"
            />

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {isLoadingStaff ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                        Loading staff...
                      </td>
                    </tr>
                  ) : staffFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                        No staff found.
                      </td>
                    </tr>
                  ) : (
                    staffFiltered.map((record) => (
                      <tr key={record.id}>
                        <td className="px-3 py-3 text-sm text-gray-800 dark:text-gray-100">
                          {record.name}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {record.role || "-"}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              record.isActive
                                ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {record.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openStaffModal("edit", record)}
                              className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteModal(record)}
                              className="rounded-md border border-error-300 px-2.5 py-1 text-xs text-error-500 hover:bg-error-50 dark:border-error-500/50 dark:hover:bg-error-500/10"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "suppliers" ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Suppliers
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Track suppliers associated with the restaurant.
              </p>
            </div>
            <button
              type="button"
              onClick={openSupplierModal}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Add Supplier
            </button>
          </div>

          {supplierError ? <p className="text-sm text-error-500">{supplierError}</p> : null}
          {supplierSuccess ? <p className="text-sm text-success-600 dark:text-success-400">{supplierSuccess}</p> : null}

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <input
              type="text"
              value={supplierSearch}
              onChange={(event) => setSupplierSearch(event.target.value)}
                placeholder="Search suppliers by name, contact number, or description"
              className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 md:max-w-sm"
            />

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Contact Number</th>
                    <th className="px-3 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {isLoadingSuppliers ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                        Loading suppliers...
                      </td>
                    </tr>
                  ) : supplierFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                        No suppliers found.
                      </td>
                    </tr>
                  ) : (
                    supplierFiltered.map((record) => (
                      <tr key={record.id}>
                        <td className="px-3 py-3 text-sm text-gray-800 dark:text-gray-100">
                          {record.name}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {record.contactNumber || "-"}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {record.description || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      <Modal isOpen={isStaffModalOpen} onClose={closeStaffModal} className="max-w-[600px] p-4 sm:p-6">
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {staffMode === "create" ? "Add Cashier" : "Edit Cashier"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {staffMode === "create"
                ? "Create a cashier account for your restaurant."
                : "Update cashier details and optional password."}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleStaffSave}>
            <div>
              <Label>Name</Label>
              <Input
                type="text"
                value={staffForm.name}
                onChange={(event) => setStaffForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Staff name"
              />
            </div>

            <div>
              <Label>{staffMode === "create" ? "Password" : "New Password (optional)"}</Label>
              <Input
                type="password"
                value={staffForm.password}
                onChange={(event) => setStaffForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder={staffMode === "create" ? "Minimum 6 characters" : "Leave blank to keep current password"}
              />
            </div>

            <div>
              <Label>Role</Label>
              <select
                value={staffForm.role}
                onChange={(event) => setStaffForm((prev) => ({ ...prev, role: event.target.value as "CASHIER" | "WAITER" }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="CASHIER">Cashier</option>
                <option value="WAITER">Waiter</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" size="sm" variant="outline" onClick={closeStaffModal}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingStaff}>
                {isSavingStaff ? "Saving..." : "Save Cashier"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={isSupplierModalOpen} onClose={closeSupplierModal} className="max-w-[560px] p-4 sm:p-6">
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Add Supplier
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create a supplier entry for this restaurant.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSupplierSave}>
            <div>
              <Label>Name</Label>
              <Input
                type="text"
                value={supplierForm.name}
                onChange={(event) => setSupplierForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Supplier name"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Contact Number</Label>
                <Input
                  type="text"
                  value={supplierForm.contactNumber}
                  onChange={(event) => setSupplierForm((prev) => ({ ...prev, contactNumber: event.target.value }))}
                  placeholder="9876543210"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  type="text"
                  value={supplierForm.description}
                  onChange={(event) => setSupplierForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Vegetable and dairy partner"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" size="sm" variant="outline" onClick={closeSupplierModal}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingSupplier}>
                {isSavingSupplier ? "Saving..." : "Save Supplier"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal} className="max-w-[520px] p-4 sm:p-6">
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Delete Cashier
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {deletingStaff
                ? `Are you sure you want to delete ${deletingStaff.name}? This action cannot be undone.`
                : "Are you sure you want to delete this cashier?"}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" size="sm" variant="outline" onClick={closeDeleteModal}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={isDeletingStaff} onClick={handleDeleteStaff}>
              {isDeletingStaff ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
