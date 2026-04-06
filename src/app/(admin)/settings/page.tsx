import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Application settings",
};

export default function SettingsPage() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Settings</h1>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
        Upcoming: Settings options are under development and will be available soon.
      </p>
    </div>
  );
}
