"use client";

import ClientTablePagination from "@/components/common/ClientTablePagination";
import Input from "@/components/form/input/InputField";
import { getAuthSession, ROLE_DASHBOARD_ROUTE } from "@/lib/auth";
import { formatDateTimeForDisplay } from "@/lib/format";
import { listCustomerCredits, listCustomers, type Customer, type CustomerCredit } from "@/lib/customers";
import { useClientPagedSlice } from "@/lib/pagination/clientPaging";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type ChequeRow = {
  id: string;
  customerId: string;
  customerName: string;
  mobileNumber: string;
  credit: CustomerCredit;
};

const getValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
};

const isChequeCredit = (row: Record<string, unknown>) => {
  const method = getValue(row, ["paymentMethod", "payment_method", "method"]).toUpperCase();
  const chequeNo = getValue(row, ["chequeNo", "chequeNumber", "checkNo", "checkNumber"]);
  return method.includes("CHEQUE") || method.includes("CHECK") || Boolean(chequeNo);
};

export default function CustomerChequesClient() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [chequeRows, setChequeRows] = useState<ChequeRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
      setIsLoading(true);
      try {
        const customers = await listCustomers(session.accessToken);
        const rows = await Promise.all(
          customers.map(async (customer) => {
            const customerRecord = customer as Record<string, unknown>;
            const customerName = getValue(customerRecord, ["name", "customerName"]) || customer.id;
            const mobileNumber = getValue(customerRecord, ["mobileNumber", "phone", "contactNumber"]);
            try {
              const credits = await listCustomerCredits(session.accessToken, customer.id);
              return credits
                .filter((credit) => isChequeCredit(credit as Record<string, unknown>))
                .map((credit) => ({
                  id: `${customer.id}-${credit.id}`,
                  customerId: customer.id,
                  customerName,
                  mobileNumber,
                  credit,
                }));
            } catch {
              return [] as ChequeRow[];
            }
          })
        );
        setChequeRows(rows.flat());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load cheque data.");
      } finally {
        setIsLoading(false);
      }
    };

    void initialize();
  }, [router]);

  const filteredSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = chequeRows.filter((entry) => {
      const row = entry.credit as Record<string, unknown>;
      const searchable = [
        entry.customerName,
        entry.mobileNumber,
        getValue(row, ["invoiceNo", "invoice", "refNo"]),
        getValue(row, ["chequeNo", "chequeNumber", "checkNo", "checkNumber"]),
        getValue(row, ["outstanding", "remainingBalance", "balance"]),
      ]
        .join(" ")
        .toLowerCase();
      return !q || searchable.includes(q);
    });

    const sorted = [...filtered];
    if (sortBy === "customer") {
      sorted.sort((a, b) => a.customerName.localeCompare(b.customerName));
    } else {
      sorted.sort((a, b) => {
        const aRow = a.credit as Record<string, unknown>;
        const bRow = b.credit as Record<string, unknown>;
        const aDate = new Date(
          getValue(aRow, ["updatedAt", "updated_at", "createdAt", "created_at", "chequeDate"]) || 0
        ).getTime();
        const bDate = new Date(
          getValue(bRow, ["updatedAt", "updated_at", "createdAt", "created_at", "chequeDate"]) || 0
        ).getTime();
        return bDate - aDate;
      });
    }
    return sorted;
  }, [chequeRows, searchQuery, sortBy]);

  const paged = useClientPagedSlice(filteredSorted, page, pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortBy]);

  useEffect(() => {
    if (paged.safePage !== page) setPage(paged.safePage);
  }, [page, paged.safePage]);

  if (!sessionReady) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading cheques...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Customer Cheques</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="w-full max-w-56">
          <label htmlFor="cheque-sort" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Sort
          </label>
          <select
            id="cheque-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "recent" | "customer")}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="recent">Recent</option>
            <option value="customer">Customer</option>
          </select>
        </div>

        <div className="lg:justify-self-end lg:min-w-[20rem]">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer, cheque no, invoice..."
            className="h-11!"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <th className="px-3 py-3">Customer</th>
              <th className="px-3 py-3">Mobile</th>
              <th className="px-3 py-3">Invoice</th>
              <th className="px-3 py-3">Cheque No</th>
              <th className="px-3 py-3">Cheque Date</th>
              <th className="px-3 py-3">Outstanding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                  Loading cheque records...
                </td>
              </tr>
            ) : filteredSorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                  No cheque records found.
                </td>
              </tr>
            ) : (
              paged.slice.map((entry) => {
                const row = entry.credit as Record<string, unknown>;
                return (
                  <tr key={entry.id}>
                    <td className="px-3 py-3 text-sm text-gray-800 dark:text-gray-100">{entry.customerName}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{entry.mobileNumber || "-"}</td>
                    <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {getValue(row, ["invoiceNo", "invoice", "refNo"]) || "-"}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {getValue(row, ["chequeNo", "chequeNumber", "checkNo", "checkNumber"]) || "-"}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {formatDateTimeForDisplay(getValue(row, ["chequeDate", "dueDate", "createdAt", "created_at"]))}
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                      {getValue(row, ["outstanding", "remainingBalance", "balance"]) || "0"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading ? (
        <ClientTablePagination
          page={paged.safePage}
          totalPages={paged.totalPages}
          totalItems={paged.total}
          pageSize={pageSize}
          rangeFrom={paged.rangeFrom}
          rangeTo={paged.rangeTo}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          disabled={isLoading}
        />
      ) : null}
    </div>
  );
}
