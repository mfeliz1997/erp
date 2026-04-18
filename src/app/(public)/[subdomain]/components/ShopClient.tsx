'use client';

import { useState } from "react";
import { PublicHeader } from "./PublicHeader";
import { ProductGrid } from "./ProductGrid";
import { CartDrawer } from "./CartDrawer";
import { CartProvider } from "@/store/CartProvider";

export function ShopClient({ products, tenant }: { products: any[], tenant: any }) {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <CartProvider>
      <div className="min-h-screen bg-white">
        <PublicHeader 
            tenant={tenant} 
            onCartClick={() => setIsCartOpen(true)} 
        />
        
        <main className="max-w-6xl mx-auto px-4 py-8 md:py-16">
          <div className="mb-12">
            <h1 className="text-4xl md:text-6xl font-semibold   mb-4 leading-none">
                Nuestro <span className="text-gray-400">Catálogo</span>
            </h1>
            <p className="text-gray-500 max-w-xl font-medium">
              Explora nuestra selección exclusiva de productos. Agrega lo que te guste al carrito y finaliza tu pedido vía WhatsApp.
            </p>
          </div>

          {products.length === 0 ? (
            <div className="py-20 text-center border-2 border-solid border-gray-100 rounded-sm">
              <p className="text-gray-400 font-bold  ">No hay productos disponibles por el momento</p>
            </div>
          ) : (
            <ProductGrid products={products} tenant={tenant} />
          )}
        </main>

        <footer className="border-t border-gray-100 py-12 mt-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
               <div className="h-8 w-8 rounded-sm bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                  {tenant.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-bold  tracking-tight">{tenant.name}</span>
            </div>
            <p className="text-gray-400 text-xs font-medium  ">
                Powered by Invenza ERP &copy; {new Date().getFullYear()}
            </p>
          </div>
        </footer>

        <CartDrawer 
            isOpen={isCartOpen} 
            onClose={() => setIsCartOpen(false)} 
            tenant={tenant}
        />
      </div>
    </CartProvider>
  );
}
