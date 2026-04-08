import InventoryManagementClient from "@/components/admin/InventoryManagementClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory Categories",
  description: "Manage inventory categories",
};

export default function ManageInventoryCategoriesPage() {
  return <InventoryManagementClient section="categories" />;
}
