"use client";

import {
    createRestaurant,
    createRestaurantAdmin,
    getAuthSession,
    listRestaurantAdmins,
    listRestaurants,
} from "@/lib/auth";
import { useEffect, useMemo, useState } from "react";

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

export default function SuperadminDashboardClient() {
  const [activeTab, setActiveTab] = useState<ManagementTab>("restaurants");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [name, setName] = useState("");
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
  const [loading, setLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  const isValidAdminName = (value: string) => {
    const trimmed = value.trim();
    return /^[A-Za-z][A-Za-z0-9 ._-]{2,49}$/.test(trimmed);
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
        id: String(item.id ?? `${String(item.restaurantId ?? "")}-${String(item.name ?? "")}-${index}`),
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
    if (!name.trim()) return;
    setError("");
    try {
      const session = getAuthSession();
      if (!session) throw new Error("Session not found");
      await createRestaurant(session.accessToken, {
        name: name.trim(),
        isActive,
      });
      setName("");
      setIsActive(true);
      setShowAddRestaurantForm(false);
      await loadRestaurants();
    } catch {
      setError("Failed to create restaurant.");
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

    if (!isValidAdminName(trimmedAdminName)) {
      setAdminError(
        "Admin name must start with a letter and be 3-50 characters (letters, numbers, space, . _ -)."
      );
      return;
    }

    if (!adminPassword.trim() || adminPassword.trim().length < 6) {
      setAdminError("Admin password must be at least 6 characters.");
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
      setAdminName("");
      setAdminPassword("");
      setShowAddAdminForm(false);
      setAdminSuccess("Restaurant admin created successfully.");
    } catch {
      setAdminError("Failed to create restaurant admin.");
    }
  };

  useEffect(() => {
    loadRestaurants();
    loadRestaurantAdmins();
  }, []);

  const getRestaurantNameById = (restaurantId: string) => {
    const restaurant = restaurants.find((item) => item.restaurantId === restaurantId);
    return restaurant?.name || "Unknown Restaurant";
  };

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
  }, [createdAdmins, adminSearch, restaurants]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Manage Restaurent</h1>
      {error ? <p className="mt-2 text-sm text-error-500">{error}</p> : null}
      {adminError ? <p className="mt-2 text-sm text-error-500">{adminError}</p> : null}
      {adminSuccess ? (
        <p className="mt-2 text-sm text-success-600 dark:text-success-400">{adminSuccess}</p>
      ) : null}

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

      {activeTab === "restaurants" ? (
        <section className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Manage Restaurants
            </h2>
            <button
              type="button"
              onClick={() => setShowAddRestaurantForm((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Add Restaurant
            </button>
          </div>

          {showAddRestaurantForm ? (
            <div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
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
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddRestaurant}
                  disabled={!name.trim()}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Restaurant
                </button>
              </div>
            </div>
          ) : null}

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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-3">Restaurant</th>
                    <th className="px-3 py-3">Restaurant ID</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                        Loading restaurants...
                      </td>
                    </tr>
                  ) : filteredRestaurants.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                        No restaurants found.
                      </td>
                    </tr>
                  ) : (
                    filteredRestaurants.map((restaurant) => (
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
                        <td className="px-3 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled
                              title="Edit action is not implemented yet"
                              className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-500 disabled:opacity-70 dark:border-gray-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled
                              title="Delete action is not implemented yet"
                              className="rounded-md border border-error-300 px-2.5 py-1 text-xs text-error-500 disabled:opacity-70 dark:border-error-500/50"
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

      {activeTab === "admins" ? (
        <section className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Manage Restaurant Admins
            </h2>
            <button
              type="button"
              onClick={() => setShowAddAdminForm((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Add Restaurant Admin
            </button>
          </div>

          {showAddAdminForm ? (
            <div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
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
                  Admin Password <span className="text-error-500">*</span>
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddRestaurantAdmin}
                  disabled={!selectedRestaurantId.trim() || !adminName.trim() || !adminPassword.trim()}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Restaurant Admin
                </button>
              </div>
            </div>
          ) : null}

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
            <div className="overflow-x-auto">
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
                    filteredAdmins.map((admin) => (
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
                              disabled
                              title="Edit action is not implemented yet"
                              className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-500 disabled:opacity-70 dark:border-gray-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled
                              title="Delete action is not implemented yet"
                              className="rounded-md border border-error-300 px-2.5 py-1 text-xs text-error-500 disabled:opacity-70 dark:border-error-500/50"
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
    </div>
  );
}

