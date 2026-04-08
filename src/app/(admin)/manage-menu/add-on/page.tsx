import MenuAddonsClient from "@/components/admin/MenuAddonsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Menu Add On",
  description: "Create and manage menu add-ons",
};

export default function ManageMenuAddOnPage() {
  return <MenuAddonsClient />;
}
