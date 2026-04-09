import MenuListClient from "@/components/admin/MenuListClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Menu List",
  description: "Manage menu items, add-ons, and ingredients",
};

export default function ManageMenuListPage() {
  return <MenuListClient />;
}
