import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Film,
  Share2,
  Calendar,
  BarChart3,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Clapperboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/renders", label: "Renders", icon: Film },
  { href: "/social", label: "Social", icon: Share2 },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("rf_sidebar_collapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("rf_sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  return [collapsed, setCollapsed] as const;
}

export { navItems };

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-card transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Clapperboard className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold truncate">RenderForge</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href));

            const linkContent = (
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.href}>{linkContent}</div>;
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
              collapsed && "justify-center px-2"
            )}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" />
                <span className="truncate">Collapse</span>
              </>
            )}
          </button>
          {!collapsed && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              RenderForge v0.1
            </p>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
