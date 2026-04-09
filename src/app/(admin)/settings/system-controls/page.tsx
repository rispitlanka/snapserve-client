import SystemControlsClient from "@/components/admin/SystemControlsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Controls",
  description: "Manage system-level settings",
};

export default function SystemControlsPage() {
  return <SystemControlsClient />;
}
