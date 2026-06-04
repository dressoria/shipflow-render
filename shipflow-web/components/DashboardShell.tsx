"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Bell,
  BookMarked,
  ClipboardList,
  CreditCard,
  Home,
  MapPinned,
  PackageCheck,
  PlusCircle,
  Search,
  Truck,
  LogOut,
  ShieldCheck,
  HelpCircle,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from "lucide-react";
import { Button } from "@/components/Button";
import { BrandName } from "@/components/BrandName";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useRegionMode } from "@/contexts/RegionModeContext";
import { useAuth } from "@/hooks/useAuth";
import { getPrepAccessState } from "@/lib/prepAccess";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  badge?: string;
  secondary?: boolean;
};

type NavGroup = {
  heading?: string;
  items: NavItem[];
};

const usaMenu: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Get rates", href: "/crear-guia", icon: PlusCircle },
  { label: "Address book", href: "/direcciones", icon: MapPinned },
  { label: "Shipments", href: "/envios", icon: Truck },
  { label: "FBA Prep", href: "/prep", icon: ClipboardList },
  { label: "Tracking", href: "/tracking", icon: MapPinned },
  { label: "Balance", href: "/saldo", icon: CreditCard },
  { label: "Profile", href: "/perfil", icon: Settings },
  { label: "Help", href: "/support", icon: HelpCircle },
];

// Ecuador flat list (for mobile)
const ecuadorMenu: NavItem[] = [
  { label: "Panel", href: "/dashboard", icon: Home },
  { label: "Nueva solicitud", href: "/ecuador/crear-envio", icon: PlusCircle },
  { label: "Mis solicitudes", href: "/ecuador/envios", icon: PackageCheck },
  { label: "Libreta de direcciones", href: "/direcciones", icon: BookMarked },
  { label: "Soporte", href: "/support", icon: HelpCircle },
  { label: "Perfil", href: "/perfil", icon: Settings },
  { label: "Etiquetas USA", href: "/shipping-labels", icon: Truck, badge: "USA", secondary: true },
  { label: "Envíos USA", href: "/envios", icon: Truck, secondary: true },
  { label: "Saldo", href: "/saldo", icon: CreditCard, secondary: true },
  { label: "FBA Prep", href: "/prep", icon: ClipboardList, badge: "Próx.", secondary: true },
];

// Ecuador grouped structure (for desktop sidebar)
const ECUADOR_PRIMARY_GROUPS: NavGroup[] = [
  {
    heading: "Plataforma",
    items: [
      { label: "Panel", href: "/dashboard", icon: Home },
      { label: "Nueva solicitud", href: "/ecuador/crear-envio", icon: PlusCircle },
      { label: "Mis solicitudes", href: "/ecuador/envios", icon: PackageCheck },
    ],
  },
  {
    heading: "Direcciones",
    items: [
      { label: "Libreta de direcciones", href: "/direcciones", icon: BookMarked },
    ],
  },
  {
    heading: "Soporte",
    items: [
      { label: "Soporte", href: "/support", icon: HelpCircle },
      { label: "Perfil", href: "/perfil", icon: Settings },
    ],
  },
];

const ECUADOR_SECONDARY_GROUP: NavGroup = {
  items: [
    { label: "Etiquetas USA", href: "/shipping-labels", icon: Truck, badge: "USA", secondary: true },
    { label: "Envíos USA", href: "/envios", icon: Truck, secondary: true },
    { label: "Saldo", href: "/saldo", icon: CreditCard, secondary: true },
    { label: "FBA Prep", href: "/prep", icon: ClipboardList, badge: "Próx.", secondary: true },
  ],
};

const SIDEBAR_COLLAPSED_KEY = "sendiflash-sidebar-collapsed";

type DashboardShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function DashboardShell({ title, description, children }: DashboardShellProps) {
  const { user, logout, isAdmin } = useAuth();
  const { mode, setMode } = useRegionMode();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trackQuery, setTrackQuery] = useState("");
  const router = useRouter();
  const prepAccess = getPrepAccessState(user);
  const isEcuadorMode = mode === "ec";

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  const applyPrepBadge = (items: NavItem[], badge: string): NavItem[] =>
    items.map((item) => (item.href === "/prep" && !prepAccess.canUsePrep ? { ...item, badge } : item));

  const applyPrepBadgeToGroups = (groups: NavGroup[], badge: string): NavGroup[] =>
    groups.map((group) => ({ ...group, items: applyPrepBadge(group.items, badge) }));

  // Flat items for mobile menu (kept simple — no section headers on mobile)
  const baseNavItems = applyPrepBadge(isEcuadorMode ? ecuadorMenu : usaMenu, isEcuadorMode ? "Próx." : "Soon");
  const navItems = isAdmin ? [...baseNavItems, { label: "Admin", href: "/admin", icon: ShieldCheck }] : baseNavItems;
  const primaryNavItems = navItems.filter((item) => !item.secondary);
  const secondaryNavItems = navItems.filter((item) => item.secondary);

  // Grouped structure for desktop Ecuador sidebar
  const ecuadorPrimaryGroups: NavGroup[] = (() => {
    const groups = applyPrepBadgeToGroups(ECUADOR_PRIMARY_GROUPS, "Próx.");
    if (!isAdmin) return groups;
    const last = groups[groups.length - 1];
    return [
      ...groups.slice(0, -1),
      { ...last, items: [...last.items, { label: "Admin", href: "/admin", icon: ShieldCheck }] },
    ];
  })();

  const ecuadorSecondaryGroups: NavGroup[] = [
    applyPrepBadgeToGroups([ECUADOR_SECONDARY_GROUP], "Próx.")[0],
  ];

  const accentClass = isEcuadorMode ? "text-sky-700" : "text-[#F97316]";
  const activeClass = isEcuadorMode
    ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
    : "bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/30";

  return (
    <ProtectedRoute>
    <div className={cn("min-h-screen", isEcuadorMode ? "bg-sky-50/50" : "bg-[#F8F9FC]")}>
      <header className="sticky top-0 z-40 border-b border-white/40 bg-white/70 backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-5 lg:px-6">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="flex min-w-0 items-center gap-3 font-black text-slate-950">
            <span className={cn("brand-glow grid h-9 w-9 place-items-center rounded-2xl text-white", isEcuadorMode ? "bg-sky-600" : "bg-[#2563EB]")}>
              <PackageCheck className="h-5 w-5" />
            </span>
            <BrandName />
          </Link>
          <button
            type="button"
            onClick={() => setMode(isEcuadorMode ? "us" : "ec")}
            className="hidden shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black shadow-sm transition hover:border-sky-200 hover:bg-sky-50 sm:inline-flex"
            title={isEcuadorMode ? "Cambiar a modo USA" : "Cambiar a modo Ecuador"}
          >
            <span className={isEcuadorMode ? "text-sky-700" : "text-slate-400"}>EC</span>
            <span className="mx-0.5 text-slate-300">|</span>
            <span className={!isEcuadorMode ? "text-[#2563EB]" : "text-slate-400"}>USA</span>
          </button>
          <form
            onSubmit={(e) => { e.preventDefault(); router.push(trackQuery.trim() ? `/tracking?numero=${encodeURIComponent(trackQuery.trim())}` : "/tracking"); }}
            className="hidden h-10 min-w-64 items-center gap-2 rounded-2xl border border-blue-100 bg-white/80 px-3 text-sm shadow-sm lg:flex"
          >
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={trackQuery}
              onChange={(e) => setTrackQuery(e.target.value)}
              placeholder={isEcuadorMode ? "Buscar guía, código o solicitud" : "Search shipment, customer, or city"}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
            />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <Button href={isEcuadorMode ? "/ecuador/crear-envio" : "/crear-guia"} icon={<PlusCircle className="h-4 w-4" />} className="hidden rounded-2xl sm:inline-flex">
              {isEcuadorMode ? "Nueva cotización" : "Get rates"}
            </Button>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
              aria-label={isEcuadorMode ? "Notificaciones" : "Notifications"}
            >
              <Bell className="h-4 w-4" />
            </button>
            <Link
              href="/perfil"
              className={cn("grid h-9 w-9 place-items-center rounded-full text-sm font-black shadow-sm transition hover:opacity-80", isEcuadorMode ? "bg-sky-100 text-sky-700" : "bg-blue-100 text-[#2563EB]")}
              aria-label={isEcuadorMode ? "Mi perfil" : "My profile"}
            >
              {(user?.businessName || user?.email || "U")[0].toUpperCase()}
            </Link>
            <button
              type="button"
              onClick={logout}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-blue-100 bg-white/85 text-slate-700 shadow-sm transition hover:bg-blue-50"
              aria-label={isEcuadorMode ? "Cerrar sesión" : "Sign out"}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation overlay"
          />
          <aside className="relative flex h-full w-[min(320px,86vw)] flex-col bg-[#12182B] p-3 shadow-2xl">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 p-3 text-white">
              <div className="min-w-0">
                <p className="text-sm font-bold">{isEcuadorMode ? "SendiFlash Ecuador" : "SendiFlash"}</p>
                <p className="truncate text-xs text-slate-300">{user?.businessName ?? user?.email ?? "Workspace"}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavigationList
              items={primaryNavItems}
              pathname={pathname}
              collapsed={false}
              activeClass={activeClass}
              onNavigate={() => setMobileMenuOpen(false)}
            />
            {secondaryNavItems.length > 0 ? (
              <>
                <p className="mt-6 px-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">También disponible</p>
                <NavigationList
                  items={secondaryNavItems}
                  pathname={pathname}
                  collapsed={false}
                  activeClass={activeClass}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              </>
            ) : null}
          </aside>
        </div>
      ) : null}

      <div
        className={`mx-auto grid max-w-[1800px] gap-4 px-3 py-4 sm:px-5 lg:px-6 ${
          sidebarCollapsed
            ? "lg:grid-cols-[76px_minmax(0,1fr)]"
            : "lg:grid-cols-[236px_minmax(0,1fr)]"
        }`}
      >
        <aside className="sticky top-[76px] hidden h-[calc(100vh-92px)] min-w-0 overflow-y-auto rounded-3xl border border-white/10 bg-[#12182B] p-2 shadow-2xl shadow-[#12182B]/15 lg:block">
          <div className={`dark-glass rounded-2xl text-white ${sidebarCollapsed ? "p-2" : "p-3"}`}>
            <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10">
                <BarChart3 className={cn("h-5 w-5", isEcuadorMode ? "text-sky-300" : "text-[#22C55E]")} />
              </span>
              {!sidebarCollapsed ? (
                <div className="min-w-0">
                  <p className="text-sm font-bold">{isEcuadorMode ? "SendiFlash Ecuador" : "System operational"}</p>
                  <p className="truncate text-xs text-slate-300">{user?.businessName ?? user?.email ?? (isEcuadorMode ? "Tu cuenta" : "Shipping balance")}</p>
                </div>
              ) : null}
            </div>
          </div>
          {isEcuadorMode ? (
            <>
              <GroupedNavigationList groups={ecuadorPrimaryGroups} pathname={pathname} collapsed={sidebarCollapsed} activeClass={activeClass} />
              {!sidebarCollapsed ? (
                <>
                  <p className="mt-4 px-3 text-[9px] font-black uppercase tracking-[0.26em] text-slate-500">También disponible</p>
                  <GroupedNavigationList groups={ecuadorSecondaryGroups} pathname={pathname} collapsed={sidebarCollapsed} activeClass={activeClass} />
                </>
              ) : (
                <GroupedNavigationList groups={ecuadorSecondaryGroups} pathname={pathname} collapsed={sidebarCollapsed} activeClass={activeClass} />
              )}
            </>
          ) : (
            <>
              <NavigationList items={primaryNavItems} pathname={pathname} collapsed={sidebarCollapsed} activeClass={activeClass} />
              {!sidebarCollapsed && secondaryNavItems.length > 0 ? (
                <>
                  <p className="mt-5 px-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">También disponible</p>
                  <NavigationList items={secondaryNavItems} pathname={pathname} collapsed={sidebarCollapsed} activeClass={activeClass} />
                </>
              ) : null}
            </>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            className="absolute -right-3 top-5 grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition hover:bg-blue-50 hover:text-[#2563EB]"
            aria-label={sidebarCollapsed ? (isEcuadorMode ? "Expandir menú" : "Expand sidebar") : (isEcuadorMode ? "Colapsar menú" : "Collapse sidebar")}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </aside>
        <main className="min-w-0">
          {(!isEcuadorMode || pathname !== "/dashboard") && (
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className={cn("text-xs font-bold uppercase tracking-[0.18em]", accentClass)}>
                {isEcuadorMode ? "Panel Ecuador" : "Dashboard"}
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                {title}
              </h1>
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            </div>
          </div>
          )}
          {children}
        </main>
      </div>
    </div>
    </ProtectedRoute>
  );
}

function NavigationList({
  items,
  pathname,
  collapsed,
  activeClass,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  activeClass: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="mt-2 grid gap-1">
      {items.map((item) => (
        <NavItemLink
          key={item.href}
          item={item}
          pathname={pathname}
          collapsed={collapsed}
          activeClass={activeClass}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

function GroupedNavigationList({
  groups,
  pathname,
  collapsed,
  activeClass,
  onNavigate,
}: {
  groups: NavGroup[];
  pathname: string;
  collapsed: boolean;
  activeClass: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="mt-1 grid gap-0">
      {groups.map((group, index) => (
        <div key={index}>
          {!collapsed && group.heading ? (
            <p className="mt-4 px-3 pb-1 text-[9px] font-black uppercase tracking-[0.26em] text-slate-500">
              {group.heading}
            </p>
          ) : null}
          <div className="grid gap-0.5">
            {group.items.map((item) => (
              <NavItemLink
                key={item.href}
                item={item}
                pathname={pathname}
                collapsed={collapsed}
                activeClass={activeClass}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function NavItemLink({
  item,
  pathname,
  collapsed,
  activeClass,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  activeClass: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const active = item.href === "/admin" ? pathname.startsWith("/admin") : pathname === item.href;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={`flex items-center rounded-2xl text-sm font-bold transition ${
        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"
      } ${
        active
          ? activeClass
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed ? (
        <>
          <span className="truncate">{item.label}</span>
          {item.badge ? (
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-black ${
              active ? "bg-white/20 text-white" : "bg-orange-500/15 text-orange-200"
            }`}>
              {item.badge}
            </span>
          ) : null}
        </>
      ) : null}
    </Link>
  );
}
