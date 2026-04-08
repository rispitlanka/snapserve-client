import CustomerChequesClient from "@/components/cashier/CustomerChequesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Cheques",
  description: "View customer cheque records",
};

export default function ManageCustomerChequesPage() {
  return <CustomerChequesClient />;
}
