"use client";

import { useEffect, useState } from "react";
import {
  DYNAMIC_ADMIN_STORAGE_KEY,
  DynamicAdminUser,
  MOCK_AUTH_STORAGE_KEY,
  MockAuthUser,
} from "@/lib/mockAuth";
import { useRouter } from "next/navigation";

export default function AdminDashboardClient() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<MockAuthUser | null>(null);
  const [admins, setAdmins] = useState<DynamicAdminUser[]>([]);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem(MOCK_AUTH_STORAGE_KEY);
    if (!storedUser) {
      router.replace("/signin");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as MockAuthUser;
      if (parsedUser.role !== "admin") {
        router.replace("/");
        return;
      }
      setCurrentUser(parsedUser);
    } catch {
      localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
      router.replace("/signin");
      return;
    }

    const storedAdmins = localStorage.getItem(DYNAMIC_ADMIN_STORAGE_KEY);
    if (storedAdmins) {
      try {
        const parsedAdmins = JSON.parse(storedAdmins) as DynamicAdminUser[];
        setAdmins(parsedAdmins);
      } catch {
        localStorage.removeItem(DYNAMIC_ADMIN_STORAGE_KEY);
      }
    }
  }, [router]);

  if (!currentUser) {
    return null;
  }

  const restaurantId = currentUser.restaurantId;

  const restaurantAdmins = admins.filter(
    (admin) =>
      admin.restaurantId.toLowerCase() === restaurantId.toLowerCase()
  );

  const handleAddAdmin = () => {
    if (!name.trim() || !password) return;

    const newAdmin: DynamicAdminUser = {
      restaurantId,
      name: name.trim(),
      password,
      role: "admin",
    };

    const nextAdmins = [...admins, newAdmin];
    setAdmins(nextAdmins);
    localStorage.setItem(DYNAMIC_ADMIN_STORAGE_KEY, JSON.stringify(nextAdmins));

    setName("");
    setPassword("");
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
        Admin Dashboard
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Restaurant Id: {restaurantId}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
            Create Admin for this Restaurant
          </h2>
          <div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Admin Name <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Owner@12345"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>
            <button
              type="button"
              onClick={handleAddAdmin}
              disabled={!name.trim() || !password}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add Admin
            </button>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
            Existing Admins for this Restaurant
          </h2>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            {restaurantAdmins.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No admins yet. Create one using the form.
              </p>
            ) : (
              <ul className="space-y-2">
                {restaurantAdmins.map((admin, idx) => (
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

