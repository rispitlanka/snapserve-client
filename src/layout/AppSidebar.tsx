"use client";
import type { UserRole } from "@/lib/auth";
import { getAuthSession } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import { useSidebar } from "../context/SidebarContext";
import {
    // BoxCubeIcon,
    // CalenderIcon,
    BoxCubeIcon,
    BoxIconLine,
    ChevronDownIcon,
    DollarLineIcon,
    GridIcon,
    GroupIcon,
    HorizontaLDots,
    PieChartIcon,
    UserIcon,
} from "../icons/index";
// import SidebarWidget from "./SidebarWidget";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  roles?: UserRole[];
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  // Super Admin Items
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/superadmin-dashboard",
    roles: ["superadmin"],
  },
  {
    icon: <BoxCubeIcon />,
    name: "Restaurants",
    path: "/manage-restaurent",
    roles: ["superadmin"],
  },
  {
    icon: <GroupIcon />,
    name: "Users",
    path: "/manage-restaurant-admins",
    roles: ["superadmin"],
  },
  {
    icon: <PieChartIcon />,
    name: "Reports",
    path: "/reports",
    roles: ["superadmin"],
  },
  {
    icon: <DollarLineIcon />,
    name: "Subscriptions",
    path: "/subscriptions",
    roles: ["superadmin"],
  },

  // Admin Items
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/admin-dashboard",
    roles: ["admin"],
  },
  {
    icon: <UserIcon />,
    name: "Manage Staffs",
    path: "/manage-staff",
    roles: ["admin"],
  },
  {
    icon: <GroupIcon />,
    name: "Manage Suppliers",
    path: "/manage-suppliers",
    roles: ["admin"],
  },
  {
    icon: <BoxIconLine />,
    name: "Manage Inventory",
    subItems: [
      { name: "Overview", path: "/manage-inventory" },
      { name: "Categories", path: "/manage-inventory-categories" },
      { name: "Sub-categories", path: "/manage-inventory-sub-categories" },
      { name: "Brands", path: "/manage-inventory-brands" },
      { name: "Items", path: "/manage-inventory-items" },
    ],
    roles: ["admin"],
  },
  
  // Cashier Items
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/cashier-dashboard",
    roles: ["cashier"],
  },
  // {
  //   icon: <CalenderIcon />,
  //   name: "Calendar",
  //   path: "/calendar",
  // },
  // {
  //   icon: <UserCircleIcon />,
  //   name: "User Profile",
  //   path: "/profile",
  // },
  // {
  //   name: "Forms",
  //   icon: <ListIcon />,
  //   subItems: [{ name: "Form Elements", path: "/form-elements", pro: false }],
  // },
  // {
  //   name: "Tables",
  //   icon: <TableIcon />,
  //   subItems: [{ name: "Basic Tables", path: "/basic-tables", pro: false }],
  // },
  // {
  //   name: "Pages",
  //   icon: <PageIcon />,
  //   subItems: [
  //     { name: "Blank Page", path: "/blank", pro: false },
  //     { name: "404 Error", path: "/error-404", pro: false },
  //   ],
  // },
];

// const othersItems: NavItem[] = [
//   {
//     icon: <PieChartIcon />,
//     name: "Charts",
//     subItems: [
//       { name: "Line Chart", path: "/line-chart", pro: false },
//       { name: "Bar Chart", path: "/bar-chart", pro: false },
//     ],
//   },
//   {
//     icon: <BoxCubeIcon />,
//     name: "UI Elements",
//     subItems: [
//       { name: "Alerts", path: "/alerts", pro: false },
//       { name: "Avatar", path: "/avatars", pro: false },
//       { name: "Badge", path: "/badge", pro: false },
//       { name: "Buttons", path: "/buttons", pro: false },
//       { name: "Images", path: "/images", pro: false },
//       { name: "Videos", path: "/videos", pro: false },
//     ],
//   },
//   {
//     icon: <PlugInIcon />,
//     name: "Authentication",
//     subItems: [
//       { name: "Sign In", path: "/signin", pro: false },
//       { name: "Sign Up", path: "/signup", pro: false },
//     ],
//   },
// ];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen } = useSidebar();
  const pathname = usePathname();

  const subscribeToSession = useCallback(() => {
    return () => {
      // No-op subscription. We only need a hydration-safe snapshot.
    };
  }, []);

  const authUserSnapshot = useSyncExternalStore<string>(
    subscribeToSession,
    () => {
      const user = getAuthSession()?.user;
      return user ? `${user.role}::${user.name ?? ""}` : "";
    },
    () => ""
  );

  const authUser = useMemo(() => {
    if (!authUserSnapshot) return null;
    const [rolePart, ...nameParts] = authUserSnapshot.split("::");
    if (!rolePart) return null;
    return {
      role: rolePart as UserRole,
      name: nameParts.join("::"),
    };
  }, [authUserSnapshot]);

  const userRole = authUser?.role ?? null;

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => !item.roles || (!!userRole && item.roles.includes(userRole))),
    [userRole]
  );

  const showBottomProfileLink = Boolean(
    userRole && ["superadmin", "admin", "cashier"].includes(userRole)
  );

  const profileLinkIsActive = pathname === "/profile";

  const profileName = authUser?.name?.trim() || "User";
  const profileRoleLabel =
    authUser?.role === "superadmin"
      ? "Super Admin"
      : authUser?.role === "admin"
      ? "Restaurant Admin"
      : authUser?.role === "cashier"
      ? "Cashier"
      : "";

  const profileInitials = profileName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "others"
  ) => {
    const firstPathIndex = navItems.reduce<Record<string, number>>((acc, item, idx) => {
      if (item.path && acc[item.path] === undefined) {
        acc[item.path] = idx;
      }
      return acc;
    }, {});

    return (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav, index) => {
        const isPrimaryRouteMatch =
          Boolean(nav.path) && firstPathIndex[nav.path as string] === index;

        const navIsActive = Boolean(nav.path) && isPrimaryRouteMatch && isActive(nav.path as string);

        return (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group  ${
                resolvedOpenSubmenu?.type === menuType &&
                resolvedOpenSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isMobileOpen
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={` ${
                  resolvedOpenSubmenu?.type === menuType &&
                  resolvedOpenSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {(isExpanded || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200  ${
                    resolvedOpenSubmenu?.type === menuType &&
                    resolvedOpenSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  navIsActive ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    navIsActive
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isMobileOpen) && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  resolvedOpenSubmenu?.type === menuType &&
                  resolvedOpenSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 ml-6 space-y-1">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={`menu-dropdown-item ${
                        isActive(subItem.path)
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive"
                      }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge `}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${
                              isActive(subItem.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge `}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      )})}
    </ul>
    );
  };

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => path === pathname;
  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  const activeSubmenu = useMemo(() => {
    const index = visibleNavItems.findIndex(
      (item) => item.subItems?.some((subItem) => subItem.path === pathname)
    );

    if (index === -1) {
      return null;
    }

    return { type: "main" as const, index };
  }, [pathname, visibleNavItems]);

  const resolvedOpenSubmenu = openSubmenu ?? activeSubmenu;

  useEffect(() => {
    // Measure submenu height for both explicitly opened menus and auto-opened active route menus.
    if (resolvedOpenSubmenu !== null) {
      const key = `${resolvedOpenSubmenu.type}-${resolvedOpenSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [resolvedOpenSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
    >
      <div
        className={`py-8 flex  ${
          !isExpanded && !isMobileOpen ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
          {isExpanded || isMobileOpen ? (
            <div className="flex items-center gap-3">
              <Image
                src="/images/logo/logo-icon.svg"
                alt="Snapserve"
                width={32}
                height={32}
                loading="eager"
              />
              <span className="text-xl font-semibold text-gray-900 dark:text-white">
                Snapserve
              </span>
            </div>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Snapserve"
              width={32}
              height={32}
              loading="eager"
            />
          )}
        </Link>
      </div>
      <div className="flex h-full flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-5 text-gray-400 ${
                  !isExpanded && !isMobileOpen
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(visibleNavItems, "main")}
            </div>

            {/* <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isMobileOpen
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isMobileOpen ? (
                  "Others"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div> */}
          </div>
        </nav>
        {showBottomProfileLink ? (
          <div className="mt-auto pb-6">
            {isExpanded || isMobileOpen ? (
              <Link
                href="/profile"
                className={`group block rounded-2xl border p-3 transition-all ${
                  profileLinkIsActive
                    ? "border-brand-200 bg-brand-50/70 dark:border-brand-800 dark:bg-brand-500/10"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:bg-white/3 dark:hover:border-gray-700 dark:hover:bg-gray-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-sm font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                    {profileInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                      {profileName}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {profileRoleLabel}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-xs font-medium text-gray-600 dark:bg-gray-900/60 dark:text-gray-300">
                  <span>User Profile</span>
                  <span
                    className={`transition-transform ${
                      profileLinkIsActive ? "text-brand-600 dark:text-brand-400" : ""
                    } group-hover:translate-x-0.5`}
                  >
                    →
                  </span>
                </div>
              </Link>
            ) : (
              <Link
                href="/profile"
                className={`menu-item group justify-center ${
                  profileLinkIsActive ? "menu-item-active" : "menu-item-inactive"
                }`}
                aria-label="User Profile"
              >
                <span
                  className={`${
                    profileLinkIsActive ? "menu-item-icon-active" : "menu-item-icon-inactive"
                  }`}
                >
                  <UserIcon />
                </span>
              </Link>
            )}
          </div>
        ) : null}
        {/* {isExpanded || isMobileOpen ? <SidebarWidget /> : null} */}
      </div>
    </aside>
  );
};

export default AppSidebar;
