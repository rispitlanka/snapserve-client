import React from "react";

type MetricCardProps = {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  accentClassName: string;
  isLoading?: boolean;
};

export default function MetricCard({
  title,
  value,
  description,
  icon,
  accentClassName,
  isLoading = false,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3 md:p-6">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accentClassName}`}>
        {icon}
      </div>

      <div className="mt-5">
        <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
        <div className="mt-2 min-h-10">
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
          ) : (
            <h4 className="font-bold text-gray-800 text-title-sm dark:text-white/90">
              {value}
            </h4>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}
