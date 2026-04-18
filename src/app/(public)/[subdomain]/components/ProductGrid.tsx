'use client';

import { usePosCart } from "@/store/CartProvider";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function ProductGrid({ products, tenant }: { products: any[], tenant: any }) {
  const brandColor = tenant.settings?.public_color || "#000000";
  const { addToCart } = usePosCart();

  const handleAddToCart = (product: any) => {
    addToCart(product);
    toast.success(`${product.name} agregado al carrito`, {
      description: "Puedes ver tu pedido en el icono de bolsa arriba.",
      position: "top-center",
      style: { borderRadius: '2px' }
    });
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
      {products.map((product) => (
        <div key={product.id} className="bg-white group flex flex-col border border-gray-100 p-2 md:p-4 hover:border-black transition-all duration-500">
          <div className="aspect-square bg-gray-50 relative overflow-hidden flex items-center justify-center border border-gray-100 group-hover:border-black/10 transition-colors">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <span className="text-4xl opacity-20">🛍️</span>
            )}

            {product.stock <= 3 && (
              <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-1.5 py-0.5  ">
                ¡Solo {product.stock}!
              </span>
            )}
            
            {/* Overlay button on hover for desktop */}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none md:pointer-events-auto">
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart(product);
                }}
                className="hidden md:flex bg-white text-black px-4 py-2 font-bold text-xs transform translate-y-4 group-hover:translate-y-0 transition-all shadow-xl hover:bg-primary hover:text-primary-foreground"
                style={{ borderRadius: '0px' }}
              >
                AGREGAR +
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col flex-1">
            <h3 className="font-bold text-gray-900 text-sm md:text-base leading-tight mb-1  tracking-tight truncate">
              {product.name}
            </h3>

            <p className="text-sm md:text-md font-medium text-gray-500 mb-4">
              RD$ {product.price?.toLocaleString()}
            </p>

            <div className="mt-auto md:hidden">
              <button 
                onClick={() => handleAddToCart(product)}
                className="w-full py-2 text-white text-xs font-bold  tracking-wider flex items-center justify-center gap-2"
                style={{ borderRadius: '0px', backgroundColor: brandColor }}
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
