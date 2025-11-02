"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClientSupabase } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  ChevronDown,
  Users,
  Briefcase,
  Calendar,
  BarChart3,
  MapPin,
  XCircle,
  CheckCircle,
  Clock,
  FileText,
  Eye,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/utils/cn";
import Logo from "./Logo";

interface MenuItem {
  label: string;
  href: string;
  iconName?: string;
  alwaysVisible?: boolean;
  visible?: boolean;
  comingSoon?: boolean;
  badge?: string | number;
}

interface MenuItemWithSubmenu {
  label: string;
  iconName?: string;
  submenu: { label: string; href: string }[];
}

// Mapping des noms d'icônes vers les composants
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  BarChart3,
  Settings,
  MapPin,
  XCircle,
  CheckCircle,
  Clock,
  FileText,
  Eye,
  GraduationCap,
};

interface HeaderClientProps {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatar: string | null;
  };
  menuItems: MenuItem[];
  rhItems?: MenuItemWithSubmenu[];
  adminItems: MenuItemWithSubmenu[];
  isAdmin: boolean;
}

export default function HeaderClient({
  user,
  menuItems,
  rhItems = [],
  adminItems,
  isAdmin,
}: HeaderClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [rhMenuOpen, setRhMenuOpen] = useState<Record<number, boolean>>({});
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Fermer tous les menus déroulants quand la route change
  useEffect(() => {
    setRhMenuOpen({});
    setAdminMenuOpen(false);
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClientSupabase();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo amélioré */}
          <div className="flex items-center">
            <Logo />
          </div>

          {/* Menu desktop */}
          <nav className="hidden md:flex items-center gap-2">
            {menuItems.map((item) => {
              if (!item.visible && !item.alwaysVisible) return null;

              const Icon = item.iconName ? iconMap[item.iconName] || LayoutDashboard : LayoutDashboard;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-md shadow-primary/30"
                      : "text-gray-700 hover:bg-gray-50 hover:text-primary"
                  )}
                  onClick={(e) => {
                    if (item.comingSoon) {
                      e.preventDefault();
                      alert("Module en cours de développement");
                    }
                  }}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      active ? "text-white" : "text-gray-500 group-hover:text-primary group-hover:scale-110"
                    )}
                  />
                  <span className={cn(active && "font-semibold")}>{item.label}</span>
                  {item.comingSoon && (
                    <span className="text-xs opacity-60 ml-1">(bientôt)</span>
                  )}
                  {item.badge && (
                    <span className="ml-1.5 bg-red-500 text-white text-xs font-semibold rounded-full px-2 py-0.5 shadow-sm animate-pulse">
                      {item.badge}
                    </span>
                  )}
                  {active && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-dark rounded-full" />
                  )}
                </Link>
              );
            })}

            {/* Menus RH */}
            {rhItems.map((rhItem, index) => {
              const isFormations = rhItem.label === "Formations";
              const isActive = isFormations 
                ? pathname.startsWith("/formations")
                : pathname.startsWith("/rh") || pathname.startsWith("/absences");
              
              return (
                <div key={rhItem.label} className="relative">
                  <button
                    onClick={() => setRhMenuOpen(prev => ({ ...prev, [index]: !prev[index] }))}
                    className={cn(
                      "group relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-md shadow-primary/30"
                        : "text-gray-700 hover:bg-gray-50 hover:text-primary"
                    )}
                  >
                    {rhItem.iconName && (() => {
                      const Icon = iconMap[rhItem.iconName] || Users;
                      return (
                        <Icon
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            isActive
                              ? "text-white"
                              : "text-gray-500 group-hover:text-primary group-hover:scale-110"
                          )}
                        />
                      );
                    })()}
                    <span className={cn(isActive && "font-semibold")}>
                      {rhItem.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        rhMenuOpen[index] && "rotate-180",
                        isActive ? "text-white" : "text-gray-500"
                      )}
                    />
                  </button>

                  {rhMenuOpen[index] && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                      {rhItem.submenu.map((subItem) => {
                        const subActive = pathname === subItem.href || pathname.startsWith(subItem.href + "/");
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={() => setRhMenuOpen(prev => ({ ...prev, [index]: false }))}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                              subActive
                                ? "bg-primary/10 text-primary border-l-2 border-primary font-semibold"
                                : "text-gray-700 hover:bg-gray-50 hover:text-primary"
                            )}
                          >
                            {subItem.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Menu Admin */}
            {isAdmin && adminItems.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                  className={cn(
                    "group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    pathname.startsWith("/admin")
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/30"
                      : "text-gray-700 hover:bg-gray-50 hover:text-amber-600"
                  )}
                >
                  <Settings
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      pathname.startsWith("/admin")
                        ? "text-white"
                        : "text-gray-500 group-hover:text-amber-600 group-hover:rotate-90"
                    )}
                  />
                  <span className={pathname.startsWith("/admin") ? "font-semibold" : ""}>
                    Administration
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-all duration-200",
                      adminMenuOpen && "transform rotate-180",
                      pathname.startsWith("/admin") ? "text-white" : "text-gray-400"
                    )}
                  />
                </button>

                {adminMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200/80 py-2 overflow-hidden">
                    {adminItems[0].submenu.map((subitem) => (
                      <Link
                        key={subitem.href}
                        href={subitem.href}
                        className={cn(
                          "block px-4 py-2.5 text-sm transition-all duration-150",
                          pathname === subitem.href
                            ? "bg-gradient-to-r from-amber-50 to-amber-100/50 text-amber-700 font-semibold border-l-2 border-amber-500"
                            : "text-gray-700 hover:bg-gray-50 hover:text-amber-600"
                        )}
                        onClick={() => setAdminMenuOpen(false)}
                      >
                        {subitem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Menu utilisateur */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="group flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
              >
                <div className="h-9 w-9 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-200 group-hover:scale-105">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="max-w-[150px] truncate font-medium">{user.displayName}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-gray-400 transition-all duration-200",
                    userMenuOpen && "transform rotate-180 text-primary"
                  )}
                />
              </button>

              {userMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200/80 py-2 overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs text-gray-500 font-medium mb-1">Connecté en tant que</p>
                    <p className="text-sm text-gray-700 font-semibold truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-all duration-150"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User className="h-4 w-4 text-primary" />
                    <span>Mon profil</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all duration-150 font-medium"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Déconnexion</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bouton menu mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200/80 bg-white/95 backdrop-blur-sm">
          <nav className="px-4 py-3 space-y-1">
            {menuItems.map((item) => {
              if (!item.visible && !item.alwaysVisible) return null;

              const Icon = item.iconName ? iconMap[item.iconName] || LayoutDashboard : LayoutDashboard;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200",
                    active
                      ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-50 hover:text-primary"
                  )}
                  onClick={(e) => {
                    if (item.comingSoon) {
                      e.preventDefault();
                      alert("Module en cours de développement");
                    } else {
                      setMobileMenuOpen(false);
                    }
                  }}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      active ? "text-white" : "text-gray-500 group-hover:text-primary"
                    )}
                  />
                  <span className={cn(active && "font-semibold")}>{item.label}</span>
                  {item.comingSoon && (
                    <span className="ml-auto text-xs opacity-60">(bientôt)</span>
                  )}
                </Link>
              );
            })}

            {rhItems.map((rhItem) => (
              <div key={rhItem.label} className="pt-3 border-t border-gray-200/80">
                <div className="px-4 py-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                  {rhItem.label}
                </div>
                {rhItem.submenu.map((subItem) => {
                  const Icon = rhItem.iconName ? iconMap[rhItem.iconName] || Users : Users;
                  const subActive = pathname === subItem.href || pathname.startsWith(subItem.href + "/");
                  return (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200",
                        subActive
                          ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary font-semibold border-l-2 border-primary"
                          : "text-gray-700 hover:bg-gray-50 hover:text-primary"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5",
                          subActive ? "text-primary" : "text-gray-400"
                        )}
                      />
                      <span>{subItem.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}

            {isAdmin && adminItems.length > 0 && (
              <div className="pt-3 border-t border-gray-200/80">
                <div className="px-4 py-2 text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">
                  Administration
                </div>
                {adminItems[0].submenu.map((subitem) => (
                  <Link
                    key={subitem.href}
                    href={subitem.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200",
                      pathname === subitem.href
                        ? "bg-gradient-to-r from-amber-50 to-amber-100/50 text-amber-700 font-semibold border-l-2 border-amber-500"
                        : "text-gray-700 hover:bg-gray-50 hover:text-amber-600"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings
                      className={cn(
                        "h-5 w-5",
                        pathname === subitem.href ? "text-amber-600" : "text-gray-500"
                      )}
                    />
                    {subitem.label}
                  </Link>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-gray-200/80">
              <div className="px-4 py-2 mb-1">
                <p className="text-xs text-gray-500 font-medium">Connecté en tant que</p>
                <p className="text-sm text-gray-700 font-semibold truncate">{user.email}</p>
              </div>
              <Link
                href="/profile"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User className="h-5 w-5 text-primary" />
                <span>Mon profil</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
              >
                <LogOut className="h-5 w-5" />
                <span>Déconnexion</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Overlay pour fermer les menus en cliquant à l'extérieur */}
      {(userMenuOpen || adminMenuOpen || Object.values(rhMenuOpen).some(Boolean)) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setUserMenuOpen(false);
            setAdminMenuOpen(false);
            setRhMenuOpen({});
          }}
        />
      )}
    </header>
  );
}

