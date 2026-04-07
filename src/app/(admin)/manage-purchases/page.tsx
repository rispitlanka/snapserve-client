import { redirect } from "next/navigation";

export default function ManagePurchasesIndexPage() {
  redirect("/manage-purchases/summary");
}
