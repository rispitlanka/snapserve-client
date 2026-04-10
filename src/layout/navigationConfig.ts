import {
    BoxCubeIcon,
    BoxIcon,
    DocsIcon,
    DollarLineIcon,
    GridIcon,
    GroupIcon,
    MenuFoodIcon,
    PieChartIcon,
    UserIcon,
} from "@/icons";
import type { UserRole } from "@/lib/auth";
import type React from "react";

export type NavSubItem = {
  name: string;
  path: string;
  pro?: boolean;
  new?: boolean;
};

export type NavItem = {
  name: string;
  icon: React.ComponentType;
  path?: string;
  roles?: UserRole[];
  subItems?: NavSubItem[];
};

export const navItems: NavItem[] = [
  {
    icon: GridIcon,
    name: "Dashboard",
    path: "/superadmin-dashboard",
    roles: ["superadmin"],
  },
  {
    icon: BoxCubeIcon,
    name: "Restaurants",
    path: "/manage-restaurent",
    roles: ["superadmin"],
  },
  {
    icon: GroupIcon,
    name: "Users",
    path: "/manage-restaurant-admins",
    roles: ["superadmin"],
  },
  {
    icon: PieChartIcon,
    name: "Reports",
    path: "/reports",
    roles: ["superadmin"],
  },
  {
    icon: DollarLineIcon,
    name: "Subscriptions",
    path: "/subscriptions",
    roles: ["superadmin"],
  },
  {
    icon: GridIcon,
    name: "Dashboard",
    path: "/admin-dashboard",
    roles: ["admin"],
  },
  {
    icon: UserIcon,
    name: "Staffs",
    path: "/manage-staff",
    roles: ["admin"],
  },
  {
    icon: GroupIcon,
    name: "Suppliers",
    path: "/manage-suppliers",
    roles: ["admin"],
  },
  {
    icon: BoxIcon,
    name: "Inventory",
    subItems: [
      { name: "Items", path: "/manage-inventory/items" },
      { name: "Brands", path: "/manage-inventory/brands" },
      { name: "Categories", path: "/manage-inventory/categories" },
      { name: "Sub-categories", path: "/manage-inventory/sub-categories" },
    ],
    roles: ["admin"],
  },
  {
    icon: DocsIcon,
    name: "Purchases",
    subItems: [
      { name: "Summary", path: "/manage-purchases/summary" },
      { name: "Invoice", path: "/manage-purchases/invoice" },
      { name: "Settlement", path: "/manage-purchases/settlement" },
    ],
    roles: ["admin"],
  },
  {
    icon: MenuFoodIcon,
    name: "Menu",
    subItems: [
      { name: "Menu List", path: "/manage-menu/list" },
      { name: "Category", path: "/manage-menu/category" },
      { name: "Variant", path: "/manage-menu/variant" },
      { name: "Add On", path: "/manage-menu/add-on" },
    ],
    roles: ["admin"],
  },
  {
    icon: GroupIcon,
    name: "Customers",
    subItems: [
      { name: "Manage Customers", path: "/manage-customers" },
      { name: "Credit Settlement", path: "/manage-customers/credit-settlement" },
      { name: "Cheques", path: "/manage-customers/cheques" },
    ],
    roles: ["admin"],
  },
  {
    icon: DocsIcon,
    name: "Settings",
    subItems: [{ name: "System Controls", path: "/settings/system-controls" }],
    roles: ["admin"],
  },
  {
    icon: GridIcon,
    name: "Dashboard",
    path: "/cashier-dashboard",
    roles: ["cashier"],
  },
  {
    icon: GroupIcon,
    name: "Customers",
    subItems: [
      { name: "Manage Customers", path: "/manage-customers" },
      { name: "Credit Settlement", path: "/manage-customers/credit-settlement" },
      { name: "Cheques", path: "/manage-customers/cheques" },
    ],
    roles: ["cashier"],
  },
];
