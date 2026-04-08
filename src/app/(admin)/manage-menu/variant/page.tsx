import MenuVariantsClient from "@/components/admin/MenuVariantsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Menu Variant",
  description: "Create and manage menu variants",
};

export default function ManageMenuVariantPage() {
  return <MenuVariantsClient />;
}
