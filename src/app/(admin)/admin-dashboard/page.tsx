import RestaurantAdminSummaryCards from "@/components/admin/RestaurantAdminSummaryCards";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Role-based mock dashboard for admin",
};

export default function AdminDashboardPage() {
  return <RestaurantAdminSummaryCards />;
}
