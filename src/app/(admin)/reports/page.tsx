import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports",
  description: "Superadmin reports page",
};

export default function ReportsPage() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Reports</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Reports content will be added here.
      </p>
    </section>
  );
}
