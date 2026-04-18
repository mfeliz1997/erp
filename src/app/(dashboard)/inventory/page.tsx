import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import { formatProductMetadata, Product } from '@/types/inventory'; 
import { DeleteButton } from './DeleteButton';
import { ImportModal } from '@/modules/inventory/components/ImportModal';

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
    <div className="space-y-6">
      {/* Encabezado y Acciones (Baja Fricción) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona tus productos, niveles de stock y precios.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <ImportModal />
          <Link 
            href="/inventory/new" 
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            + Nuevo Producto
          </Link>
        </div>
      </div>

      {/* Pestañas de Filtro Rápidas */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/inventory" className={`px-4 py-2 rounded-full font-medium ${currentFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Todos
        </Link>
        <Link href="/inventory?filter=low_stock" className={`px-4 py-2 rounded-full font-medium ${currentFilter === 'low_stock' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Bajo Stock
        </Link>
        <Link href="/inventory?filter=out_of_stock" className={`px-4 py-2 rounded-full font-medium ${currentFilter === 'out_of_stock' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Agotados
        </Link>
      </div>

      {/* Tabla de Datos Moderna */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-sm font-semibold text-gray-600 w-16">Foto</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Nombre</th>
                {isAdmin && <th className="p-4 text-sm font-semibold text-gray-600">Costo (Privado)</th>}
                <th className="p-4 text-sm font-semibold text-gray-600">Precio Venta</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Stock</th>
                <th className="p-4 text-sm font-semibold text-gray-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="p-12 text-center text-gray-500">
                    No se encontraron productos con estos filtros.
                  </td>
                </tr>
              ) : (
                inventory.map((item) => {
                  const isOutOfStock = item.stock === 0;
                  const isLowStock = item.stock > 0 && item.stock <= (item.min_stock_alert || 10);

                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      {/* FOTO (Placeholder por ahora) */}
                      <td className="p-4">
                        <div className="h-10 w-10 bg-gray-200 rounded-md overflow-hidden flex items-center justify-center">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs text-gray-400">Img</span>
                          )}
                        </div>
                      </td>

                      {/* NOMBRE Y DETALLES */}
                  <td className="p-4">
  <p className="text-sm font-bold text-gray-900">{item.name}</p>
  <p className="text-xs text-gray-500 mt-0.5 capitalize">
    {item.type} 
    {/* La UI solo llama a la función, no le importa si es chasis, imei o lote de medicina */}
    {formatProductMetadata(item.type, item.metadata) && ` • ${formatProductMetadata(item.type, item.metadata)}`}
  </p>
</td>

                      {/* COSTO PRIVADO (Solo Admin) */}
                      {isAdmin && (
                        <td className="p-4 text-sm text-gray-500 font-medium">
                          {item.cost_price ? `RD$ ${item.cost_price.toLocaleString('es-DO')}` : 'N/D'}
                        </td>
                      )}

                      {/* PRECIO PÚBLICO */}
                      <td className="p-4 text-sm text-gray-900 font-bold">
                        RD$ {item.price.toLocaleString('es-DO')}
                      </td>

                      {/* STOCK Y ALERTAS VISUALES */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold 
                            ${isOutOfStock ? 'bg-red-100 text-red-700' : 
                              isLowStock ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-700'}`}
                          >
                            {isOutOfStock ? 'AGOTADO' : `${item.stock} en stock`}
                          </span>
                          {isLowStock && (
                            <span title={`Alerta: Menos de ${item.min_stock_alert || 10} unidades`} className="text-yellow-600 font-bold text-sm">
                              ⚠️
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ACCIONES DE PERMISOS */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* El botón de editar lo puedes llevar a otra vista dinámica */}
                          {(isAdmin || profile?.role === 'inventory') && (
                             <Link href={`/inventory/${item.id}/edit`} className="text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 bg-blue-50 rounded">
                               Editar
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
      </div>
    </div>
  );
}