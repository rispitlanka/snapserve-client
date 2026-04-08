import AddInventoryItemClient from "@/components/admin/AddInventoryItemClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Inventory Item",
  description: "Create a new inventory item",
};

export default function AddInventoryItemPage() {
  return <AddInventoryItemClient />;
}
