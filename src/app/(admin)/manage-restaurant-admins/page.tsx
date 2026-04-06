import SuperadminDashboardClient from "@/components/superadmin/SuperadminDashboardClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Restaurant Admins",
  description: "Manage restaurant admins dashboard view",
};

export default function ManageRestaurantAdminsPage() {
  return <SuperadminDashboardClient defaultActiveTab="admins" showTabSwitcher={false} pageType="owners" />;
}
