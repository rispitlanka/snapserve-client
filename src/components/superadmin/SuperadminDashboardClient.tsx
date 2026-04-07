"use client";

import ClientTablePagination from "@/components/common/ClientTablePagination";
import { Modal } from "@/components/ui/modal";
import {
  createRestaurant,
  createRestaurantAdmin,
  deleteRestaurantAdmin,
  getAuthSession,
  listRestaurantAdmins,
  listRestaurants,
  updateRestaurantAdmin,
} from "@/lib/auth";
import { useClientPagedSlice } from "@/lib/pagination/clientPaging";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type Restaurant = {
  id: string;
  restaurantId: string;
  name: string;
  isActive: boolean;
};

type CreatedAdmin = {
  id: string;
  name: string;
  restaurantId: string;
};

type ManagementTab = "restaurants" | "admins";

type SuperadminDashboardClientProps = {
  defaultActiveTab?: ManagementTab;
  showTabSwitcher?: boolean;
  pageType?: "Users" | "admins";
};

export default function SuperadminDashboardClient({
  defaultActiveTab = "restaurants",
  showTabSwitcher = true,
  pageType = "admins",
}: SuperadminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<ManagementTab>(defaultActiveTab);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [name, setName] = useState("");
  const [restaurantIdInput, setRestaurantIdInput] = useState("");
  const [restaurantMobile, setRestaurantMobile] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [showAddRestaurantForm, setShowAddRestaurantForm] = useState(false);
  const [error, setError] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [showAddAdminForm, setShowAddAdminForm] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [createdAdmins, setCreatedAdmins] = useState<CreatedAdmin[]>([]);
  const [editingAdmin, setEditingAdmin] = useState<CreatedAdmin | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<CreatedAdmin | null>(null);
  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);
  const [editAdminName, setEditAdminName] = useState("");
  const [editAdminPassword, setEditAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [restaurantPage, setRestaurantPage] = useState(1);
  const [restaurantPageSize, setRestaurantPageSize] = useState(10);
  const [adminPage, setAdminPage] = useState(1);
  const [adminPageSize, setAdminPageSize] = useState(10);

  const isValidAdminName = (value: string) => {
    const trimmed = value.trim();
    return /^[A-Za-z][A-Za-z0-9 ._-]{2,49}$/.test(trimmed);
  };

  const openRestaurantModal = () => {
    setError("");
    setShowAddRestaurantForm(true);
  };

  const closeRestaurantModal = () => {
    setName("");
    setRestaurantIdInput("");
    setRestaurantMobile("");
    setIsActive(true);
    setError("");
    setShowAddRestaurantForm(false);
  };

  const openAdminModal = () => {
    setAdminError("");
    setAdminSuccess("");
    setShowAddAdminForm(true);
  };

  const closeAdminModal = () => {
    setAdminName("");
    setAdminPassword("");
    setSelectedRestaurantId("");
    setAdminError("");
    setAdminSuccess("");
    setShowAddAdminForm(false);
  };

  const openEditAdminModal = (admin: CreatedAdmin) => {
    setAdminError("");
    setAdminSuccess("");
    setEditingAdmin(admin);
    setEditAdminName(admin.name);
    setEditAdminPassword("");
  };

  const closeEditAdminModal = () => {
    setEditingAdmin(null);
    setEditAdminName("");
    setEditAdminPassword("");
    setIsEditingAdmin(false);
  };

  const openDeleteAdminModal = (admin: CreatedAdmin) => {
    setAdminError("");
    setAdminSuccess("");
    setDeletingAdmin(admin);
  };

  const closeDeleteAdminModal = () => {
    setDeletingAdmin(null);
    setIsDeletingAdmin(false);
  };

  const loadRestaurants = async () => {
    setLoading(true);
    setError("");
    try {
      const session = getAuthSession();
      if (!session) throw new Error("Session not found");
      const rawData = await listRestaurants(session.accessToken);
      const list = (
        Array.isArray(rawData)
          ? rawData
          : Array.isArray((rawData as { data?: unknown[] })?.data)
          ? (rawData as { data: unknown[] }).data
          : []
      ) as Array<Record<string, unknown>>;

      const mapped = list.map((item, index) => ({
        id: String(item.id ?? item.restaurantId ?? `restaurant-${index}`),
        restaurantId:
          (item.restaurantId as string) ||
          (item.id as string) ||
          `RST${String(index + 1).padStart(3, "0")}`,
        name: (item.name as string) || "Restaurant",
        isActive: Boolean(item.isActive),
      }));

      setRestaurants(mapped);
    } catch {
      setError("Failed to load restaurants.");
    } finally {
      setLoading(false);
    }
  };

  const loadRestaurantAdmins = async () => {
    setAdminLoading(true);
    setAdminError("");
    try {
      const session = getAuthSession();
      if (!session) throw new Error("Session not found");
      const rawData = await listRestaurantAdmins(session.accessToken);
      const list = (
        Array.isArray(rawData)
          ? rawData
          : Array.isArray((rawData as { data?: unknown[] })?.data)
          ? (rawData as { data: unknown[] }).data
          : []
      ) as Array<Record<string, unknown>>;

      const mapped = list.map((item, index) => ({
        id: String(
          item.id ??
            item._id ??
            item.userId ??
            item.user_id ??
            `${String(item.restaurantId ?? item.restaurant_id ?? "")}-${String(item.name ?? item.username ?? "")}-${index}`
        ),
        name: String(item.name ?? item.username ?? item.userName ?? "").trim(),
        restaurantId: String(item.restaurantId ?? item.restaurant_id ?? item.businessId ?? item.business_id ?? "").trim(),
      }));

      setCreatedAdmins(mapped.filter((admin) => admin.name && admin.restaurantId));
    } catch {
      setAdminError("Failed to load restaurant admins.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAddRestaurant = async () => {
    const trimmedId = restaurantIdInput.trim();
    const trimmedName = name.trim();
    const trimmedMobile = restaurantMobile.trim();
    if (!trimmedId || !trimmedName || !trimmedMobile) return;
    setError("");
    try {
      const session = getAuthSession();
      if (!session) throw new Error("Session not found");
      await createRestaurant(session.accessToken, {
        id: trimmedId,
        name: trimmedName,
        mobileNumber: trimmedMobile,
        isActive,
      });
      toast.success("Restaurant created successfully.");
      closeRestaurantModal();
      await loadRestaurants();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create restaurant.";
      setError(message);
      toast.error(message);
    }
  };

  const handleAddRestaurantAdmin = async () => {
    const trimmedAdminName = adminName.trim();
    const trimmedRestaurantId = selectedRestaurantId.trim();

    setAdminError("");
    setAdminSuccess("");

    if (!trimmedRestaurantId) {
      setAdminError("Select a restaurant.");
      return;
    }

    if (!adminPassword.trim() || adminPassword.trim().length < 8) {
      setAdminError("Password must be at least 8 characters.");
      return;
    }

    if (!isValidAdminName(trimmedAdminName)) {
      setAdminError(
        "Admin name must start with a letter and be 3-50 characters (letters, numbers, space, . _ -)."
      );
      return;
    }

    const duplicateName = createdAdmins.some(
      (admin) =>
        admin.restaurantId === trimmedRestaurantId &&
        admin.name.toLowerCase() === trimmedAdminName.toLowerCase()
    );

    if (duplicateName) {
      setAdminError("This admin name is already added for the selected restaurant.");
      return;
    }

    try {
      const session = getAuthSession();
      if (!session) throw new Error("Session not found");

      await createRestaurantAdmin(session.accessToken, {
        restaurantId: trimmedRestaurantId,
        name: trimmedAdminName,
        password: adminPassword.trim(),
      });

      await loadRestaurantAdmins();
      closeAdminModal();
      setAdminSuccess("Restaurant admin created successfully.");
      toast.success("Restaurant admin created successfully.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create restaurant admin.";
      setAdminError(message);
      toast.error(message);
    }
  };

  const handleUpdateRestaurantAdmin = async () => {
    if (!editingAdmin) return;
    const nextName = editAdminName.trim();
    const nextPassword = editAdminPassword.trim();

    if (!isValidAdminName(nextName)) {
      setAdminError(
        "Admin name must start with a letter and be 3-50 characters (letters, numbers, space, . _ -)."
      );
      return;
    }
    if (nextPassword && nextPassword.length < 8) {
      setAdminError("Password must be at least 8 characters.");
      return;
    }

    try {
      const session = getAuthSession();
      if (!session) throw new Error("Session not found");
      setIsEditingAdmin(true);
      setAdminError("");

      await updateRestaurantAdmin(session.accessToken, editingAdmin.id, {
        name: nextName,
        password: nextPassword || undefined,
      });

      toast.success("Restaurant admin updated successfully.");
      closeEditAdminModal();
      await loadRestaurantAdmins();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update restaurant admin.";
      setAdminError(message);
      toast.error(message);
    } finally {
      setIsEditingAdmin(false);
    }
  };

  const handleDeleteRestaurantAdmin = async () => {
    if (!deletingAdmin) return;

    try {
      const session = getAuthSession();
      if (!session) throw new Error("Session not found");
      setIsDeletingAdmin(true);
      setAdminError("");

      await deleteRestaurantAdmin(session.accessToken, deletingAdmin.id);
      toast.success("Restaurant admin deleted successfully.");
      closeDeleteAdminModal();
      await loadRestaurantAdmins();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete restaurant admin.";
      setAdminError(message);
      toast.error(message);
    } finally {
      setIsDeletingAdmin(false);
    }
  };

  useEffect(() => {
    loadRestaurants();
    loadRestaurantAdmins();
  }, []);

  const getRestaurantNameById = useCallback((restaurantId: string) => {
    const restaurant = restaurants.find((item) => item.restaurantId === restaurantId);
    return restaurant?.name || "Unknown Restaurant";
  }, [restaurants]);

  const filteredRestaurants = useMemo(() => {
    const query = restaurantSearch.trim().toLowerCase();
    if (!query) return restaurants;

    return restaurants.filter((restaurant) =>
      `${restaurant.name} ${restaurant.restaurantId}`.toLowerCase().includes(query)
    );
  }, [restaurants, restaurantSearch]);

  const filteredAdmins = useMemo(() => {
    const query = adminSearch.trim().toLowerCase();
    if (!query) return createdAdmins;

    return createdAdmins.filter((admin) => {
      const restaurantName = getRestaurantNameById(admin.restaurantId);
      return `${admin.name} ${admin.restaurantId} ${restaurantName}`
        .toLowerCase()
        .includes(query);
    });
  }, [createdAdmins, adminSearch, getRestaurantNameById]);

  const restaurantPaged = useClientPagedSlice(
    filteredRestaurants,
    restaurantPage,
    restaurantPageSize
  );

  const adminPaged = useClientPagedSlice(filteredAdmins, adminPage, adminPageSize);

  useEffect(() => {
    setRestaurantPage(1);
  }, [restaurantSearch]);

  useEffect(() => {
    setAdminPage(1);
  }, [adminSearch]);

  useEffect(() => {
    if (restaurantPaged.safePage !== restaurantPage) {
      setRestaurantPage(restaurantPaged.safePage);
    }
  }, [restaurantPaged.safePage, restaurantPage]);

  useEffect(() => {
    if (adminPaged.safePage !== adminPage) {
      setAdminPage(adminPaged.safePage);
    }
  }, [adminPaged.safePage, adminPage]);

  const pageTitle = activeTab === "admins" ? "Manage Restaurent Admin" : "Manage Restaurent";
  const headerActionLabel = activeTab === "admins"
    ? (pageType === "Users" ? "Add User" : "Add Restaurant Admin")
    : "Add Restaurant";
  const handleHeaderAction = activeTab === "admins" ? openAdminModal : openRestaurantModal;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">{pageTitle}</h1>
        <button
          type="button"
          onClick={handleHeaderAction}
          className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          {headerActionLabel}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-error-500">{error}</p> : null}
      {adminError ? <p className="mt-2 text-sm text-error-500">{adminError}</p> : null}
      {adminSuccess ? (
        <p className="mt-2 text-sm text-success-600 dark:text-success-400">{adminSuccess}</p>
      ) : null}

      {showTabSwitcher ? (
        <div className="mt-6 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => setActiveTab("restaurants")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "restaurants"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            Manage Restaurants
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("admins")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "admins"
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            Manage Restaurant Admins
          </button>
        </div>
      ) : null}

      {activeTab === "restaurants" ? (
        <section className="mt-6 space-y-4">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div className="mb-4">
              <input
                type="text"
                value={restaurantSearch}
                onChange={(e) => setRestaurantSearch(e.target.value)}
                placeholder="Search by restaurant name or ID"
                className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 md:max-w-sm"
              />
            </div>
            <div className="overflow-x-auto transition-opacity duration-200">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-3">Restaurant</th>
                    <th className="px-3 py-3">Restaurant ID</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                        Loading restaurants...
                      </td>
                    </tr>
                  ) : filteredRestaurants.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                        No restaurants found.
                      </td>
                    </tr>
                  ) : (
                    restaurantPaged.slice.map((restaurant) => (
                      <tr key={restaurant.id}>
                        <td className="px-3 py-3 text-sm text-gray-800 dark:text-gray-100">
                          {restaurant.name}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {restaurant.restaurantId}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              restaurant.isActive
                                ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {restaurant.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading ? (
              <ClientTablePagination
                page={restaurantPaged.safePage}
                totalPages={restaurantPaged.totalPages}
                totalItems={restaurantPaged.total}
                pageSize={restaurantPageSize}
                rangeFrom={restaurantPaged.rangeFrom}
                rangeTo={restaurantPaged.rangeTo}
                onPageChange={setRestaurantPage}
                onPageSizeChange={(size) => {
                  setRestaurantPageSize(size);
                  setRestaurantPage(1);
                }}
                disabled={loading}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === "admins" ? (
        <section className="mt-6 space-y-4">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div className="mb-4">
              <input
                type="text"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="Search by admin name, restaurant, or ID"
                className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 md:max-w-sm"
              />
            </div>
            <div className="overflow-x-auto transition-opacity duration-200">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-3">Admin Name</th>
                    <th className="px-3 py-3">Restaurant</th>
                    <th className="px-3 py-3">Restaurant ID</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {adminLoading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                        Loading restaurant admins...
                      </td>
                    </tr>
                  ) : filteredAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                        No restaurant admins found.
                      </td>
                    </tr>
                  ) : (
                    adminPaged.slice.map((admin) => (
                      <tr key={admin.id}>
                        <td className="px-3 py-3 text-sm text-gray-800 dark:text-gray-100">
                          {admin.name}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {getRestaurantNameById(admin.restaurantId)}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {admin.restaurantId}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditAdminModal(admin)}
                              className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteAdminModal(admin)}
                              className="rounded-md border border-error-300 px-2.5 py-1 text-xs text-error-600 hover:bg-error-50 dark:border-error-500/50 dark:text-error-400 dark:hover:bg-error-500/10"
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

            {!adminLoading ? (
              <ClientTablePagination
                page={adminPaged.safePage}
                totalPages={adminPaged.totalPages}
                totalItems={adminPaged.total}
                pageSize={adminPageSize}
                rangeFrom={adminPaged.rangeFrom}
                rangeTo={adminPaged.rangeTo}
                onPageChange={setAdminPage}
                onPageSizeChange={(size) => {
                  setAdminPageSize(size);
                  setAdminPage(1);
                }}
                disabled={adminLoading}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      <Modal
        isOpen={showAddRestaurantForm}
        onClose={closeRestaurantModal}
        className="max-w-[560px] p-4 sm:p-6"
      >
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Add Restaurant
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create a restaurant record for the superadmin panel.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Restaurant ID <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={restaurantIdInput}
              onChange={(e) => setRestaurantIdInput(e.target.value)}
              placeholder="e.g. rispit-downtown-01"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Unique identifier sent to the API as <code className="text-xs">id</code>.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Restaurant name"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Mobile number <span className="text-error-500">*</span>
            </label>
            <input
              type="tel"
              value={restaurantMobile}
              onChange={(e) => setRestaurantMobile(e.target.value)}
              placeholder="9876543210"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="isActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
              Is Active
            </label>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeRestaurantModal}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddRestaurant}
              disabled={!restaurantIdInput.trim() || !name.trim() || !restaurantMobile.trim()}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save Restaurant
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAddAdminForm}
        onClose={closeAdminModal}
        className="max-w-[560px] p-4 sm:p-6"
      >
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Add Restaurant Admin
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Creates a login for the selected restaurant. Password must be at least 8 characters.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Restaurant <span className="text-error-500">*</span>
            </label>
            <select
              value={selectedRestaurantId}
              onChange={(e) => setSelectedRestaurantId(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="">Select restaurant</option>
              {restaurants.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.restaurantId}>
                  {restaurant.name} ({restaurant.restaurantId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Admin Name <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Admin name"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password <span className="text-error-500">*</span>
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeAdminModal}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddRestaurantAdmin}
              disabled={
                !selectedRestaurantId.trim() ||
                !adminName.trim() ||
                !adminPassword.trim() ||
                adminPassword.trim().length < 8
              }
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save Restaurant Admin
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(editingAdmin)}
        onClose={closeEditAdminModal}
        className="max-w-[560px] p-4 sm:p-6"
      >
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Edit Restaurant Admin
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Update the admin name and optionally set a new password (min 8 characters).
            </p>
          </div>

          {adminError ? <p className="text-sm text-error-500">{adminError}</p> : null}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Admin Name <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={editAdminName}
              onChange={(e) => setEditAdminName(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              New Password
            </label>
            <input
              type="password"
              value={editAdminPassword}
              onChange={(e) => setEditAdminPassword(e.target.value)}
              placeholder="Leave blank to keep existing"
              autoComplete="new-password"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeEditAdminModal}
              disabled={isEditingAdmin}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdateRestaurantAdmin}
              disabled={isEditingAdmin || !editAdminName.trim()}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isEditingAdmin ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(deletingAdmin)}
        onClose={closeDeleteAdminModal}
        className="max-w-[520px] p-4 sm:p-6"
      >
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Delete Restaurant Admin
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This action cannot be undone.
            </p>
          </div>

          {deletingAdmin ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{deletingAdmin.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {deletingAdmin.restaurantId}
                </span>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeDeleteAdminModal}
              disabled={isDeletingAdmin}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteRestaurantAdmin}
              disabled={isDeletingAdmin}
              className="inline-flex items-center justify-center rounded-lg bg-error-600 px-4 py-2 text-sm font-medium text-white hover:bg-error-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeletingAdmin ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

