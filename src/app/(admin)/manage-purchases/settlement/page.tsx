import PurchasesClient from "@/components/admin/PurchasesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Purchases — Settlement",
  description: "Restaurant purchase credit settlement",
};

export default function PurchasesSettlementPage() {
  return <PurchasesClient section="settlement" />;
}
