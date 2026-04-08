import InventoryManagementClient from "@/components/admin/InventoryManagementClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory Brands",
  description: "Manage inventory brands",
};

export default function ManageInventoryBrandsPage() {
  return <InventoryManagementClient section="brands" />;
}
