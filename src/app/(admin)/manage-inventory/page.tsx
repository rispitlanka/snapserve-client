import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Manage Inventory",
  description: "Inventory management",
};

export default function ManageInventoryPage() {
  redirect("/manage-inventory/items");
}
