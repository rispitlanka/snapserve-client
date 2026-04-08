import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Menu List",
  description: "Menu list management is coming soon",
};

export default function ManageMenuListPage() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Menu List</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Upcoming: menu list management will be available here soon.</p>
    </section>
  );
}
