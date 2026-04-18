import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import { formatProductMetadata, Product } from '@/types/inventory'; 
import { DeleteButton } from './DeleteButton';
import { ImportModal } from '@/modules/inventory/components/ImportModal';
import { Search, Package, Settings } from "lucide-react";

// Next.js 15: searchParams es una promesa
export default async function InventoryPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ filter?: string }> 
}) {
  const supabase = await createClient();
  const sp = await searchParams;
  const currentFilter = sp.filter || 'all';

  // 1. Obtener Sesión y Rol (Para ocultar costos a empleados)
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single();

  const isAdmin = profile?.role === 'admin';

 

    // En tu page de inventario:
  const isTrash = currentFilter === 'trash';

  const { data: products,error } = await supabase
    .from('products')
    .select('*')
    .eq('is_deleted', isTrash) // Muestra activos, o muestra la papelera
    .order('created_at', { ascending: false });



    
  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error al cargar el inventario: {error.message}
      </div>
    );
  }

  let inventory = (products as Product[]) || [];

  // 3. Lógica de Filtros (Agotados / Bajo Stock)
  if (currentFilter === 'out_of_stock') {
    inventory = inventory.filter(p => p.stock === 0);
  } else if (currentFilter === 'low_stock') {
    // Filtra los que tienen stock mayor a 0 pero igual o menor a su umbral de alerta
    inventory = inventory.filter(p => p.stock > 0 && p.stock <= (p.min_stock_alert || 10));
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10 pb-20">
      {/* Encabezado y Acciones (Baja Fricción) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b-4 border-black pb-8">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Inventario</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            Gestión centralizada de existencias y costos
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <ImportModal />
          <Link 
            href="/inventory/new" 
            className="flex-1 md:flex-none bg-black text-white px-6 py-3 rounded-none text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            + Nuevo Producto
          </Link>
        </div>
      </div>

      {/* Buscador y Pestañas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <form className="relative flex-1 group">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black transition-transform group-focus-within:scale-110" />
           <input 
              name="q"
              defaultValue={""}
              placeholder="BUSCAR PRODUCTO POR NOMBRE O CÓDIGO..." 
              className="w-full pl-12 h-14 border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all font-black uppercase tracking-widest text-xs placeholder:text-gray-200"
           />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/inventory" className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border-2 border-black transition-all ${currentFilter === 'all' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}`}>
            Todos
          </Link>
          <Link href="/inventory?filter=low_stock" className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border-2 border-black transition-all ${currentFilter === 'low_stock' ? 'bg-yellow-400 text-black' : 'bg-white text-black hover:bg-gray-50'}`}>
            Bajo Stock
          </Link>
          <Link href="/inventory?filter=out_of_stock" className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border-2 border-black transition-all ${currentFilter === 'out_of_stock' ? 'bg-red-600 text-white' : 'bg-white text-black hover:bg-gray-50'}`}>
            Agotados
          </Link>
        </div>
      </div>

      {/* Vista de Escritorio (Tabla) */}
      <div className="hidden lg:block border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-black">
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-black w-20">Foto</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-black">Identificación</th>
              {isAdmin && <th className="p-4 text-[10px] font-black uppercase tracking-widest text-black">Costo</th>}
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-black">Precio Venta</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-black">Estado Stock</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-black text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {inventory.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="p-16 text-center text-[10px] font-black uppercase text-gray-400 italic">
                  No se han encontrado registros
                </td>
              </tr>
            ) : (
              inventory.map((item) => {
                const isOutOfStock = item.stock === 0;
                const isLowStock = item.stock > 0 && item.stock <= (item.min_stock_alert || 10);

                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="h-12 w-12 border-2 border-black overflow-hidden flex items-center justify-center bg-gray-100">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="w-6 h-6 text-gray-300" />
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-xs font-black uppercase tracking-tighter line-clamp-1">{item.name}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">
                        {item.type} 
                        {formatProductMetadata(item.type, item.metadata) && ` • ${formatProductMetadata(item.type, item.metadata)}`}
                      </p>
                    </td>
                    {isAdmin && (
                      <td className="p-4 text-xs font-bold text-gray-500">
                        {item.cost_price ? `RD$ ${item.cost_price.toLocaleString()}` : '---'}
                      </td>
                    )}
                    <td className="p-4 text-sm font-black italic">RD$ {item.price.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border 
                        ${isOutOfStock ? 'bg-red-50 text-red-700 border-red-200' : 
                          isLowStock ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 
                          'bg-green-50 text-green-700 border-green-200'}`}
                      >
                        {isOutOfStock ? 'AGOTADO' : `${item.stock} UNIDADES`}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                        {(isAdmin || profile?.role === 'inventory') && (
                           <Link href={`/inventory/${item.id}/edit`} className="p-2 border border-black hover:bg-black hover:text-white">
                             <Settings className="w-4 h-4" />
                           </Link>
                        )}
                        <DeleteButton productId={item.id} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Vista de Móvil (Grid de Tarjetas) */}
      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
        {inventory.length === 0 ? (
          <div className="col-span-full p-20 text-center border-4 border-dashed border-gray-100 font-black uppercase text-gray-300 tracking-widest">
            Sin resultados
          </div>
        ) : (
          inventory.map((item) => {
            const isOutOfStock = item.stock === 0;
            const isLowStock = item.stock > 0 && item.stock <= (item.min_stock_alert || 10);

            return (
              <div key={item.id} className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6 relative overflow-hidden">
                <div className="flex items-start gap-6">
                  <div className="h-20 w-20 border-2 border-black shrink-0 bg-gray-50 flex items-center justify-center overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-gray-200" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-black text-lg uppercase tracking-tighter italic leading-none">{item.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {item.type} {formatProductMetadata(item.type, item.metadata) && ` • ${formatProductMetadata(item.type, item.metadata)}`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-y-2 border-black border-dashed py-6">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Precio Venta</p>
                    <p className="font-black text-xl italic">RD$ {item.price.toLocaleString()}</p>
                  </div>
                  {isAdmin && (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Costo</p>
                      <p className="font-bold text-sm text-gray-500">RD$ {item.cost_price?.toLocaleString() || '---'}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]
                    ${isOutOfStock ? 'bg-red-600 text-white' : 
                      isLowStock ? 'bg-yellow-400 text-black' : 
                      'bg-green-500 text-white'}`}
                  >
                    {isOutOfStock ? 'AGOTADO' : `${item.stock} UNIDADES`}
                  </span>

                  <div className="flex items-center gap-2">
                    {(isAdmin || profile?.role === 'inventory') && (
                      <Link href={`/inventory/${item.id}/edit`} className="p-3 border-2 border-black bg-black text-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                        <Settings className="w-5 h-5" />
                      </Link>
                    )}
                    <DeleteButton productId={item.id} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}