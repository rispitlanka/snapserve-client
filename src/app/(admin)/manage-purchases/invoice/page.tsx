import PurchasesClient from "@/components/admin/PurchasesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Purchases — Invoice",
  description: "Restaurant purchase invoices",
};

export default function PurchasesInvoicePage() {
  return <PurchasesClient section="invoice" />;
}
