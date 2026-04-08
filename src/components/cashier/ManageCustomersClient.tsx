"use client";

import ClientTablePagination from "@/components/common/ClientTablePagination";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { getAuthSession, ROLE_DASHBOARD_ROUTE } from "@/lib/auth";
import { createCustomer, listCustomers, type Customer } from "@/lib/customers";
import { useClientPagedSlice } from "@/lib/pagination/clientPaging";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type CustomerFormState = {
  name: string;
  mobileNumber: string;
};

const emptyCustomerForm: CustomerFormState = {
  name: "",
  mobileNumber: "",
};

const normalizeText = (value: string) => value.trim().toLowerCase();
const getValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
};

export default function ManageCustomersClient() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(emptyCustomerForm);
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPageSize, setCustomerPageSize] = useState(10);

  const refreshCustomers = async () => {
    const session = getAuthSession();
    if (!session) return;
    setIsLoadingCustomers(true);
    try {
      setCustomers(await listCustomers(session.accessToken));
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : "Failed to load customers.");
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const session = getAuthSession();
      if (!session) {
        router.replace("/signin");
        return;
      }

      if (session.user.role !== "cashier") {
        router.replace(ROLE_DASHBOARD_ROUTE[session.user.role]);
        return;
      }

      setSessionReady(true);
      await refreshCustomers();
    };

    void initialize();
  }, [router]);

  const filteredCustomers = useMemo(() => {
    const query = normalizeText(searchQuery);
    if (!query) return customers;
    return customers.filter((record) => {
      const row = record as Record<string, unknown>;
      const searchable = [
        getValue(row, ["name", "customerName"]),
        getValue(row, ["mobileNumber", "phone", "contactNumber", "mobile"]),
        getValue(row, ["loyaltyPoints", "pointsBalance", "loyalty_points", "points"]),
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [customers, searchQuery]);

  const pagedCustomers = useClientPagedSlice(filteredCustomers, customerPage, customerPageSize);

  useEffect(() => {
    setCustomerPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (pagedCustomers.safePage !== customerPage) {
      setCustomerPage(pagedCustomers.safePage);
    }
  }, [customerPage, pagedCustomers.safePage]);

  const openCustomerModal = () => {
    setCustomerForm(emptyCustomerForm);
    setIsCustomerModalOpen(true);
  };

  const closeCustomerModal = () => {
    setIsCustomerModalOpen(false);
    setCustomerForm(emptyCustomerForm);
  };

  const handleCustomerSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = customerForm.name.trim();
    const mobileRaw = customerForm.mobileNumber.trim();
    const mobileNumber = mobileRaw.replace(/\D/g, "");

    if (!name) {
      toast.error("Customer name is required.");
      return;
    }

    if (!mobileRaw) {
      toast.error("Mobile number is required.");
      return;
    }

    if (!/^[0-9]{10,15}$/.test(mobileNumber)) {
      toast.error("Mobile number must be 10-15 digits (numbers only).");
      return;
    }

    const session = getAuthSession();
    if (!session) {
      toast.error("Session not found. Please sign in again.");
      return;
    }

    setIsSavingCustomer(true);
    try {
      await createCustomer(session.accessToken, {
        name,
        mobileNumber,
      });
      toast.success("Customer created successfully.");
      closeCustomerModal();
      await refreshCustomers();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to create customer.";
      toast.error(message);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading customers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Manage Customers</h1>
        <button
          type="button"
          onClick={openCustomerModal}
          className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Add Customer
        </button>
      </div>

      <section className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <Input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name, mobile number, or loyalty points"
          className="h-10! md:max-w-sm"
        />

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Mobile Number</th>
                <th className="px-3 py-3">Loyalty Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoadingCustomers ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                    Loading customers...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                    No customers found.
                  </td>
                </tr>
              ) : (
                pagedCustomers.slice.map((record) => {
                  const row = record as Record<string, unknown>;
                  return (
                    <tr key={record.id}>
                      <td className="px-3 py-3 text-sm text-gray-800 dark:text-gray-100">
                        {getValue(row, ["name", "customerName"]) || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {getValue(row, ["mobileNumber", "phone", "contactNumber", "mobile"]) || "-"}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {getValue(row, ["loyaltyPoints", "pointsBalance", "loyalty_points", "points"]) || "0"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoadingCustomers ? (
          <ClientTablePagination
            page={pagedCustomers.safePage}
            totalPages={pagedCustomers.totalPages}
            totalItems={pagedCustomers.total}
            pageSize={customerPageSize}
            rangeFrom={pagedCustomers.rangeFrom}
            rangeTo={pagedCustomers.rangeTo}
            onPageChange={setCustomerPage}
            onPageSizeChange={(size) => {
              setCustomerPageSize(size);
              setCustomerPage(1);
            }}
            disabled={isLoadingCustomers}
          />
        ) : null}
      </section>

      <Modal isOpen={isCustomerModalOpen} onClose={closeCustomerModal} className="max-w-[560px] p-4 sm:p-6">
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Add Customer</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create a customer record for cashier transactions.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleCustomerSave}>
            <div>
              <Label>Name</Label>
              <Input
                type="text"
                value={customerForm.name}
                onChange={(event) => setCustomerForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Customer name"
              />
            </div>

            <div>
              <Label>Mobile Number</Label>
              <Input
                type="tel"
                value={customerForm.mobileNumber}
                onChange={(event) => setCustomerForm((prev) => ({ ...prev, mobileNumber: event.target.value }))}
                placeholder="9835543210"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" size="sm" variant="outline" onClick={closeCustomerModal}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSavingCustomer}>
                {isSavingCustomer ? "Saving..." : "Save Customer"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
