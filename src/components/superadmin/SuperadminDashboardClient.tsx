"use client";

import {
  createRestaurant,
  getAuthSession,
  listRestaurants,
} from "@/lib/auth";
import { useEffect, useState } from "react";

type Restaurant = {
  restaurantId: string;
  name: string;
  isActive: boolean;
};

export default function SuperadminDashboardClient() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      await loadRestaurants();
    } catch {
      setError("Failed to create restaurant.");
    }
  };

  useEffect(() => {
    loadRestaurants();
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
        Superadmin Dashboard
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Manage restaurants from API.
      </p>
      {error ? <p className="mt-2 text-sm text-error-500">{error}</p> : null}

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
            <button
              type="button"
              onClick={loadRestaurants}
              className="ml-2 inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Refresh List
            </button>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
            Existing Restaurants
          </h2>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            {loading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading restaurants...
              </p>
            ) : restaurants.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No restaurants yet. Create one using the form.
              </p>
            ) : (
              <ul className="space-y-2">
                {restaurants.map((r, idx) => (
                  <li
                    key={`${r.restaurantId}-${r.name}-${idx}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-gray-700"
                  >
                    <div className="text-left">
                      <span className="block text-gray-800 dark:text-gray-100">
                        {r.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Id: {r.restaurantId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
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
    </div>
  );
}

