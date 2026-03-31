/* import type { Metadata } from "next";
import { redirect } from "next/navigation"; */
"use client";
import { MOCK_AUTH_STORAGE_KEY, ROLE_DASHBOARD_ROUTE, UserRole } from "@/lib/mockAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/* export const metadata: Metadata = {
  title:
    "Next.js E-commerce Dashboard | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js Home for TailAdmin Dashboard Template",
}; */

export default function Ecommerce() {
  const router = useRouter();

  useEffect(() => {
    const authUser = localStorage.getItem(MOCK_AUTH_STORAGE_KEY);
    if (!authUser) {
      router.replace("/signin");
      return;
    }

    try {
      const parsedUser = JSON.parse(authUser) as { role?: UserRole };
      if (!parsedUser.role || !ROLE_DASHBOARD_ROUTE[parsedUser.role]) {
        localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
        router.replace("/signin");
        return;
      }
      router.replace(ROLE_DASHBOARD_ROUTE[parsedUser.role]);
    } catch {
      localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
      router.replace("/signin");
    }
  }, [router]);

  return null;
  // redirect("/signin");
}
