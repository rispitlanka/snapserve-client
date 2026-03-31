import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Superadmin Dashboard",
  description: "Role-based mock dashboard for superadmin",
};

export default function SuperadminDashboardPage() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
        Superadmin Dashboard
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Dashboard content will be added here.
      </p>
    </div>
  );
}
