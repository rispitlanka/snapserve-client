"use client";

import {
  MOCK_AUTH_STORAGE_KEY,
  MOCK_REGISTERS,
  MockAuthUser,
  MockRegister,
  ROLE_DASHBOARD_ROUTE,
} from "@/lib/mockAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CashierDashboardClient() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<MockAuthUser | null>(null);
  const [selectedRegister, setSelectedRegister] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem(MOCK_AUTH_STORAGE_KEY);
    if (!storedUser) {
      router.replace("/signin");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as MockAuthUser;
      if (parsedUser.role !== "cashier") {
        router.replace(ROLE_DASHBOARD_ROUTE[parsedUser.role]);
        return;
      }
      setAuthUser(parsedUser);
      if (parsedUser.register) {
        setSelectedRegister(parsedUser.register);
      }
    } catch {
      localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
      router.replace("/signin");
    }
  }, [router]);

  const handleSelectRegister = () => {
    if (!authUser || !selectedRegister) return;
    const updatedUser: MockAuthUser = {
      ...authUser,
      register: selectedRegister as MockRegister,
    };
    localStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    setAuthUser(updatedUser);
  };

  if (!authUser) return null;

  if (!authUser.register) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Choose Register
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Select terminal for this cashier session.
        </p>
        <div className="mt-5 max-w-sm">
          <select
            value={selectedRegister}
            onChange={(e) => setSelectedRegister(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
          >
            <option value="">Select register</option>
            {MOCK_REGISTERS.map((register) => (
              <option key={register} value={register}>
                {register}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSelectRegister}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedRegister}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
        Cashier Dashboard
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Active register: {authUser.register}
      </p>
    </div>
  );
}

