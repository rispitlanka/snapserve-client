import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Settings",
  description: "Application settings",
};

export default function SettingsPage() {
  redirect("/settings/system-controls");
}
