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
  Settings
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

interface SidebarProps {
  tenantName: string;
  userName: string;
  menuItems: any[];
}

const iconMap: Record<string, any> = {
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
};

export function Sidebar({ tenantName, userName, menuItems }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const NavContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full bg-white border-r-2 border-black">
      {/* Header */}
      <div className="p-6 border-b-2 border-black flex items-center justify-between min-h-[100px]">
        {!isCollapsed || mobile ? (
          <div className="overflow-hidden">
            <h2 className="font-black text-xl uppercase tracking-tighter truncate">{tenantName || 'BERAL'}</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate mt-1">👤 {userName}</p>
          </div>
        ) : (
          <div className="mx-auto bg-black text-white p-2 font-black text-xl">B</div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden pt-8">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => {
                if (mobile) setMobileOpen(false);
              }}
              className={cn(
                "flex items-center gap-4 px-3 py-3 text-xs font-black uppercase tracking-widest transition-all group border-2 border-transparent",
                isActive 
                  ? "bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(31,41,55,0.4)]" 
                  : "text-gray-500 hover:bg-gray-50 hover:border-black",
                isCollapsed && !mobile && "justify-center px-0"
              )}
              title={item.name}
            >
              <div className={cn("shrink-0", isActive ? "text-white" : "text-black group-hover:scale-110 transition-transform")}>
                {iconMap[item.icon] || <span>{item.icon}</span>}
              </div>
              {(!isCollapsed || mobile) && (
                <span className="truncate">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t-2 border-black">
        <form action={logoutAction}>
          <button 
            type="submit" 
            className={cn(
              "w-full flex items-center gap-4 px-3 py-3 text-xs font-black uppercase tracking-widest text-red-600 border-2 border-transparent hover:border-red-600 hover:bg-red-50 transition-all",
              isCollapsed && !mobile && "justify-center px-0"
            )}
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {(!isCollapsed || mobile) && <span>Cerrar Sesión</span>}
          </button>
        </form>
      </div>

      {/* Toggle Button for Desktop */}
      {!mobile && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-24 bg-black text-white p-1 border-2 border-white rounded-full hover:scale-110 transition-transform z-50"
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
            <Button variant="outline" size="icon" className="border-2 border-black rounded-none bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-none">
            <SheetHeader className="sr-only">
              <SheetTitle>Menú de Navegación</SheetTitle>
              <SheetDescription>Acceso a las diferentes secciones del sistema</SheetDescription>
            </SheetHeader>
            <NavContent mobile={true} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden lg:flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out border-r-2 border-black bg-white z-[50]",
          isCollapsed ? "w-20" : "w-72"
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
