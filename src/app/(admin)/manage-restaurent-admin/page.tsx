import SuperadminDashboardClient from "@/components/superadmin/SuperadminDashboardClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Restaurent Admin",
  description: "Manage restaurent admin dashboard view",
};

export default function ManageRestaurentAdminPage() {
  return <SuperadminDashboardClient defaultActiveTab="admins" showTabSwitcher={false} />;
}
