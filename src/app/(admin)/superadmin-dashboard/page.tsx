import SuperadminSummaryCards from "@/components/superadmin/SuperadminSummaryCards";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Superadmin Dashboard",
  description: "Role-based mock dashboard for superadmin",
};

export default function SuperadminDashboardPage() {
  return <SuperadminSummaryCards />;
}
