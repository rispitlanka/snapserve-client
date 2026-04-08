import InventoryManagementClient from "@/components/admin/InventoryManagementClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory Sub-categories",
  description: "Manage inventory sub-categories",
};

export default function ManageInventorySubCategoriesPage() {
  return <InventoryManagementClient section="subCategories" />;
}
