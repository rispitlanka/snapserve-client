import RestaurantAdminManagementClient from "@/components/admin/RestaurantAdminManagementClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Staff",
  description: "Manage cashier and waiter staff for your restaurant",
};

export default function ManageStaffPage() {
  return <RestaurantAdminManagementClient defaultActiveTab="staff" showTabSwitcher={false} />;
}
