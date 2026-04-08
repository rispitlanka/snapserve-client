import ManageCustomersClient from "@/components/cashier/ManageCustomersClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Customers",
  description: "Create and view customers for cashier operations",
};

export default function ManageCustomersPage() {
  return <ManageCustomersClient />;
}
