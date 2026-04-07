"use client";

import { CalenderIcon } from "@/icons";
import flatpickr from "flatpickr";
import { useEffect, useId, useRef } from "react";

type FlatpickrDateInputProps = {
  label: string;
  /** When true, no label is rendered (use an external `<Label>` for alignment). */
  hideLabel?: boolean;
  value: string;
  onChange: (dateStr: string) => void;
  minDate?: string;
  maxDate?: string;
  className?: string;
};

/**
 * Single-date picker with visible calendar (Flatpickr). Value is `YYYY-MM-DD`.
 */
export default function FlatpickrDateInput({
  label,
  hideLabel = false,
  value,
  onChange,
  minDate,
  maxDate,
  className = "",
}: FlatpickrDateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);
  const onChangeRef = useRef(onChange);
  const reactId = useId();
  const inputId = `fp-date-${reactId.replace(/:/g, "")}`;

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const fp = flatpickr(el, {
      dateFormat: "Y-m-d",
      defaultDate: value || undefined,
      static: true,
      monthSelectorType: "static",
      clickOpens: true,
      allowInput: false,
      minDate: minDate || undefined,
      maxDate: maxDate || undefined,
      onChange: (_dates, dateStr) => {
        if (dateStr) onChangeRef.current(dateStr);
      },
    });

    const instance = Array.isArray(fp) ? fp[0] : fp;
    fpRef.current = instance;

    return () => {
      instance.destroy();
      fpRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; value/min/max synced in other effects
  }, []);

  useEffect(() => {
    const fp = fpRef.current;
    if (!fp || !value) return;
    const current = fp.selectedDates[0];
    const next = new Date(`${value}T12:00:00`);
    if (!current || formatYmd(current) !== value) {
      fp.setDate(next, false);
    }
  }, [value]);

  useEffect(() => {
    const fp = fpRef.current;
    if (!fp) return;
    fp.set("minDate", minDate ?? null);
  }, [minDate]);

  useEffect(() => {
    const fp = fpRef.current;
    if (!fp) return;
    fp.set("maxDate", maxDate ?? null);
  }, [maxDate]);

  return (
    <div className={className}>
      {!hideLabel ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          readOnly
          placeholder="Select date"
          aria-label={hideLabel ? label : undefined}
          className="h-11 w-full cursor-pointer rounded-lg border border-gray-300 bg-transparent pr-10 pl-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
          <CalenderIcon className="size-5" />
        </span>
      </div>
    </div>
  );
}

function formatYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
