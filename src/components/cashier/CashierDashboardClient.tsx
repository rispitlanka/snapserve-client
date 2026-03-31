"use client";

import {
  AuthSession,
  getAuthSession,
  REGISTER_OPTIONS,
  ROLE_DASHBOARD_ROUTE,
  saveAuthSession,
  selectRegister,
} from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CashierDashboardClient() {
  const router = useRouter();
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [selectedRegister, setSelectedRegister] = useState("");
  const [isSavingRegister, setIsSavingRegister] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      router.replace("/signin");
      return;
    }

    if (session.user.role !== "cashier") {
      router.replace(ROLE_DASHBOARD_ROUTE[session.user.role]);
      return;
    }

    setAuthSession(session);
    if (session.user.register) {
      setSelectedRegister(session.user.register);
    }
  }, [router]);

  const handleSelectRegister = async () => {
    if (!authSession || !selectedRegister) return;
    setError("");
    setIsSavingRegister(true);

    try {
      await selectRegister(authSession.accessToken, selectedRegister);
      const updatedSession: AuthSession = {
        ...authSession,
        requiresRegisterSelection: false,
        registerId: selectedRegister,
        user: {
          ...authSession.user,
          register: selectedRegister,
          registerId: selectedRegister,
        },
      };
      saveAuthSession(updatedSession);
      setAuthSession(updatedSession);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to select register. Please try again."
      );
    } finally {
      setIsSavingRegister(false);
    }
  };

  if (!authSession) return null;

  if (authSession.requiresRegisterSelection || !authSession.user.register) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Choose Register
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Select terminal for this cashier session.
        </p>
        {error ? <p className="mt-3 text-sm text-error-500">{error}</p> : null}
        <div className="mt-5 max-w-sm">
          <select
            value={selectedRegister}
            onChange={(e) => setSelectedRegister(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
          >
            <option value="">Select register</option>
            {REGISTER_OPTIONS.map((register) => (
              <option key={register} value={register}>
                {register}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSelectRegister}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedRegister || isSavingRegister}
          >
            {isSavingRegister ? "Saving..." : "Continue"}
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
        Active register: {authSession.user.register}
      </p>
    </div>
  );
}

