"use client";

import ClientTablePagination from "@/components/common/ClientTablePagination";
import Input from "@/components/form/input/InputField";
import { getAuthSession, ROLE_DASHBOARD_ROUTE } from "@/lib/auth";
import { formatDateTimeForDisplay } from "@/lib/format";
import {
  listCustomerCredits,
  listCustomers,
  type Customer,
  type CustomerCredit,
} from "@/lib/customers";
import { useClientPagedSlice } from "@/lib/pagination/clientPaging";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const getValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
};

export default function CustomerCreditSettlementClient() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [credits, setCredits] = useState<CustomerCredit[]>([]);
  const [customerCreditSummary, setCustomerCreditSummary] = useState<
    Record<string, { invoiceCount: number; outstandingTotal: number }>
  >({});
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "customer">("recent");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const initialize = async () => {
      const session = getAuthSession();
      if (!session) {
        router.replace("/signin");
        return;
      }

      if (session.user.role !== "cashier" && session.user.role !== "admin") {
        router.replace(ROLE_DASHBOARD_ROUTE[session.user.role]);
        return;
      }

      setSessionReady(true);
      setIsLoadingCustomers(true);
      try {
        const list = await listCustomers(session.accessToken);
        setCustomers(list);
        setIsLoadingSummary(true);
        const creditList = await Promise.all(
          list.map(async (customer) => {
            try {
              const rows = await listCustomerCredits(session.accessToken, customer.id);
              return [customer.id, rows] as const;
            } catch {
              return [customer.id, []] as const;
            }
          })
        );
        const summary: Record<string, { invoiceCount: number; outstandingTotal: number }> = {};
        for (const [customerId, rows] of creditList) {
          let outstandingTotal = 0;
          for (const credit of rows) {
            const row = credit as Record<string, unknown>;
            const rawOutstanding = getValue(row, ["outstanding", "remainingBalance", "balance"]) || "0";
            const outstanding = Number(rawOutstanding);
            if (Number.isFinite(outstanding)) outstandingTotal += outstanding;
          }
          summary[customerId] = {
            invoiceCount: rows.length,
            outstandingTotal,
          };
        }
        setCustomerCreditSummary(summary);
        if (list[0]?.id) {
          setSelectedCustomerId(list[0].id);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load customers.");
      } finally {
        setIsLoadingCustomers(false);
        setIsLoadingSummary(false);
      }
    };

    void initialize();
  }, [router]);

  useEffect(() => {
    const loadCredits = async () => {
      const session = getAuthSession();
      if (!session || !selectedCustomerId) {
        setCredits([]);
        return;
      }

      setIsLoadingCredits(true);
      try {
        const rows = await listCustomerCredits(session.accessToken, selectedCustomerId);
        setCredits(rows);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load customer credits.");
      } finally {
        setIsLoadingCredits(false);
      }
    };

    void loadCredits();
  }, [selectedCustomerId]);

  const filteredCredits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return credits;
    return credits.filter((credit) => {
      const row = credit as Record<string, unknown>;
      const searchable = [
        getValue(row, ["invoiceNo", "invoice", "refNo"]),
        getValue(row, ["outstanding", "remainingBalance", "balance"]),
        getValue(row, ["dueDate", "createdAt"]),
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [credits, searchQuery]);

  const filteredSortedCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rows = customers.filter((customer) => {
      const row = customer as Record<string, unknown>;
      const name = getValue(row, ["name", "customerName"]);
      const mobile = getValue(row, ["mobileNumber", "phone", "contactNumber"]);
      const loyalty = getValue(row, ["loyaltyPoints", "pointsBalance", "loyalty_points", "points"]);
      const summary = customerCreditSummary[customer.id];
      const searchable = `${name} ${mobile} ${loyalty} ${summary?.invoiceCount ?? 0} ${
        summary?.outstandingTotal ?? 0
      }`.toLowerCase();
      return !q || searchable.includes(q);
    });

    const sorted = [...rows];
    if (sortBy === "customer") {
      sorted.sort((a, b) => {
        const aName = getValue(a as Record<string, unknown>, ["name", "customerName"]);
        const bName = getValue(b as Record<string, unknown>, ["name", "customerName"]);
        return aName.localeCompare(bName);
      });
    } else {
      sorted.sort((a, b) => {
        const aDate = new Date(
          getValue(a as Record<string, unknown>, ["updatedAt", "updated_at", "createdAt", "created_at"]) || 0
        ).getTime();
        const bDate = new Date(
          getValue(b as Record<string, unknown>, ["updatedAt", "updated_at", "createdAt", "created_at"]) || 0
        ).getTime();
        return bDate - aDate;
      });
    }
    return sorted;
  }, [customerCreditSummary, customers, searchQuery, sortBy]);

  const pagedCustomers = useClientPagedSlice(filteredSortedCustomers, page, pageSize);
  const pagedCredits = useClientPagedSlice(filteredCredits, 1, 5);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortBy]);

  useEffect(() => {
    if (pagedCustomers.safePage !== page) setPage(pagedCustomers.safePage);
  }, [page, pagedCustomers.safePage]);

  if (!sessionReady) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading credit settlement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Customer Credit Settlement</h1>
        <div className="flex items-center gap-2 sm:justify-end">
          <span className="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-400">Sort</span>
          <select
            id="credit-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "recent" | "customer")}
            className="h-11 min-w-44 rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="recent">Recent</option>
            <option value="customer">Customer</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 p-4 dark:border-gray-800">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer, mobile, loyalty, outstanding..."
            className="h-11! md:max-w-sm"
          />
        </div>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <th className="px-3 py-3">Customer</th>
              <th className="px-3 py-3">Mobile</th>
              <th className="px-3 py-3">Loyalty Points</th>
              <th className="px-3 py-3">Outstanding Invoices</th>
              <th className="px-3 py-3">Outstanding Amount</th>
              <th className="px-3 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoadingCustomers || isLoadingSummary ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                  Loading customer credits...
                </td>
              </tr>
            ) : filteredSortedCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                  No customers found.
                </td>
              </tr>
            ) : (
              pagedCustomers.slice.map((customer) => {
                const row = customer as Record<string, unknown>;
                const summary = customerCreditSummary[customer.id] ?? { invoiceCount: 0, outstandingTotal: 0 };
                return (
                  <tr
                    key={customer.id}
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className={`cursor-pointer ${
                      selectedCustomerId === customer.id ? "bg-brand-50/60 dark:bg-brand-500/10" : ""
                    }`}
                  >
                    <td className="px-3 py-3 text-sm text-gray-800 dark:text-gray-100">
                      {getValue(row, ["name", "customerName"]) || "-"}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {getValue(row, ["mobileNumber", "phone", "contactNumber"]) || "-"}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {getValue(row, ["loyaltyPoints", "pointsBalance", "loyalty_points", "points"]) || "0"}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {summary.invoiceCount}
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                      {summary.outstandingTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {formatDateTimeForDisplay(getValue(row, ["updatedAt", "updated_at", "createdAt", "created_at"]))}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoadingCustomers && !isLoadingSummary ? (
        <ClientTablePagination
          page={pagedCustomers.safePage}
          totalPages={pagedCustomers.totalPages}
          totalItems={pagedCustomers.total}
          pageSize={pageSize}
          rangeFrom={pagedCustomers.rangeFrom}
          rangeTo={pagedCustomers.rangeTo}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          disabled={isLoadingCustomers || isLoadingSummary}
        />
      ) : null}

      {selectedCustomerId ? (
        <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Selected customer credit invoices</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="px-3 py-3">Invoice</th>
                  <th className="px-3 py-3">Outstanding</th>
                  <th className="px-3 py-3">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoadingCredits ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                      Loading selected customer invoices...
                    </td>
                  </tr>
                ) : pagedCredits.slice.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                      No outstanding credit invoices.
                    </td>
                  </tr>
                ) : (
                  pagedCredits.slice.map((credit) => {
                    const row = credit as Record<string, unknown>;
                    return (
                      <tr key={credit.id}>
                        <td className="px-3 py-3 text-sm text-gray-800 dark:text-gray-100">
                          {getValue(row, ["invoiceNo", "invoice", "refNo"]) || "-"}
                        </td>
                        <td className="px-3 py-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                          {getValue(row, ["outstanding", "remainingBalance", "balance"]) || "0"}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {formatDateTimeForDisplay(getValue(row, ["dueDate", "createdAt", "created_at"]))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
