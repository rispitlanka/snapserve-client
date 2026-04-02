"use client";
import { getAuthSession } from "@/lib/auth";

export default function UserMetaCard() {
  const session = getAuthSession();
  const role = session?.user?.role ?? "-";
  const userName = session?.user?.name ?? "-";
  const restaurant = session?.user?.restaurantId ?? "-";

  return (
    <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6">
      <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        User Details
      </h4>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Admin Name</p>
          <p className="mt-2 text-sm font-medium text-gray-800 dark:text-gray-100">{userName}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Restaurant</p>
          <p className="mt-2 text-sm font-medium text-gray-800 dark:text-gray-100">{restaurant}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Role</p>
          <p className="mt-2 text-sm font-medium capitalize text-gray-800 dark:text-gray-100">{role}</p>
        </div>
      </div>
    </div>
  );
}
