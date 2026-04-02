import RestaurantAdminManagementClient from "@/components/admin/RestaurantAdminManagementClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Suppliers",
  description: "Manage suppliers for your restaurant",
};

export default function ManageSuppliersPage() {
  return <RestaurantAdminManagementClient defaultActiveTab="suppliers" showTabSwitcher={false} />;
}
