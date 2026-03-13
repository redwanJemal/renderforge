import { Link, useLocation } from "react-router-dom";
import { LogOut, Moon, Sun, User, Menu, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/stores/auth-store";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { navItems } from "./sidebar";

export function Header() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "A";

  return (
    <header className="flex h-16 items-center justify-between border-b px-4 md:px-6">
      {/* Mobile: hamburger + brand */}
      <div className="flex items-center gap-2 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-16 items-center gap-2 border-b px-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Clapperboard className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">RenderForge</span>
            </div>
            <nav className="space-y-1 p-2">
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== "/" && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Clapperboard className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">RenderForge</span>
        </div>
      </div>

      {/* Desktop: spacer */}
      <div className="hidden md:block" />

      {/* Right side controls */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src={user?.avatarUrl || undefined}
                  alt={user?.fullName || ""}
                />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-2 p-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
