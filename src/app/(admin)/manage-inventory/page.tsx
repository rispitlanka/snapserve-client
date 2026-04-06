import InventoryManagementClient from "@/components/admin/InventoryManagementClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Inventory Overview",
  description: "Inventory overview cards for categories, sub-categories, brands, and items",
};

export default function ManageInventoryPage() {
  return <InventoryManagementClient section="overview" />;
}
