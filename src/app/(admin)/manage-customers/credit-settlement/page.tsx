import CustomerCreditSettlementClient from "@/components/cashier/CustomerCreditSettlementClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Credit Settlement",
  description: "View customer credit invoices with outstanding balances",
};

export default function ManageCustomerCreditSettlementPage() {
  return <CustomerCreditSettlementClient />;
}
