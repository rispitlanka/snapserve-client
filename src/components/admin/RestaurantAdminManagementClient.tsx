"use client";

import ClientTablePagination from "@/components/common/ClientTablePagination";
import type { Staff, Supplier } from "@/lib/auth";
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
import { useClientPagedSlice } from "@/lib/pagination/clientPaging";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";

type AdminTab = "staff" | "suppliers";

type StaffFormState = {
  name: string;
  password: string;
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
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [isDeletingStaff, setIsDeletingStaff] = useState(false);
  const [updatingStaffId, setUpdatingStaffId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState<StaffFormState>(emptyStaffForm);
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>(emptySupplierForm);
  const [staffPage, setStaffPage] = useState(1);
  const [staffPageSize, setStaffPageSize] = useState(10);
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierPageSize, setSupplierPageSize] = useState(10);

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

  const openStaffModal = () => {
    setStaffError("");
    setStaffSuccess("");

    setStaffForm(emptyStaffForm);
    setIsStaffModalOpen(true);
  };

  const closeStaffModal = () => {
    setIsStaffModalOpen(false);
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
      const searchable = `${record.name} ${record.email ?? ""} ${record.phone ?? ""}`;
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

  const staffPaged = useClientPagedSlice(staffFiltered, staffPage, staffPageSize);
  const supplierPaged = useClientPagedSlice(supplierFiltered, supplierPage, supplierPageSize);

  useEffect(() => {
    setStaffPage(1);
  }, [staffSearch]);

  useEffect(() => {
    setSupplierPage(1);
  }, [supplierSearch]);

  useEffect(() => {
    if (staffPaged.safePage !== staffPage) {
      setStaffPage(staffPaged.safePage);
    }
  }, [staffPaged.safePage, staffPage]);

  useEffect(() => {
    if (supplierPaged.safePage !== supplierPage) {
      setSupplierPage(supplierPaged.safePage);
    }
  }, [supplierPaged.safePage, supplierPage]);

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

    if (trimmedPassword.length < 6) {
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
      await createStaff(session.accessToken, {
        name: trimmedName,
        password: trimmedPassword,
        role: "CASHIER",
      });
      setStaffSuccess("Staff member created successfully.");
      toast.success("Staff member created successfully.");

      closeStaffModal();
      await refreshStaff();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save staff member.";
      setStaffError(message);
      toast.error(message);
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
      toast.success("Staff member deleted successfully.");
      closeDeleteModal();
      await refreshStaff();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete staff member.";
      setStaffError(message);
      toast.error(message);
    } finally {
      setIsDeletingStaff(false);
    }
  };

  const handleToggleStaffStatus = async (record: Staff) => {
    const session = getAuthSession();
    if (!session) {
      setStaffError("Session not found. Please sign in again.");
      return;
    }

    setUpdatingStaffId(record.id);
    setStaffError("");
    setStaffSuccess("");

    try {
      await updateStaff(session.accessToken, record.id, {
        isActive: !record.isActive,
      });
      setStaffSuccess(
        `Staff member ${!record.isActive ? "activated" : "deactivated"} successfully.`
      );
      toast.success(
        `Staff member ${!record.isActive ? "activated" : "deactivated"} successfully.`
      );
      await refreshStaff();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update staff status.";
      setStaffError(message);
      toast.error(message);
    } finally {
      setUpdatingStaffId(null);
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
      toast.success("Supplier created successfully.");
      closeSupplierModal();
      await refreshSuppliers();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create supplier.";
      setSupplierError(message);
      toast.error(message);
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
    ? "Manage staff and suppliers for your restaurant."
    : activeTab === "staff"
      ? "Add staff members and toggle their active status."
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
            <button
              type="button"
              onClick={openStaffModal}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Add Staff
            </button>
          </div>

          {staffError ? <p className="text-sm text-error-500">{staffError}</p> : null}
          {staffSuccess ? <p className="text-sm text-success-600 dark:text-success-400">{staffSuccess}</p> : null}

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <input
              type="text"
              value={staffSearch}
              onChange={(event) => setStaffSearch(event.target.value)}
              placeholder="Search staff by name, email, or phone"
              className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 md:max-w-sm"
            />

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {isLoadingStaff ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                        Loading staff...
                      </td>
                    </tr>
                  ) : staffFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                        No staff found.
                      </td>
                    </tr>
                  ) : (
                    staffPaged.slice.map((record) => (
                      <tr key={record.id}>
                        <td className="px-3 py-3 text-sm text-gray-800 dark:text-gray-100">
                          {record.name}
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
                          <div className="inline-flex items-center gap-3">
                            <label className="inline-flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={record.isActive}
                                disabled={updatingStaffId === record.id}
                                onChange={() => handleToggleStaffStatus(record)}
                                className="sr-only"
                                aria-label={`${record.name} is ${record.isActive ? "active" : "inactive"}`}
                              />
                              <span
                                className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                                  record.isActive
                                    ? "bg-success-500"
                                    : "bg-gray-300 dark:bg-gray-700"
                                } ${updatingStaffId === record.id ? "opacity-70" : ""}`}
                              >
                                <span
                                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                    record.isActive ? "translate-x-5" : "translate-x-0"
                                  }`}
                                />
                              </span>
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                {updatingStaffId === record.id
                                  ? "Updating..."
                                  : record.isActive
                                    ? "On"
                                    : "Off"}
                              </span>
                            </label>
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

            {!isLoadingStaff ? (
              <ClientTablePagination
                page={staffPaged.safePage}
                totalPages={staffPaged.totalPages}
                totalItems={staffPaged.total}
                pageSize={staffPageSize}
                rangeFrom={staffPaged.rangeFrom}
                rangeTo={staffPaged.rangeTo}
                onPageChange={setStaffPage}
                onPageSizeChange={(size) => {
                  setStaffPageSize(size);
                  setStaffPage(1);
                }}
                disabled={isLoadingStaff}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === "suppliers" ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
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
                    supplierPaged.slice.map((record) => (
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

            {!isLoadingSuppliers ? (
              <ClientTablePagination
                page={supplierPaged.safePage}
                totalPages={supplierPaged.totalPages}
                totalItems={supplierPaged.total}
                pageSize={supplierPageSize}
                rangeFrom={supplierPaged.rangeFrom}
                rangeTo={supplierPaged.rangeTo}
                onPageChange={setSupplierPage}
                onPageSizeChange={(size) => {
                  setSupplierPageSize(size);
                  setSupplierPage(1);
                }}
                disabled={isLoadingSuppliers}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      <Modal isOpen={isStaffModalOpen} onClose={closeStaffModal} className="max-w-[600px] p-4 sm:p-6">
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Add Staff
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create a staff account for your restaurant.
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
              <Label>Password</Label>
              <Input
                type="password"
                value={staffForm.password}
                onChange={(event) => setStaffForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Minimum 6 characters"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" size="sm" variant="outline" onClick={closeStaffModal}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingStaff}>
                {isSavingStaff ? "Saving..." : "Save Staff"}
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
              Delete Staff
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {deletingStaff
                ? `Are you sure you want to delete ${deletingStaff.name}? This action cannot be undone.`
                : "Are you sure you want to delete this staff member?"}
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
