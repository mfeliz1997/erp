"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  Wrench,
  Package,
  Inbox,
  ScrollText,
  Users,
  CircleDollarSign,
  Activity,
  Settings,
  BarChart2,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/(auth)/actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

export type SubMenuItem = { name: string; path: string; icon?: React.ReactNode };
export type MenuItem = {
  name: string;
  path?: string;
  icon: React.ReactNode | string;
  subItems?: SubMenuItem[];
};

interface SidebarProps {
  tenantName: string;
  userName: string;
  menuItems: MenuItem[];
}

const iconMap: Record<string, React.ReactNode> = {
  '📊': <LayoutDashboard className="w-5 h-5" />,
  '🛒': <ShoppingCart className="w-5 h-5" />,
  '💵': <Wallet className="w-5 h-5" />,
  '🔧': <Wrench className="w-5 h-5" />,
  '📦': <Package className="w-5 h-5" />,
  '📥': <Inbox className="w-5 h-5" />,
  '📜': <ScrollText className="w-5 h-5" />,
  '👥': <Users className="w-5 h-5" />,
  '💸': <CircleDollarSign className="w-5 h-5" />,
  '👁️': <Activity className="w-5 h-5" />,
  '⚙️': <Settings className="w-5 h-5" />,
  '📈': <BarChart2 className="w-5 h-5" />,
  '⚖️': <Scale className="w-5 h-5" />,
};

function resolveIcon(icon: React.ReactNode | string): React.ReactNode {
  if (typeof icon === 'string') return iconMap[icon] ?? <span>{icon}</span>;
  return icon;
}

export function Sidebar({ tenantName, userName, menuItems }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Track which accordion groups are open. Default open if any child is active.
  const initialOpen = new Set<string>(
    menuItems
      .filter(item => item.subItems?.some(sub => pathname === sub.path))
      .map(item => item.name)
  );
  const [openGroups, setOpenGroups] = useState<Set<string>>(initialOpen);

  function toggleGroup(name: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className={cn("p-6 border-b border-gray-200 flex items-center justify-between min-h-[100px]", mobile && "pt-16")}>
        {!isCollapsed || mobile ? (
          <div className="overflow-hidden">
            <h2 className="font-semibold text-xl truncate">{tenantName || 'INVENZA'}</h2>
            <p className="text-xs font-bold text-gray-400 truncate mt-1">👤 {userName}</p>
          </div>
        ) : (
          <div className="mx-auto bg-primary text-primary-foreground p-2 font-semibold text-xl">B</div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden pt-8">
        {menuItems.map((item) => {
          if (item.subItems) {
            const isGroupOpen = openGroups.has(item.name);
            const hasActiveChild = item.subItems.some(sub => pathname === sub.path);

            return (
              <Collapsible
                key={item.name}
                open={isGroupOpen}
                onOpenChange={() => toggleGroup(item.name)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center gap-4 px-3 py-3 text-xs font-semibold transition-all border-2 border-transparent",
                      hasActiveChild
                        ? "text-primary"
                        : "text-gray-500 hover:bg-gray-50 hover:border-black",
                      isCollapsed && !mobile && "justify-center px-0"
                    )}
                    title={item.name}
                  >
                    <div className={cn("shrink-0", hasActiveChild ? "text-primary" : "text-black")}>
                      {resolveIcon(item.icon)}
                    </div>
                    {(!isCollapsed || mobile) && (
                      <>
                        <span className="flex-1 text-left truncate">{item.name}</span>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 shrink-0 transition-transform duration-200",
                            isGroupOpen && "rotate-180"
                          )}
                        />
                      </>
                    )}
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                  <div className={cn("mt-1 space-y-1", !isCollapsed || mobile ? "pl-9" : "pl-0")}>
                    {item.subItems.map((sub) => {
                      const isActive = pathname === sub.path;
                      return (
                        <Link
                          key={sub.path}
                          href={sub.path}
                          onClick={() => { if (mobile) setMobileOpen(false); }}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-all border-2 border-transparent",
                            isActive
                              ? "bg-primary text-primary-foreground border-black shadow-sm rounded-xl"
                              : "text-gray-400 hover:text-gray-700 hover:bg-gray-50 hover:border-black rounded-xl"
                          )}
                        >
                          {isCollapsed && !mobile ? (
                            sub.icon
                              ? <span className="mx-auto">{sub.icon}</span>
                              : <span className="mx-auto w-1.5 h-1.5 rounded-full bg-current" />
                          ) : (
                            <>
                              {sub.icon && <span className="shrink-0">{sub.icon}</span>}
                              {sub.name}
                            </>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          }

          // Leaf item (direct link)
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path!}
              onClick={() => { if (mobile) setMobileOpen(false); }}
              className={cn(
                "flex items-center gap-4 px-3 py-3 text-xs font-semibold transition-all group border-2 border-transparent",
                isActive
                  ? "bg-primary text-primary-foreground border-black shadow-sm rounded-xl"
                  : "text-gray-500 hover:bg-gray-50 hover:border-black",
                isCollapsed && !mobile && "justify-center px-0"
              )}
              title={item.name}
            >
              <div className={cn("shrink-0", isActive ? "text-white" : "text-black group-hover:scale-110 transition-transform")}>
                {resolveIcon(item.icon)}
              </div>
              {(!isCollapsed || mobile) && (
                <span className="truncate">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-gray-200">
        <form action={logoutAction}>
          <button
            type="submit"
            className={cn(
              "w-full flex items-center gap-4 px-3 py-3 text-xs font-semibold text-red-600 border-2 border-transparent hover:border-red-600 hover:bg-red-50 transition-all",
              isCollapsed && !mobile && "justify-center px-0"
            )}
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {(!isCollapsed || mobile) && <span>Cerrar Sesión</span>}
          </button>
        </form>
      </div>

      {/* Collapse toggle (desktop only) */}
      {!mobile && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-24 bg-primary text-primary-foreground p-1 border-2 border-white rounded-full hover:scale-110 transition-transform z-50"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Trigger */}
      <div className="lg:hidden fixed top-4 left-4 z-[60]">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="border border-gray-200 rounded-xl bg-white shadow-sm">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-none">
            <SheetHeader className="sr-only">
              <SheetTitle>Menú de Navegación</SheetTitle>
              <SheetDescription>Acceso a las diferentes secciones del sistema</SheetDescription>
            </SheetHeader>
            <div className="absolute top-4 right-4 z-10">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <NavContent mobile={true} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out border-r border-gray-200 bg-white z-[50]",
          isCollapsed ? "w-20" : "w-72"
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
