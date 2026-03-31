/* import type { Metadata } from "next";
import { redirect } from "next/navigation"; */
"use client";
import {
  clearAuthSession,
  getAuthSession,
  ROLE_DASHBOARD_ROUTE,
} from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/* export const metadata: Metadata = {
  title:
    "Next.js E-commerce Dashboard | SnapServe - Next.js Dashboard Template",
  description: "This is Next.js Home for SnapServe Dashboard Template",
}; */

export default function Ecommerce() {
  const router = useRouter();

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      router.replace("/signin");
      return;
    }

    const role = session.user?.role;
    if (!role || !ROLE_DASHBOARD_ROUTE[role]) {
      clearAuthSession();
      router.replace("/signin");
      return;
    }

    router.replace(ROLE_DASHBOARD_ROUTE[role]);
  }, [router]);

  return null;
  // redirect("/signin");
}
