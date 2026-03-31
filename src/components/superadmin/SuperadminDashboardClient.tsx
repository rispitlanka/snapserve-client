"use client";

import { useState } from "react";
import {
  DYNAMIC_ADMIN_STORAGE_KEY,
  DynamicAdminUser,
} from "@/lib/mockAuth";

type Restaurant = {
  restaurantId: string;
  name: string;
  isActive: boolean;
};

const RESTAURANT_STORAGE_KEY = "mock_restaurants";

export default function SuperadminDashboardClient() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    try {
      const stored = localStorage.getItem(RESTAURANT_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as Array<
        Partial<Restaurant> & { name?: string; isActive?: boolean }
      >;
      if (!Array.isArray(parsed)) return [];

      // Backward compatible: add an id for older restaurant records.
      return parsed
        .filter((item) => !!item.name)
        .map((item, index) => ({
          restaurantId:
            item.restaurantId || `RST${String(index + 1).padStart(3, "0")}`,
          name: String(item.name),
          isActive: Boolean(item.isActive),
        }));
    } catch {
      localStorage.removeItem(RESTAURANT_STORAGE_KEY);
      return [];
    }
  });
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [admins, setAdmins] = useState<DynamicAdminUser[]>(() => {
    try {
      const storedAdmins = localStorage.getItem(DYNAMIC_ADMIN_STORAGE_KEY);
      if (!storedAdmins) return [];
      const parsedAdmins = JSON.parse(storedAdmins) as DynamicAdminUser[];
      return Array.isArray(parsedAdmins) ? parsedAdmins : [];
    } catch {
      localStorage.removeItem(DYNAMIC_ADMIN_STORAGE_KEY);
      return [];
    }
  });
  const [adminRestaurantId, setAdminRestaurantId] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const generateRestaurantId = () => {
    const value = Math.random().toString(36).slice(2, 8).toUpperCase();
    return value;
  };

  const handleAddRestaurant = () => {
    if (!name.trim()) return;
    const restaurantId = generateRestaurantId();
    const next: Restaurant[] = [
      ...restaurants,
      { restaurantId, name: name.trim(), isActive },
    ];
    setRestaurants(next);
    localStorage.setItem(RESTAURANT_STORAGE_KEY, JSON.stringify(next));
    setName("");
    setIsActive(true);
  };

  const handleAddAdmin = () => {
    if (!adminRestaurantId.trim() || !adminName.trim() || !adminPassword) {
      return;
    }

    const newAdmin: DynamicAdminUser = {
      restaurantId: adminRestaurantId.trim(),
      name: adminName.trim(),
      password: adminPassword,
      role: "admin",
    };

    const nextAdmins = [...admins, newAdmin];
    setAdmins(nextAdmins);
    localStorage.setItem(DYNAMIC_ADMIN_STORAGE_KEY, JSON.stringify(nextAdmins));

    setAdminRestaurantId("");
    setAdminName("");
    setAdminPassword("");
  };

  const handleUseRestaurantForAdmin = (restaurantId: string) => {
    setAdminRestaurantId(restaurantId);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
        Superadmin Dashboard
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Manage restaurants (mock data only).
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
            Create Restaurant
          </h2>
          <div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Test2"
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
              <label
                htmlFor="isActive"
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Is Active
              </label>
            </div>
            <button
              type="button"
              onClick={handleAddRestaurant}
              disabled={!name.trim()}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add Restaurant
            </button>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
            Existing Restaurants
          </h2>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            {restaurants.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No restaurants yet. Create one using the form.
              </p>
            ) : (
              <ul className="space-y-2">
                {restaurants.map((r, idx) => (
                  <li
                    key={`${r.restaurantId}-${r.name}-${idx}`}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition dark:border-gray-700 ${
                      adminRestaurantId === r.restaurantId
                        ? "border-brand-300 bg-brand-50/40 dark:border-brand-700 dark:bg-brand-500/10"
                        : "border-gray-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleUseRestaurantForAdmin(r.restaurantId)}
                      className="text-left"
                    >
                      <span className="block text-gray-800 dark:text-gray-100">
                        {r.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Id: {r.restaurantId}
                      </span>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUseRestaurantForAdmin(r.restaurantId)}
                        className="inline-flex items-center rounded-md border border-brand-200 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-500/10"
                      >
                        Use for admin
                      </button>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          r.isActive
                            ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {r.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
            Create Admin for Restaurant
          </h2>
          <div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Restaurant Id <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={adminRestaurantId}
                onChange={(e) => setAdminRestaurantId(e.target.value)}
                placeholder="0RW0SH"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Admin Name <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="owner1"
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
                placeholder="Owner@12345"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>
            <button
              type="button"
              onClick={handleAddAdmin}
              disabled={
                !adminRestaurantId.trim() ||
                !adminName.trim() ||
                !adminPassword
              }
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add Admin
            </button>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
            Existing Admins
          </h2>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            {admins.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No admins yet. Create one using the form.
              </p>
            ) : (
              <ul className="space-y-2">
                {admins.map((admin, idx) => (
                  <li
                    key={`${admin.restaurantId}-${admin.name}-${idx}`}
                    className="flex flex-col rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-gray-700"
                  >
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      {admin.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Restaurant Id: {admin.restaurantId}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

