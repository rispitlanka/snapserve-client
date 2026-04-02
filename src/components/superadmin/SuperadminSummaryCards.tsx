"use client";

import MetricCard from "@/components/common/MetricCard";
import { BoxCubeIcon, GroupIcon } from "@/icons";
import type { DashboardSummary } from "@/lib/auth";
import { getAuthSession, listRestaurantAdmins, listRestaurants, ROLE_DASHBOARD_ROUTE } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const toList = (rawData: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(rawData)) return rawData as Array<Record<string, unknown>>;

  if (!rawData || typeof rawData !== "object") return [];

  const body = rawData as Record<string, unknown>;
  const candidates = [body.data, body.items, body.results, body.restaurants, body.admins, body.users];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as Array<Record<string, unknown>>;
    }
  }

  return [];
};

export default function SuperadminSummaryCards() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary>({
    totalRestaurants: 0,
    totalRestaurantAdmins: 0,
    activeRestaurants: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSummary = async () => {
      const session = getAuthSession();
      if (!session) {
        router.replace("/signin");
        return;
      }

      if (session.user.role !== "superadmin") {
        router.replace(ROLE_DASHBOARD_ROUTE[session.user.role]);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [restaurantsRaw, adminsRaw] = await Promise.all([
          listRestaurants(session.accessToken),
          listRestaurantAdmins(session.accessToken),
        ]);

        const restaurants = toList(restaurantsRaw);
        const admins = toList(adminsRaw);

        setSummary({
          totalRestaurants: restaurants.length,
          totalRestaurantAdmins: admins.length,
          activeRestaurants: restaurants.filter((restaurant) => Boolean(restaurant.isActive)).length,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard summary."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadSummary();
  }, [router]);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Superadmin Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Overview of restaurants and restaurant admins.
        </p>
      </div>

      {error ? <p className="text-sm text-error-500">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Total Restaurants"
          value={summary.totalRestaurants.toLocaleString()}
          description="All restaurants registered in the system"
          icon={<BoxCubeIcon className="size-6 text-brand-600 dark:text-brand-400" />}
          accentClassName="bg-brand-50 dark:bg-brand-500/10"
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Restaurant Admins"
          value={summary.totalRestaurantAdmins.toLocaleString()}
          description="Users managing restaurant accounts"
          icon={<GroupIcon className="size-6 text-success-600 dark:text-success-400" />}
          accentClassName="bg-success-50 dark:bg-success-500/10"
          isLoading={isLoading}
        />
        <MetricCard
          title="Active Restaurants"
          value={summary.activeRestaurants.toLocaleString()}
          description="Restaurants currently marked active"
          icon={<BoxCubeIcon className="size-6 text-warning-600 dark:text-warning-400" />}
          accentClassName="bg-warning-50 dark:bg-warning-500/10"
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}
