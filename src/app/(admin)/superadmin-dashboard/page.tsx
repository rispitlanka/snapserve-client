import type { Metadata } from "next";
import SuperadminDashboardClient from "@/components/superadmin/SuperadminDashboardClient";

export const metadata: Metadata = {
  title: "Superadmin Dashboard",
  description: "Role-based mock dashboard for superadmin",
};

export default function SuperadminDashboardPage() {
  return <SuperadminDashboardClient />;
}
