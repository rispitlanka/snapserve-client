import InventoryManagementClient from "@/components/admin/InventoryManagementClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory Items",
  description: "Manage inventory items",
};

export default function ManageInventoryItemsPage() {
  return <InventoryManagementClient section="items" />;
}
