import MenuItemAddClient from "@/components/admin/MenuItemAddClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Menu Item",
  description: "Create a new menu item",
};

export default function AddMenuItemPage() {
  return (
    <div className="p-4 md:p-6">
      <MenuItemAddClient />
    </div>
  );
}
