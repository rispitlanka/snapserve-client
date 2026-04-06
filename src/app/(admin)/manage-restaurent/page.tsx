import SuperadminDashboardClient from "@/components/superadmin/SuperadminDashboardClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Restaurants",
  description: "Manage restaurants dashboard view",
};

export default function ManageRestaurentPage() {
  return <SuperadminDashboardClient defaultActiveTab="restaurants" showTabSwitcher={false} />;
}
