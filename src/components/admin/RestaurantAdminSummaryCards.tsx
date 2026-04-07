"use client";

import MetricCard from "@/components/common/MetricCard";
import FlatpickrDateInput from "@/components/form/FlatpickrDateInput";
import { BoxCubeIcon, DollarLineIcon, GroupIcon, UserIcon } from "@/icons";
import { AUTH_API_BASE_URL, getAuthSession, listStaff, listSuppliers, ROLE_DASHBOARD_ROUTE } from "@/lib/auth";
import { listInventoryItems } from "@/lib/inventory";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type RecentOrder = {
  id: string;
  customer: string;
  amount: number;
  status: string;
  timeLabel: string;
};

type AdminSummary = {
  todaySalesLkr: number;
  todayOrders: number;
  weeklySalesLkr: number;
  newCustomersToday: number;
  newCustomersWeekly: number;
  monthlyRevenueSeries: number[];
  monthlyRevenueLabels: string[];
  weeklyTrendSeries: number[];
  weeklyTrendLabels: string[];
  recentOrders: RecentOrder[];
  topSellingItems: Array<{ name: string; qty: number }>;
  totalStaffs: number;
  totalSuppliers: number;
};

type DateRangeFilter = {
  startDate: string;
  endDate: string;
};

const getList = (raw: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>;
  if (!raw || typeof raw !== "object") return [];
  const body = raw as Record<string, unknown>;
  const candidates = [body.data, body.items, body.results, body.orders];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as Array<Record<string, unknown>>;
  }
  return [];
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const getDate = (value: unknown): Date | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const isAfter = (date: Date, compare: Date) => date.getTime() >= compare.getTime();

const parseOrdersFromAny = (raw: unknown): Array<Record<string, unknown>> => getList(raw);

const humanTime = (value: Date) =>
  value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toRangeLabel = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return "Selected Range";
  if (startDate === endDate) return "Selected Day";

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Selected Range";
  }

  return `${start.toLocaleDateString("en-LK", { day: "2-digit", month: "short" })} - ${end.toLocaleDateString("en-LK", { day: "2-digit", month: "short" })}`;
};

const fetchFirstWorkingJson = async (
  token: string,
  paths: string[]
): Promise<unknown | null> => {
  for (const path of paths) {
    try {
      const response = await fetch(`${AUTH_API_BASE_URL}${path}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "omit",
      });
      if (!response.ok) continue;
      return (await response.json()) as unknown;
    } catch {
      // Try next endpoint.
    }
  }
  return null;
};

export default function RestaurantAdminSummaryCards() {
  const router = useRouter();
  const today = new Date();
  const defaultEndDate = toDateInputValue(today);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const defaultStartDate = toDateInputValue(sevenDaysAgo);
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>({
    startDate: defaultStartDate,
    endDate: defaultEndDate,
  });
  const [appliedDateFilter, setAppliedDateFilter] = useState<DateRangeFilter>({
    startDate: defaultStartDate,
    endDate: defaultEndDate,
  });
  const [filterError, setFilterError] = useState("");
  const [summary, setSummary] = useState<AdminSummary>({
    todaySalesLkr: 0,
    todayOrders: 0,
    weeklySalesLkr: 0,
    newCustomersToday: 0,
    newCustomersWeekly: 0,
    monthlyRevenueSeries: [],
    monthlyRevenueLabels: [],
    weeklyTrendSeries: [],
    weeklyTrendLabels: [],
    recentOrders: [],
    topSellingItems: [],
    totalStaffs: 0,
    totalSuppliers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSummary = async () => {
      const session = getAuthSession();
      if (!session) {
        router.replace("/signin");
        return;
      }

      if (session.user.role !== "admin") {
        router.replace(ROLE_DASHBOARD_ROUTE[session.user.role]);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [staff, suppliers, inventoryItems] = await Promise.all([
          listStaff(session.accessToken),
          listSuppliers(session.accessToken),
          listInventoryItems(session.accessToken),
        ]);

        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);
        const rangeStart = new Date(`${appliedDateFilter.startDate}T00:00:00`);
        const rangeEnd = new Date(`${appliedDateFilter.endDate}T23:59:59.999`);

        const orderPayload = await fetchFirstWorkingJson(session.accessToken, [
          "/orders",
          "/orders?limit=500",
          "/reports/orders",
          "/reports/sales",
          "/sales/orders",
        ]);

        const orders = parseOrdersFromAny(orderPayload);
        let rangeOrders = 0;
        let rangeSalesLkr = 0;
        let weeklySalesLkr = 0;
        let rangeCustomers = 0;
        let newCustomersWeekly = 0;
        const topSellingAccumulator = new Map<string, number>();
        const uniqueCustomersInRange = new Set<string>();
        const uniqueCustomersWeekly = new Set<string>();
        const monthlyRevenueLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyRevenueSeries = new Array<number>(12).fill(0);

        // Last 7 days (inclusive): one bar per calendar day, oldest → newest.
        const weeklyTrendMap = new Map<string, number>();
        const weeklyTrendLabels: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(now);
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() - (6 - i));
          const key = toDateInputValue(d);
          weeklyTrendMap.set(key, 0);
          weeklyTrendLabels.push(
            d.toLocaleDateString("en-LK", { weekday: "short", day: "2-digit", month: "short" })
          );
        }
        const recentOrders: Array<{ createdAt: Date; row: RecentOrder }> = [];

        for (const order of orders) {
          const createdAt = getDate(
            order.createdAt ?? order.created_at ?? order.orderDate ?? order.date
          );
          const amount = toNumber(
            order.total ??
              order.totalAmount ??
              order.grandTotal ??
              order.netTotal ??
              order.amount
          );

          const inSelectedRange =
            Boolean(
              createdAt &&
                !Number.isNaN(rangeStart.getTime()) &&
                !Number.isNaN(rangeEnd.getTime()) &&
                createdAt.getTime() >= rangeStart.getTime() &&
                createdAt.getTime() <= rangeEnd.getTime()
            );

          if (inSelectedRange) {
            rangeOrders += 1;
            rangeSalesLkr += amount;
          }
          if (createdAt && isAfter(createdAt, weekStart)) {
            weeklySalesLkr += amount;
          }
          if (
            createdAt &&
            createdAt.getFullYear() === now.getFullYear() &&
            createdAt.getMonth() <= now.getMonth()
          ) {
            const monthIndex = createdAt.getMonth();
            monthlyRevenueSeries[monthIndex] += amount;
          }
          if (createdAt) {
            const dayKey = toDateInputValue(createdAt);
            if (weeklyTrendMap.has(dayKey)) {
              weeklyTrendMap.set(dayKey, (weeklyTrendMap.get(dayKey) ?? 0) + amount);
            }
          }

          const customerName = String(
            order.customerName ??
              order.customer ??
              order.customer_name ??
              order.customerFullName ??
              order.customer_full_name ??
              order.userName ??
              order.name ??
              "Walk-in Customer"
          ).trim();
          const customerIdentity = String(
            order.customerId ??
              order.customer_id ??
              order.userId ??
              order.user_id ??
              customerName
          ).trim();
          if (inSelectedRange && customerIdentity) {
            uniqueCustomersInRange.add(customerIdentity);
          }
          if (createdAt && isAfter(createdAt, weekStart) && customerIdentity) {
            uniqueCustomersWeekly.add(customerIdentity);
          }

          if (createdAt) {
            recentOrders.push({
              createdAt,
              row: {
                id: String(order.id ?? order.orderId ?? order.order_id ?? "N/A"),
                customer: customerName || "Walk-in Customer",
                amount,
                status: String(order.status ?? order.orderStatus ?? "Pending"),
                timeLabel: humanTime(createdAt),
              },
            });
          }

          const lineItems = getList(order.items ?? order.orderItems ?? order.lines);
          for (const line of lineItems) {
            const itemName = String(
              line.name ?? line.itemName ?? line.productName ?? line.title ?? ""
            ).trim();
            const qty = toNumber(line.qty ?? line.quantity ?? line.count ?? line.units);
            if (!itemName || qty <= 0) continue;
            topSellingAccumulator.set(itemName, (topSellingAccumulator.get(itemName) ?? 0) + qty);
          }
        }

        const topSellingItems = [...topSellingAccumulator.entries()]
          .map(([name, qty]) => ({ name, qty }))
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5);

        // Fallback for top items if no order line data yet.
        const fallbackTopItems =
          topSellingItems.length > 0
            ? topSellingItems
            : inventoryItems.slice(0, 5).map((item) => ({ name: item.name, qty: 0 }));
        rangeCustomers = uniqueCustomersInRange.size;
        newCustomersWeekly = uniqueCustomersWeekly.size;
        const weeklyTrendSeries = weeklyTrendLabels.map(
          (_, idx) => {
            const d = new Date(now);
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - (6 - idx));
            return weeklyTrendMap.get(toDateInputValue(d)) ?? 0;
          }
        );
        const recentOrdersRows = recentOrders
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 8)
          .map((entry) => entry.row);

        setSummary({
          todaySalesLkr: rangeSalesLkr,
          todayOrders: rangeOrders,
          weeklySalesLkr,
          newCustomersToday: rangeCustomers,
          newCustomersWeekly,
          monthlyRevenueSeries,
          monthlyRevenueLabels,
          weeklyTrendSeries,
          weeklyTrendLabels,
          recentOrders: recentOrdersRows,
          topSellingItems: fallbackTopItems,
          totalStaffs: staff.length,
          totalSuppliers: suppliers.length,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard summary."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadSummary();
  }, [router, appliedDateFilter]);

  const statsRangeLabel = toRangeLabel(appliedDateFilter.startDate, appliedDateFilter.endDate);

  const todayStr = useMemo(() => toDateInputValue(new Date()), []);

  const handleApplyDateFilter = () => {
    if (!dateFilter.startDate || !dateFilter.endDate) {
      setFilterError("Start date and end date are required.");
      return;
    }

    if (dateFilter.startDate > dateFilter.endDate) {
      setFilterError("Start date cannot be after end date.");
      return;
    }

    setFilterError("");
    setAppliedDateFilter(dateFilter);
  };

  const monthlyChartOptions: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "Outfit, sans-serif",
    },
    plotOptions: {
      bar: {
        columnWidth: "50%",
        borderRadius: 4,
      },
    },
    dataLabels: { enabled: false },
    colors: ["#465fff"],
    xaxis: {
      categories: summary.monthlyRevenueLabels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { rotate: -45 },
    },
    yaxis: {
      labels: {
        formatter: (value) => `LKR ${Math.round(value).toLocaleString()}`,
      },
    },
    grid: { borderColor: "#e5e7eb" },
    tooltip: {
      y: { formatter: (value) => `LKR ${Number(value).toLocaleString()}` },
    },
  };

  const chartSeries = [
    {
      name: "Monthly Sales",
      data: summary.monthlyRevenueSeries,
    },
  ];

  const weeklyChartOptions: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "Outfit, sans-serif",
    },
    plotOptions: {
      bar: {
        columnWidth: "55%",
        borderRadius: 4,
      },
    },
    dataLabels: { enabled: false },
    colors: ["#22c55e"],
    xaxis: {
      categories: summary.weeklyTrendLabels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { rotate: -35 },
    },
    yaxis: {
      labels: {
        formatter: (value) => `LKR ${Math.round(value).toLocaleString()}`,
      },
    },
    grid: { borderColor: "#e5e7eb" },
    tooltip: {
      y: { formatter: (value) => `LKR ${Number(value).toLocaleString()}` },
    },
  };

  const weeklyChartSeries = [
    {
      name: "Daily Sales",
      data: summary.weeklyTrendSeries,
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex justify-start sm:justify-end">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <FlatpickrDateInput
            label="Start Date"
            value={dateFilter.startDate}
            onChange={(dateStr) =>
              setDateFilter((prev) => ({ ...prev, startDate: dateStr }))
            }
            maxDate={dateFilter.endDate || todayStr}
          />
          <FlatpickrDateInput
            label="End Date"
            value={dateFilter.endDate}
            onChange={(dateStr) =>
              setDateFilter((prev) => ({ ...prev, endDate: dateStr }))
            }
            minDate={dateFilter.startDate}
            maxDate={todayStr}
          />
          <button
            type="button"
            onClick={handleApplyDateFilter}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
          >
            Filter
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      ) : null}
      {filterError ? (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          {filterError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title={`${statsRangeLabel} Sales`}
          value={new Intl.NumberFormat("en-LK", {
            style: "currency",
            currency: "LKR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(summary.todaySalesLkr)}
          icon={<DollarLineIcon className="size-6 text-success-600 dark:text-success-400" />}
          accentClassName="bg-success-50 dark:bg-success-500/10"
          isLoading={isLoading}
        />
        <MetricCard
          title={`${statsRangeLabel} Orders`}
          value={summary.todayOrders.toLocaleString()}
          icon={<GroupIcon className="size-6 text-brand-600 dark:text-brand-400" />}
          accentClassName="bg-brand-50 dark:bg-brand-500/10"
          isLoading={isLoading}
        />
        <MetricCard
          title="Weekly Sales"
          value={new Intl.NumberFormat("en-LK", {
            style: "currency",
            currency: "LKR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(summary.weeklySalesLkr)}
          icon={<DollarLineIcon className="size-6 text-brand-600 dark:text-brand-400" />}
          accentClassName="bg-brand-50 dark:bg-brand-500/10"
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Staffs"
          value={summary.totalStaffs.toLocaleString()}
          icon={<UserIcon className="size-6 text-brand-600 dark:text-brand-400" />}
          accentClassName="bg-brand-50 dark:bg-brand-500/10"
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Suppliers"
          value={summary.totalSuppliers.toLocaleString()}
          icon={<BoxCubeIcon className="size-6 text-success-600 dark:text-success-400" />}
          accentClassName="bg-success-50 dark:bg-success-500/10"
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3 xl:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Monthly Revenue Trend
          </h2>
          <div className="mt-4">
            {isLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading revenue chart...</p>
            ) : summary.monthlyRevenueSeries.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No monthly sales data available.</p>
            ) : (
              <ReactApexChart options={monthlyChartOptions} series={chartSeries} type="bar" height={280} />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Last 7 Days Sales
          </h2>
          <div className="mt-4">
            {isLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading weekly trend...</p>
            ) : summary.weeklyTrendSeries.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No weekly sales data available.</p>
            ) : (
              <ReactApexChart options={weeklyChartOptions} series={weeklyChartSeries} type="bar" height={280} />
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          New Customers
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-900/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">{statsRangeLabel}</p>
            <p className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {summary.newCustomersToday.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-900/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">Last 7 days</p>
            <p className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {summary.newCustomersWeekly.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Recent Orders</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="px-3 py-3">Order ID</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                    Loading recent orders...
                  </td>
                </tr>
              ) : summary.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                    No recent orders available.
                  </td>
                </tr>
              ) : (
                summary.recentOrders.map((order, idx) => (
                  <tr key={`${order.id}-${idx}`} className="hover:bg-gray-50/70 dark:hover:bg-white/5">
                    <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-200">{order.id}</td>
                    <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-200">{order.customer}</td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                      {new Intl.NumberFormat("en-LK", {
                        style: "currency",
                        currency: "LKR",
                        minimumFractionDigits: 2,
                      }).format(order.amount)}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">{order.timeLabel}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Top-Selling Items
        </h2>

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading top-selling items...</p>
          ) : summary.topSellingItems.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No top-selling item data available yet.
            </p>
          ) : (
            summary.topSellingItems.map((item, index) => {
              const maxQty = Math.max(...summary.topSellingItems.map((entry) => entry.qty), 1);
              const fillPercent = item.qty > 0 ? Math.max(8, Math.round((item.qty / maxQty) * 100)) : 8;

              return (
                <div
                  key={`${item.name}-${index}`}
                  className="rounded-xl border border-gray-200 px-3 py-3 dark:border-gray-800"
                >
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-xs font-semibold text-brand-600 dark:text-brand-400">
                        {index + 1}
                      </span>
                      <span className="truncate text-gray-700 dark:text-gray-200">{item.name}</span>
                    </div>
                    <span className="shrink-0 font-medium text-gray-600 dark:text-gray-300">
                      {item.qty > 0 ? `${item.qty} sold` : "No sales qty yet"}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-2 rounded-full bg-brand-500 transition-all duration-300"
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}