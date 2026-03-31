import type { Metadata } from "next";
import CashierDashboardClient from "@/components/cashier/CashierDashboardClient";

export const metadata: Metadata = {
  title: "Cashier Dashboard",
  description: "Role-based mock dashboard for cashier",
};

export default function CashierDashboardPage() {
  return <CashierDashboardClient />;
}
