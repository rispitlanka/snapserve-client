"use client";

import ClientTablePagination from "@/components/common/ClientTablePagination";
import FlatpickrDateInput from "@/components/form/FlatpickrDateInput";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { Supplier } from "@/lib/auth";
import { ROLE_DASHBOARD_ROUTE, getAuthSession, listSuppliers } from "@/lib/auth";
import { formatDateTimeForDisplay } from "@/lib/format";
import type { InventoryItem } from "@/lib/inventory";
import { listInventoryItems } from "@/lib/inventory";
import { useClientPagedSlice } from "@/lib/pagination/clientPaging";
import {
  createPurchase,
  listPurchases,
  settlePurchaseCredit,
  type Purchase,
} from "@/lib/purchases";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export type PurchasesSection = "summary" | "invoice" | "settlement";

const titles: Record<PurchasesSection, string> = {
  summary: "Purchases summary",
  invoice: "New Invoice",
  settlement: "Credit settlement",
};

const PAYMENT_METHODS = ["CASH", "CREDIT", "CARD", "BANK_TRANSFER"] as const;

const invoiceSelectClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const invoiceFieldWrap = "flex flex-col gap-1.5";

const newLineKey = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `line-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const todayYmd = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function getField(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = record[key];
    if (v == null) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      return String(v);
    }
  }
  return "—";
}

function formatMoney(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) {
    return Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return "—";
}

/** Turns API codes like PARTIAL_SETTLED or pending into readable labels. */
function humanizeCodeLabel(raw: string): string {
  if (raw === "—") return raw;
  const s = raw.trim();
  if (!s) return "—";
  if (!s.includes("_") && s === s.toUpperCase() && s.length <= 24) {
    return s
      .toLowerCase()
      .split(/[\s_]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  if (s.includes("_")) {
    return s
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  return s;
}

function nestedRecordName(
  value: unknown,
  nameKeys: string[]
): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  for (const key of nameKeys) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function resolveSupplierDisplay(
  r: Record<string, unknown>,
  supplierNameById: Record<string, string>
): string {
  const fromNested = nestedRecordName(r.supplier ?? r.supplierInfo, ["name", "supplierName", "title"]);
  if (fromNested) return fromNested;

  const plainName = getField(r, ["supplierName", "supplier_name"]);
  if (plainName !== "—") return plainName;

  const id = getField(r, ["supplierId", "supplier_id"]).trim();
  if (id === "—" || !id) return "—";
  return supplierNameById[id] ?? id;
}

type DraftLine = {
  key: string;
  inventoryItemId: string;
  itemName: string;
  itemUnit: string;
  quantity: number;
  description: string;
  purchasePrice: number;
  sellingPrice: number;
};

const emptyLine = (): DraftLine => ({
  key: newLineKey(),
  inventoryItemId: "",
  itemName: "",
  itemUnit: "PCS",
  quantity: 1,
  description: "",
  purchasePrice: 0,
  sellingPrice: 0,
});

const detectUnitFromName = (name: string): "KG" | "L" | "PCS" => {
  const value = name.trim().toLowerCase();
  if (!value) return "PCS";

  const liquidKeywords = ["milk", "oil", "juice", "water", "syrup", "drink", "beverage", "litre", "liter"];
  const weightKeywords = [
    "rice",
    "flour",
    "sugar",
    "salt",
    "meat",
    "beef",
    "chicken",
    "fish",
    "fruit",
    "vegetable",
    "veg",
    "kg",
    "kilo",
    "kilogram",
  ];

  const tokens = value.split(/[^a-z]+/).filter(Boolean);
  const matchesKeyword = (keywords: string[]) =>
    keywords.some(
      (word) =>
        value.includes(word) ||
        tokens.some((token) => word.startsWith(token) || token.startsWith(word))
    );

  if (matchesKeyword(liquidKeywords)) return "L";
  if (matchesKeyword(weightKeywords)) return "KG";
  return "PCS";
};

type PurchasesClientProps = {
  section: PurchasesSection;
};

export default function PurchasesClient({ section }: PurchasesClientProps) {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState("");

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);

  const [purchasePage, setPurchasePage] = useState(1);
  const [purchasePageSize, setPurchasePageSize] = useState(10);

  const [supplierId, setSupplierId] = useState("");
  const [receiveDate, setReceiveDate] = useState(todayYmd);
  const [notes, setNotes] = useState("");
  const [refNo, setRefNo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [submittingPurchase, setSubmittingPurchase] = useState(false);

  const [settlementPurchaseId, setSettlementPurchaseId] = useState("");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementMethod, setSettlementMethod] = useState<string>("CASH");
  const [settlementNote, setSettlementNote] = useState("");
  const [submittingSettlement, setSubmittingSettlement] = useState(false);

  const getScopedAdminSession = useCallback(() => {
    const session = getAuthSession();
    if (!session) {
      router.replace("/signin");
      return null;
    }
    if (session.user.role !== "admin") {
      router.replace(ROLE_DASHBOARD_ROUTE[session.user.role]);
      return null;
    }
    if (!session.user.restaurantId) {
      setError("Invalid session scope. Please sign in again.");
      router.replace("/signin");
      return null;
    }
    return session;
  }, [router]);

  const loadPurchases = useCallback(async () => {
    const session = getScopedAdminSession();
    if (!session) return;
    setPurchasesLoading(true);
    setError("");
    try {
      const list = await listPurchases(session.accessToken);
      setPurchases(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load purchases.");
    } finally {
      setPurchasesLoading(false);
    }
  }, [getScopedAdminSession]);

  const loadInvoiceDeps = useCallback(async () => {
    const session = getScopedAdminSession();
    if (!session) return;
    setDepsLoading(true);
    setError("");
    try {
      const [supList, invList] = await Promise.all([
        listSuppliers(session.accessToken),
        listInventoryItems(session.accessToken),
      ]);
      setSuppliers(supList);
      setInventoryItems(invList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load suppliers or inventory.");
    } finally {
      setDepsLoading(false);
    }
  }, [getScopedAdminSession]);

  useEffect(() => {
    const session = getScopedAdminSession();
    if (!session) return;
    setSessionReady(true);
  }, [getScopedAdminSession]);

  useEffect(() => {
    if (!sessionReady) return;
    if (section === "summary" || section === "settlement" || section === "invoice") {
      void loadInvoiceDeps();
    }
  }, [sessionReady, section, loadInvoiceDeps]);

  useEffect(() => {
    if (!sessionReady) return;
    if (section === "summary" || section === "settlement") {
      void loadPurchases();
    }
  }, [sessionReady, section, loadPurchases]);

  const supplierNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of suppliers) {
      m[s.id] = s.name;
    }
    return m;
  }, [suppliers]);

  const purchasePaged = useClientPagedSlice(purchases, purchasePage, purchasePageSize);

  useEffect(() => {
    if (purchasePaged.safePage !== purchasePage) setPurchasePage(purchasePaged.safePage);
  }, [purchasePaged.safePage, purchasePage]);

  const lineTotals = useMemo(() => {
    return lines.map((line) => {
      const q = Number.isFinite(line.quantity) ? line.quantity : 0;
      const p = Number.isFinite(line.purchasePrice) ? line.purchasePrice : 0;
      return q * p;
    });
  }, [lines]);

  const subTotalComputed = useMemo(
    () => lineTotals.reduce((acc, t) => acc + t, 0),
    [lineTotals]
  );

  const handleInventoryNameChange = (lineKey: string, itemName: string) => {
    const normalized = itemName.trim().toLowerCase();
    const item = inventoryItems.find((i) => i.name.trim().toLowerCase() === normalized);
    setLines((prev) =>
      prev.map((row) =>
        row.key === lineKey
          ? {
              ...row,
              inventoryItemId: item?.id ?? "",
              itemName,
              itemUnit: item?.unit?.trim() || detectUnitFromName(itemName),
            }
          : row
      )
    );
  };

  const updateLine = (lineKey: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((row) => (row.key === lineKey ? { ...row, ...patch } : row)));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (lineKey: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== lineKey)));
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const session = getScopedAdminSession();
    if (!session) return;

    if (!supplierId.trim()) {
      toast.error("Select a supplier.");
      return;
    }

    const hasUnresolvedItemName = lines.some(
      (line) => line.itemName.trim() && !line.inventoryItemId.trim()
    );
    if (hasUnresolvedItemName) {
      toast.error("Select a valid inventory item name from suggestions.");
      return;
    }

    const validLines = lines.filter((l) => l.inventoryItemId.trim() && l.itemName.trim());
    if (validLines.length === 0) {
      toast.error("Add at least one line with an inventory item.");
      return;
    }

    for (const row of validLines) {
      if (row.quantity <= 0) {
        toast.error("Each line needs a quantity greater than zero.");
        return;
      }
    }

    const payloadItems = validLines.map((row) => {
      const q = row.quantity;
      const p = row.purchasePrice;
      const total = q * p;
      return {
        inventoryItemId: row.inventoryItemId.trim(),
        itemName: row.itemName.trim(),
        quantity: q,
        description: row.description.trim(),
        purchasePrice: p,
        sellingPrice: row.sellingPrice,
        total,
      };
    });

    const subTotal = payloadItems.reduce((a, it) => a + it.total, 0);

    setSubmittingPurchase(true);
    try {
      await createPurchase(session.accessToken, {
        supplierId: supplierId.trim(),
        receiveDate,
        notes: notes.trim(),
        refNo: refNo.trim(),
        paymentMethod,
        subTotal,
        items: payloadItems,
      });
      toast.success("Purchase created.");
      setNotes("");
      setRefNo("");
      setLines([emptyLine()]);
      setReceiveDate(todayYmd());
      if (section === "invoice") void loadPurchases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create purchase.");
    } finally {
      setSubmittingPurchase(false);
    }
  };

  const handleSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const session = getScopedAdminSession();
    if (!session) return;

    if (!settlementPurchaseId.trim()) {
      toast.error("Select a purchase.");
      return;
    }

    const amount = Number(settlementAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid settlement amount.");
      return;
    }

    setSubmittingSettlement(true);
    try {
      await settlePurchaseCredit(session.accessToken, settlementPurchaseId.trim(), {
        amount,
        method: settlementMethod.trim() || "CASH",
        note: settlementNote.trim(),
      });
      toast.success("Settlement recorded.");
      setSettlementAmount("");
      setSettlementNote("");
      void loadPurchases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to settle credit.");
    } finally {
      setSubmittingSettlement(false);
    }
  };

  const creditCandidates = useMemo(() => {
    return purchases.filter((p) => {
      const method = String(getField(p, ["paymentMethod", "payment_method"])).toUpperCase();
      const status = String(getField(p, ["paymentStatus", "payment_status"])).toUpperCase();
      return method === "CREDIT" || status.includes("CREDIT") || status === "PENDING" || status === "PARTIAL";
    });
  }, [purchases]);

  const settlementOptions = creditCandidates.length > 0 ? creditCandidates : purchases;
  const settlementMethods = PAYMENT_METHODS.filter((m) => m !== "CREDIT");

  if (!sessionReady) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <h1 className="min-w-0 shrink-0 text-2xl font-semibold text-gray-800 dark:text-white/90">
          {titles[section]}
        </h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-4 lg:min-w-0 lg:flex-1">
          {section === "settlement" ? (
            <Button
              type="submit"
              form="purchases-settlement-form"
              size="sm"
              className="shrink-0"
              disabled={submittingSettlement || purchases.length === 0}
            >
              {submittingSettlement ? "Saving..." : "Record settlement"}
            </Button>
          ) : null}
        </div>
      </div>

      {section === "summary" ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-900/60">
                <TableRow className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <TableCell isHeader className="px-4 py-3">
                    Date
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3">
                    Ref
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3">
                    Supplier
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3">
                    Payment
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3">
                    Status
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-right">
                    Subtotal
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {purchasesLoading ? (
                  <TableRow>
                    <td colSpan={6} className="px-4 py-8 text-sm text-gray-500">
                      Loading purchases...
                    </td>
                  </TableRow>
                ) : purchases.length === 0 ? (
                  <TableRow>
                    <td colSpan={6} className="px-4 py-8 text-sm text-gray-500">
                      No purchases yet.
                    </td>
                  </TableRow>
                ) : (
                  purchasePaged.slice.map((row) => {
                    const r = row as Record<string, unknown>;
                    return (
                      <TableRow key={row.id} className="bg-white dark:bg-transparent">
                        <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">
                          {formatDateTimeForDisplay(
                            getField(r, ["receiveDate", "receive_date", "createdAt", "created_at"])
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {getField(r, ["refNo", "ref_no", "reference"])}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {resolveSupplierDisplay(r, supplierNameById)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {getField(r, ["paymentMethod", "payment_method"])}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {humanizeCodeLabel(getField(r, ["paymentStatus", "payment_status"]))}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right text-sm text-gray-800 dark:text-gray-100">
                          {formatMoney(r.subTotal ?? r.sub_total ?? r.total)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {!purchasesLoading && purchases.length > 0 ? (
              <ClientTablePagination
                page={purchasePaged.safePage}
                totalPages={purchasePaged.totalPages}
                totalItems={purchasePaged.total}
                pageSize={purchasePageSize}
                rangeFrom={purchasePaged.rangeFrom}
                rangeTo={purchasePaged.rangeTo}
                onPageChange={setPurchasePage}
                onPageSizeChange={(size) => {
                  setPurchasePageSize(size);
                  setPurchasePage(1);
                }}
                disabled={purchasesLoading}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {section === "invoice" ? (
        <form id="purchases-invoice-form" className="space-y-8" onSubmit={handleCreatePurchase}>
          {depsLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading suppliers and inventory...</p>
          ) : (
            <>
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-800 dark:bg-gray-900/20">
                <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">Purchase details</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className={invoiceFieldWrap}>
                    <Label htmlFor="purchase-supplier">Supplier</Label>
                    <select
                      id="purchase-supplier"
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className={invoiceSelectClass}
                      required
                    >
                      <option value="">Select supplier</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={invoiceFieldWrap}>
                    <Label>Receive date</Label>
                    <FlatpickrDateInput
                      label="Receive date"
                      hideLabel
                      value={receiveDate}
                      onChange={setReceiveDate}
                    />
                  </div>
                  <div className={invoiceFieldWrap}>
                    <Label htmlFor="purchase-ref">Reference no.</Label>
                    <Input
                      id="purchase-ref"
                      type="text"
                      value={refNo}
                      onChange={(e) => setRefNo(e.target.value)}
                      placeholder="INV-001"
                    />
                  </div>
                  <div className={invoiceFieldWrap}>
                    <Label htmlFor="purchase-pay">Payment method</Label>
                    <select
                      id="purchase-pay"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className={invoiceSelectClass}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={`${invoiceFieldWrap} sm:col-span-2 xl:col-span-4`}>
                    <Label htmlFor="purchase-notes">Notes</Label>
                    <Input
                      id="purchase-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Line items</h2>
                  <Button type="button" size="sm" variant="outline" onClick={addLine}>
                    Add line
                  </Button>
                </div>
                <div className="space-y-4">
                  {lines.map((line, index) => (
                    <div
                      key={line.key}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/3"
                    >
                      <div className="mb-4 flex items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                        <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                          Line {index + 1}
                        </span>
                        {lines.length > 1 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeLine(line.key)}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>

                      <div className={invoiceFieldWrap}>
                        <Label htmlFor={`inv-${line.key}`}>Inventory item</Label>
                        <Input
                          id={`inv-${line.key}`}
                          type="text"
                          list={`inv-options-${line.key}`}
                          value={line.itemName}
                          onChange={(e) => handleInventoryNameChange(line.key, e.target.value)}
                          placeholder="Type inventory name"
                        />
                        <datalist id={`inv-options-${line.key}`}>
                          {inventoryItems.map((it) => (
                            <option key={it.id} value={it.name} />
                          ))}
                        </datalist>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
                        <div className={invoiceFieldWrap}>
                          <Label htmlFor={`type-${line.key}`}>Type (Auto)</Label>
                          <Input
                            id={`type-${line.key}`}
                            type="text"
                            value={line.itemUnit}
                            readOnly
                          />
                        </div>
                        <div className={invoiceFieldWrap}>
                          <Label htmlFor={`qty-${line.key}`}>Quantity</Label>
                          <Input
                            id={`qty-${line.key}`}
                            type="number"
                            min="0"
                            step={0.01}
                            value={line.quantity === 0 ? "" : String(line.quantity)}
                            onChange={(e) =>
                              updateLine(line.key, { quantity: Number(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div className={invoiceFieldWrap}>
                          <Label htmlFor={`pp-${line.key}`}>Purchase price</Label>
                          <Input
                            id={`pp-${line.key}`}
                            type="number"
                            min="0"
                            step={0.01}
                            value={line.purchasePrice === 0 ? "" : String(line.purchasePrice)}
                            onChange={(e) =>
                              updateLine(line.key, { purchasePrice: Number(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div className={invoiceFieldWrap}>
                          <Label htmlFor={`sp-${line.key}`}>Selling price</Label>
                          <Input
                            id={`sp-${line.key}`}
                            type="number"
                            min="0"
                            step={0.01}
                            value={line.sellingPrice === 0 ? "" : String(line.sellingPrice)}
                            onChange={(e) =>
                              updateLine(line.key, { sellingPrice: Number(e.target.value) || 0 })
                            }
                          />
                        </div>
                        <div className="flex flex-col justify-end gap-1 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/60">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Line total</span>
                          <span className="text-base font-semibold tabular-nums text-gray-900 dark:text-white/90">
                            {lineTotals[index]?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "0"}
                          </span>
                        </div>
                      </div>

                      <div className={`${invoiceFieldWrap} mt-3`}>
                        <Label htmlFor={`desc-${line.key}`}>Description</Label>
                        <Input
                          id={`desc-${line.key}`}
                          type="text"
                          value={line.description}
                          onChange={(e) => updateLine(line.key, { description: e.target.value })}
                          placeholder="Batch / lot / notes"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-800 dark:bg-gray-900/20">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Subtotal
                    </p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-white/90">
                      {subTotalComputed.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Button type="submit" size="sm" disabled={submittingPurchase || depsLoading}>
                    {submittingPurchase ? "Saving..." : "Create purchase"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </form>
      ) : null}

      {section === "settlement" ? (
        <form id="purchases-settlement-form" className="space-y-6" onSubmit={handleSettlement}>
          {purchasesLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading purchases...</p>
          ) : (
            <>
              {creditCandidates.length === 0 && purchases.length > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                  No purchases flagged as credit in the list; you can still select any purchase below if the
                  backend allows settlement.
                </div>
              ) : null}

              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-800 dark:bg-gray-900/20">
                <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">Settlement details</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className={`${invoiceFieldWrap} sm:col-span-2`}>
                    <Label htmlFor="settle-purchase">Purchase</Label>
                    <select
                      id="settle-purchase"
                      value={settlementPurchaseId}
                      onChange={(e) => setSettlementPurchaseId(e.target.value)}
                      className={invoiceSelectClass}
                      required
                    >
                      <option value="">Select purchase</option>
                      {settlementOptions.map((p) => {
                        const r = p as Record<string, unknown>;
                        const label = `${getField(r, ["refNo", "ref_no"])} · ${formatDateTimeForDisplay(
                          getField(r, ["receiveDate", "receive_date", "createdAt", "created_at"])
                        )} · ${resolveSupplierDisplay(r, supplierNameById)}`;
                        return (
                          <option key={p.id} value={p.id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className={invoiceFieldWrap}>
                    <Label htmlFor="settle-amount">Amount</Label>
                    <Input
                      id="settle-amount"
                      type="number"
                      min="0"
                      step={0.01}
                      value={settlementAmount}
                      onChange={(e) => setSettlementAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className={invoiceFieldWrap}>
                    <Label htmlFor="settle-method">Method</Label>
                    <select
                      id="settle-method"
                      value={settlementMethod}
                      onChange={(e) => setSettlementMethod(e.target.value)}
                      className={invoiceSelectClass}
                    >
                      {settlementMethods.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={`${invoiceFieldWrap} sm:col-span-2`}>
                    <Label htmlFor="settle-note">Note</Label>
                    <Input
                      id="settle-note"
                      type="text"
                      value={settlementNote}
                      onChange={(e) => setSettlementNote(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </form>
      ) : null}
    </section>
  );
}
