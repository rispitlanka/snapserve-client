"use client";

import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import { ThemeProvider } from "@/context/ThemeContext";
import Image from "next/image";
import { usePathname } from "next/navigation";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSignInPage = pathname === "/signin";

  return (
    <div className="relative z-1 bg-white dark:bg-gray-900">
      <ThemeProvider>
        <div className="relative min-h-screen w-full">
          {isSignInPage ? (
            <>
              <div className="relative flex min-h-screen w-full flex-col overflow-hidden lg:flex-row">
                <Image
                  src="/images/restaurant-interior.jpg"
                  alt="Restaurant background"
                  fill
                  priority
                  className="object-cover object-center"
                />

                <div className="relative min-h-[38vh] w-full lg:min-h-screen lg:w-1/2">
                  <div className="absolute inset-0 bg-transparent" />
                </div>

                <div className="relative flex w-full items-center justify-center px-4 py-10 sm:px-6 lg:w-1/2 lg:px-10 xl:px-16">
                  <div className="absolute inset-0 bg-slate-100/35 backdrop-blur-md dark:bg-slate-900/45" />
                  <div className="relative z-10 flex w-full justify-center">
                    {children}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="relative flex min-h-screen w-full flex-col justify-center p-6 dark:bg-gray-900 sm:p-0">
              {children}
            </div>
          )}
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
