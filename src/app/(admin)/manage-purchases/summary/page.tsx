import PurchasesClient from "@/components/admin/PurchasesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Purchases — Summary",
  description: "Restaurant purchase summary",
};

export default function PurchasesSummaryPage() {
  return <PurchasesClient section="summary" />;
}
