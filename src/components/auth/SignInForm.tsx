"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import {
  getAuthSession,
  login,
  parseAuthSession,
  ROLE_DASHBOARD_ROUTE,
  saveAuthSession,
  UserRole,
} from "@/lib/auth";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [restaurantId, setRestaurantId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const session = getAuthSession();
    const role = session?.user?.role as UserRole | undefined;
    if (role && ROLE_DASHBOARD_ROUTE[role]) {
      router.replace(ROLE_DASHBOARD_ROUTE[role]);
    }
  }, [router]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // Validate required fields based on login type
      if (!isSuperadmin) {
        if (!restaurantId.trim()) {
          setError("Business ID is required.");
          setIsSubmitting(false);
          return;
        }
        if (!name.trim()) {
          setError("Username is required.");
          setIsSubmitting(false);
          return;
        }
      }

      if (!password) {
        setError("Password is required.");
        setIsSubmitting(false);
        return;
      }

      const response = await login({
        restaurantId: isSuperadmin ? undefined : restaurantId.trim(),
        name: isSuperadmin ? undefined : name.trim(),
        password,
      });

      const session = parseAuthSession(response);
      saveAuthSession(session);

      // Redirect based on user role to their respective dashboard
      const redirectTo = ROLE_DASHBOARD_ROUTE[session.user.role];
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isSuperadmin
                ? "Enter your password to sign in."
                : "Enter your Business Id, Username, and Password to sign in!"}
            </p>
          </div>
          <div>
            <form onSubmit={handleSignIn}>
              <div className="space-y-6">
                {/* Business ID and Username fields - hidden for superadmin */}
                {!isSuperadmin && (
                  <>
                    <div>
                      <Label>
                        Business Id <span className="text-error-500">*</span>
                      </Label>
                      <Input
                        placeholder="Enter your business id"
                        type="text"
                        value={restaurantId}
                        onChange={(e) => setRestaurantId(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Label>
                        Username <span className="text-error-500">*</span>
                      </Label>
                      <Input
                        placeholder="Enter your username"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </>
                )}

                {/* Superadmin toggle */}
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSuperadmin}
                      onChange={(e) => setIsSuperadmin(e.target.checked)}
                      disabled={isSubmitting}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Admin only: Sign in without Business ID and Username
                    </span>
                  </label>
                </div>

                <div>
                  <Label>
                    Password <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                      Keep me logged in
                    </span>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-lg bg-error-50 p-3 dark:bg-error-500/10">
                    <p className="text-sm text-error-500 dark:text-error-400">{error}</p>
                  </div>
                ) : null}

                <Button className="w-full" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
