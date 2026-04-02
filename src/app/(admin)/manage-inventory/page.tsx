import InventoryManagementClient from "@/components/admin/InventoryManagementClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Inventory",
  description: "Manage categories, brands, and inventory items",
};

export default function ManageInventoryPage() {
  return <InventoryManagementClient />;
}
