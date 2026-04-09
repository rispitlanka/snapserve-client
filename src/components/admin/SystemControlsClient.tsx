"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import {
    getAuthSession,
    getLoyaltySettings,
    ROLE_DASHBOARD_ROUTE,
    updateLoyaltySettings,
} from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const DECIMAL_INPUT_RE = /^\d*\.?\d{0,2}$/;

export default function SystemControlsClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [margin, setMargin] = useState("0");
  const [percentage, setPercentage] = useState("0");

  useEffect(() => {
    const init = async () => {
      const session = getAuthSession();
      if (!session) {
        router.replace("/signin");
        return;
      }
      if (session.user.role !== "admin") {
        router.replace(ROLE_DASHBOARD_ROUTE[session.user.role]);
        return;
      }

      setReady(true);
      setLoading(true);
      try {
        const settings = await getLoyaltySettings(session.accessToken);
        setEnabled(settings.enabled);
        setMargin(String(settings.margin));
        setPercentage(String(settings.percentage));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load loyalty settings.");
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [router]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const marginNum = Number(margin);
    const percentageNum = Number(percentage);

    if (!Number.isFinite(marginNum) || marginNum < 0) {
      toast.error("Enter a valid loyalty margin.");
      return;
    }
    if (!Number.isFinite(percentageNum) || percentageNum < 0) {
      toast.error("Enter a valid loyalty percentage.");
      return;
    }

    const session = getAuthSession();
    if (!session) {
      toast.error("Session not found.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateLoyaltySettings(session.accessToken, {
        enabled,
        margin: marginNum,
        percentage: percentageNum,
      });
      setEnabled(updated.enabled);
      setMargin(String(updated.margin));
      setPercentage(String(updated.percentage));
      toast.success("Loyalty settings updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update loyalty settings.");
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">System Controls</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Manage loyalty settings for your restaurant.
      </p>

      <form className="mt-6 space-y-5" onSubmit={onSave}>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-3 py-3 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-800 dark:text-white/90">Enable Loyalty</span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-150 focus:outline-hidden focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
              enabled ? "bg-brand-500" : "bg-gray-200 dark:bg-white/15"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition duration-150 ${
                enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <div>
          <Label>Loyalty Margin</Label>
          <Input
            type="text"
            inputMode="decimal"
            pattern="^\\d*\\.?\\d{0,2}$"
            value={margin}
            onChange={(e) => {
              const next = e.target.value;
              if (next === "" || DECIMAL_INPUT_RE.test(next)) setMargin(next);
            }}
            placeholder="0.00"
            disabled={loading || saving}
          />
        </div>

        <div>
          <Label>Loyalty Percentage</Label>
          <Input
            type="text"
            inputMode="decimal"
            pattern="^\\d*\\.?\\d{0,2}$"
            value={percentage}
            onChange={(e) => {
              const next = e.target.value;
              if (next === "" || DECIMAL_INPUT_RE.test(next)) setPercentage(next);
            }}
            placeholder="0.00"
            disabled={loading || saving}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={loading || saving}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
