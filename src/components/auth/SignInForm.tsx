"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EnvelopeIcon, EyeCloseIcon, EyeIcon, LockIcon, UserIcon } from "@/icons";
import {
  getAuthSession,
  login,
  parseAuthSession,
  ROLE_DASHBOARD_ROUTE,
  saveAuthSession,
  UserRole,
} from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MdPointOfSale } from "react-icons/md";

export default function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
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
      const hasRestaurantOrName = Boolean(restaurantId.trim() || name.trim());
      const hasBothRestaurantAndName = Boolean(restaurantId.trim() && name.trim());

      // Superadmin flow: allow password-only login.
      // Restaurant-scoped flow: if one identity field is entered, require both.
      if (hasRestaurantOrName && !hasBothRestaurantAndName) {
        setError("Enter both Business ID and Username, or leave both empty.");
        setIsSubmitting(false);
        return;
      }

      if (!password) {
        setError("Password is required.");
        setIsSubmitting(false);
        return;
      }

      const response = await login({
        restaurantId: hasBothRestaurantAndName ? restaurantId.trim() : undefined,
        name: hasBothRestaurantAndName ? name.trim() : undefined,
        password,
      });

      const session = parseAuthSession(response);
      saveAuthSession(session);
      toast.success("Signed in successfully.");

      // Redirect based on user role to their respective dashboard
      const redirectTo = ROLE_DASHBOARD_ROUTE[session.user.role];
      router.push(redirectTo);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative z-10 w-full max-w-[460px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="mb-6 text-center sm:mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm dark:bg-amber-300/20 dark:text-amber-200">
            <MdPointOfSale className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Restaurent POS
          </h1>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Sign in to continue.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Superadmin can sign in using password only.
          </p>
        </div>

        <form onSubmit={handleSignIn}>
          <div className="space-y-5">
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Business ID</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                  <UserIcon className="h-5 w-5 fill-current" />
                </span>
                <Input
                  placeholder="Enter your business id"
                  type="text"
                  value={restaurantId}
                  onChange={(e) => setRestaurantId(e.target.value)}
                  disabled={isSubmitting}
                  className="h-12 rounded-xl border-slate-300 bg-white/80 pl-11 dark:border-slate-700 dark:bg-slate-900/60"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-700 dark:text-slate-300">Email / Username</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                  <EnvelopeIcon className="h-5 w-5 fill-current" />
                </span>
                <Input
                  placeholder="Enter your email or username"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  className="h-12 rounded-xl border-slate-300 bg-white/80 pl-11 dark:border-slate-700 dark:bg-slate-900/60"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-700 dark:text-slate-300">
                Password <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                  <LockIcon className="h-5 w-5 fill-current" />
                </span>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="h-12 rounded-xl border-slate-300 bg-white/80 pl-11 pr-11 dark:border-slate-700 dark:bg-slate-900/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 z-30 -translate-y-1/2 text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeIcon className="h-5 w-5 fill-current" />
                  ) : (
                    <EyeCloseIcon className="h-5 w-5 fill-current" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox checked={isChecked} onChange={setIsChecked} />
                <span className="block text-sm font-normal text-slate-700 dark:text-slate-300">
                  Keep me logged in
                </span>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-error-200 bg-error-50 p-3 dark:border-error-500/20 dark:bg-error-500/10">
                <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
              </div>
            ) : null}

            <Button
              className="h-12 w-full rounded-xl bg-slate-900 text-base font-semibold text-white hover:bg-slate-800 dark:bg-brand-500 dark:hover:bg-brand-600"
              size="sm"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
          Need help?{" "}
          <Link
            href="mailto:support@snapserve.com"
            className="font-medium text-brand-600 underline decoration-brand-500/70 underline-offset-2 transition hover:text-brand-500 dark:text-brand-400"
          >
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}
