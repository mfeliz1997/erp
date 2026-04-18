'use client';

import Link from "next/link";
import { usePosCart } from "@/store/CartProvider";
import { ShoppingBag } from "lucide-react";

export function PublicHeader({ tenant, onCartClick }: { tenant: any, onCartClick: () => void }) {
  const { cart } = usePosCart();
  const itemCount = cart.reduce((acc, item) => acc + item.cartQuantity, 0);

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="h-9 w-9 rounded-none object-cover border border-gray-200" />
          ) : (
            <div className="h-9 w-9 rounded-none bg-black text-white flex items-center justify-center font-black text-lg shadow-inner">
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-bold text-xl tracking-tight text-gray-900 uppercase">{tenant.name}</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-600 mr-4">
            <Link href="/" className="hover:text-black">Catálogo</Link>
          </nav>

          <button 
            onClick={onCartClick}
            className="relative p-2.5 bg-white rounded-none hover:bg-gray-50 transition-colors border border-black group"
          >
            <ShoppingBag className="w-5 h-5 text-black group-hover:scale-110 transition-transform" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-none border border-white">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
