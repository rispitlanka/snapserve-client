"use client";

import { MOCK_AUTH_STORAGE_KEY, UserRole } from "@/lib/mockAuth";
import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  useEffect(() => {
    const authUser = localStorage.getItem(MOCK_AUTH_STORAGE_KEY);
    if (!authUser) {
      router.replace("/signin");
      return;
    }

    try {
      const parsedUser = JSON.parse(authUser) as { role?: UserRole };
      const allowedRoles: UserRole[] = ["superadmin", "admin", "cashier"];
      if (!parsedUser.role || !allowedRoles.includes(parsedUser.role)) {
        localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
        router.replace("/signin");
      }
    } catch {
      localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
      router.replace("/signin");
    }
  }, [pathname, router]);

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        <AppHeader />
        {/* Page Content */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </div>
    </div>
  );
}
