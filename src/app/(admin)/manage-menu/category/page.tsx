import MenuCategoriesClient from "@/components/admin/MenuCategoriesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Category",
  description: "Create and manage menu categories",
};

export default function ManageMenuCategoryPage() {
  return <MenuCategoriesClient />;
}
