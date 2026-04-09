"use client";

import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { InfoIcon, ReceiptIcon } from "@/icons";
import {
  AuthSession,
  clearAuthSession,
  getAuthSession,
  listRegisters,
  logout,
  Register,
  ROLE_DASHBOARD_ROUTE,
  saveAuthSession,
  selectRegister,
} from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

const registerSelectClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800";

type CashSummaryCard = {
  label: string;
  value: string;
};

const UNCLOSED_ACCOUNT_STATS: CashSummaryCard[] = [
  { label: "Total Sales (cash)", value: "0.00" },
  { label: "Credit Settlement (cash)", value: "0.00" },
  { label: "Total Purchase (cash)", value: "(0.00)" },
  { label: "Total Expenses (cash)", value: "(0.00)" },
  { label: "Total Petty Cash (Reimbursement)", value: "(0.00)" },
  { label: "Cash Out", value: "(0.00)" },
];

const UNCLOSED_ACCOUNT_HIGHLIGHT_STATS: CashSummaryCard[] = [
  { label: "Current Balance", value: "0.00" },
  { label: "Balance (on hand)", value: "0.00" },
];

export default function CashierDashboardClient() {
  const router = useRouter();
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [selectedRegister, setSelectedRegister] = useState("");
  const [registers, setRegisters] = useState<Register[]>([]);
  const [isLoadingRegisters, setIsLoadingRegisters] = useState(false);
  const [isSavingRegister, setIsSavingRegister] = useState(false);

  useEffect(() => {
    const loadSessionAndRegisters = async () => {
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
      setIsLoadingRegisters(true);
      try {
        const availableRegisters = await listRegisters(
          session.accessToken,
          session.user.restaurantId
        );
        setRegisters(availableRegisters);

        if (session.user.registerId) {
          setSelectedRegister(session.user.registerId);
        } else if (session.user.register) {
          const selectedByName = availableRegisters.find(
            (item) => item.name === session.user.register
          );
          if (selectedByName) {
            setSelectedRegister(selectedByName.id);
          }
        }
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to load registers. Please try again."
        );
      } finally {
        setIsLoadingRegisters(false);
      }
    };

    void loadSessionAndRegisters();
  }, [router]);

  const handleSelectRegister = async () => {
    if (!authSession || !selectedRegister) return;
    setIsSavingRegister(true);

    try {
      const selectedRegisterObj = registers.find(
        (register) => register.id === selectedRegister
      );
      await selectRegister(authSession.accessToken, selectedRegister);
      const updatedSession: AuthSession = {
        ...authSession,
        requiresRegisterSelection: false,
        registerId: selectedRegister,
        user: {
          ...authSession.user,
          register: selectedRegisterObj?.name || selectedRegister,
          registerId: selectedRegister,
        },
      };
      saveAuthSession(updatedSession);
      setAuthSession(updatedSession);
      toast.success("Register selected successfully.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to select register. Please try again.";
      toast.error(message);
    } finally {
      setIsSavingRegister(false);
    }
  };

  const handleLogout = useCallback(async () => {
    if (!authSession) return;
    try {
      await logout(authSession.refreshToken);
      toast.success("Signed out successfully.");
    } catch {
      toast.error("Sign-out request failed. Clearing local session.");
    } finally {
      clearAuthSession();
      router.replace("/signin");
    }
  }, [authSession, router]);

  if (!authSession) return null;

  const needsRegisterSelection =
    authSession.requiresRegisterSelection || !authSession.user.register;

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Cashier Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {needsRegisterSelection
              ? "Select a terminal in the dialog to start your session."
              : `Active register: ${authSession.user.register}`}
          </p>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="text-gray-500" fontSize="small" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Unclosed Account Details
            </h2>
          </div>

          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {UNCLOSED_ACCOUNT_STATS.map((item) => (
                <article
                  key={item.label}
                  className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{item.value}</p>
                </article>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {UNCLOSED_ACCOUNT_HIGHLIGHT_STATS.map((item) => (
                <article
                  key={item.label}
                  className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.label}</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{item.value}</p>
                </article>
              ))}
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <p className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <InfoIcon className="mt-0.5 shrink-0" fontSize="small" />
                <span>
                  <span className="font-medium">Note:</span> This shows your current unclosed account since the
                  last closing on Apr 08, 2026 by Geerthana
                </span>
              </p>
            </div>
          </div>
        </section>
      </div>

      <Modal
        isOpen={needsRegisterSelection}
        onClose={() => {}}
        showCloseButton={false}
        allowDismiss={false}
        className="max-w-md m-4 p-6 sm:p-8"
      >
        <div className="pr-0 sm:pr-2">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Choose terminal
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Pick an available register for this session, or sign out.
          </p>
          <div className="mt-5">
            <Label htmlFor="cashier-register-select">Available terminals</Label>
            <select
              id="cashier-register-select"
              value={selectedRegister}
              onChange={(e) => setSelectedRegister(e.target.value)}
              className={`${registerSelectClass} mt-1.5`}
            >
              <option value="">Select register</option>
              {registers.map((register) => (
                <option
                  key={register.id}
                  value={register.id}
                  disabled={!register.isActive || Boolean(register.occupiedBySessionId)}
                >
                  {register.name}
                  {!register.isActive ? " (Inactive)" : ""}
                  {register.occupiedBySessionId ? " (Occupied)" : ""}
                </option>
              ))}
            </select>
            {isLoadingRegisters ? (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading registers...</p>
            ) : null}
            {!isLoadingRegisters && registers.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                No registers available for this account.
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" onClick={handleLogout}>
              Log out
            </Button>
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              onClick={handleSelectRegister}
              disabled={!selectedRegister || isSavingRegister || isLoadingRegisters}
            >
              {isSavingRegister ? "Saving..." : "Continue"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
