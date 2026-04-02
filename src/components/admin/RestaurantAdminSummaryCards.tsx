"use client";

import MetricCard from "@/components/common/MetricCard";
import { BoxCubeIcon, UserIcon } from "@/icons";
import { getAuthSession, listStaff, listSuppliers, ROLE_DASHBOARD_ROUTE } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminSummary = {
  totalStaffs: number;
  totalSuppliers: number;
};

export default function RestaurantAdminSummaryCards() {
  const router = useRouter();
  const [summary, setSummary] = useState<AdminSummary>({
    totalStaffs: 0,
    totalSuppliers: 0,
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

      if (session.user.role !== "admin") {
        router.replace(ROLE_DASHBOARD_ROUTE[session.user.role]);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [staff, suppliers] = await Promise.all([
          listStaff(session.accessToken),
          listSuppliers(session.accessToken),
        ]);

        setSummary({
          totalStaffs: staff.length,
          totalSuppliers: suppliers.length,
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
          Admin Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Overview of staff and supplier counts.
        </p>
      </div>

      {error ? <p className="text-sm text-error-500">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          title="Total Staffs"
          value={summary.totalStaffs.toLocaleString()}
          description="Cashier and waiter accounts"
          icon={<UserIcon className="size-6 text-brand-600 dark:text-brand-400" />}
          accentClassName="bg-brand-50 dark:bg-brand-500/10"
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Suppliers"
          value={summary.totalSuppliers.toLocaleString()}
          description="Suppliers linked to this restaurant"
          icon={<BoxCubeIcon className="size-6 text-success-600 dark:text-success-400" />}
          accentClassName="bg-success-50 dark:bg-success-500/10"
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}