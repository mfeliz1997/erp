"use client";

import { useActionState, useState } from "react";
import { updateProductAction } from "@/modules/inventory/actions";
import imageCompression from "browser-image-compression";
import { NumericFormat } from "react-number-format";

// 1. Añadimos image_url al tipo
type ProductProps = {
  id: string;
  name: string;
  price: number;
  stock: number;
  min_stock_alert: number;
  image_url?: string | null;
  metadata?: any;
};

const initialState = { success: false, error: undefined, data: undefined };

export function EditProductForm({ product }: { product: ProductProps }) {
  const [state, formAction, isPending] = useActionState(updateProductAction, initialState);
  
  // 2. Estados para manejar la imagen y la compresión
  const [imagePreview, setImagePreview] = useState<string | null>(product.image_url || null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Muestra la vista previa al seleccionar una nueva foto
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImagePreview(file ? URL.createObjectURL(file) : product.image_url || null);
  };

  // 3. Interceptor escalable: Comprime la imagen antes de enviarla
  const handleSubmit = async (formData: FormData) => {
    const imageFile = formData.get("image") as File;

    if (imageFile && imageFile.size > 1024 * 1024) { // Si pesa más de 1MB
      setIsCompressing(true);
      try {
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
        const compressedFile = await imageCompression(imageFile, options);
        formData.set("image", compressedFile, imageFile.name);
      } catch (error) {
        console.error("Error al comprimir la imagen:", error);
      } finally {
        setIsCompressing(false);
      }
    }
    formAction(formData);
  };

  return (
    // Reemplazamos action={formAction} por nuestro interceptor action={handleSubmit}
    <form action={handleSubmit} className="space-y-6">
      
      {!state.success && state.error && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-100 text-sm rounded-xl font-medium flex items-center">
          <span className="mr-2">⚠️</span> {state.error}
        </div>
      )}
      {state.success && state.data && (
        <div className="p-4 bg-green-50 text-green-700 border border-green-100 text-sm rounded-xl font-medium flex items-center">
          <span className="mr-2">✓</span> {state.data}
        </div>
      )}

      <input type="hidden" name="id" value={product.id} />

      {/* 4. UI del Input de Imagen (Consistente con la vista de crear) */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-900">Fotografía Principal</label>
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-gray-50 rounded-xl border-2 border-solid border-gray-200 flex items-center justify-center overflow-hidden transition-all hover:border-gray-300 relative group">
            {imagePreview ? (
              <img src={imagePreview} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-400 text-xs font-medium text-center">Sin<br/>Foto</span>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-bold">Cambiar</span>
            </div>
          </div>
          <input 
            type="file" 
            name="image" 
            accept="image/*" 
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-900 hover:file:bg-gray-100 transition-colors cursor-pointer"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-900">Nombre</label>
        <input name="name" defaultValue={product.name} required className="w-full p-3 bg-white border border-gray-200 shadow-sm rounded-xl text-sm focus:ring-2 focus:ring-black outline-none transition-all" />
      </div>

 <div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <label className="block text-sm font-semibold mb-2 text-gray-900">Precio Venta (RD$)</label>
    <NumericFormat 
      name="price"
      defaultValue={product.price}
      thousandSeparator="," 
      prefix="$ " 
      decimalScale={2}
      fixedDecimalScale
      required
      className="w-full p-3 bg-white border border-gray-200 shadow-sm rounded-xl text-sm focus:ring-2 focus:ring-black outline-none transition-all"
    />
  </div>
  <div className="space-y-2">
    <label className="block text-sm font-semibold mb-2 text-gray-900">Stock Actual</label>
    <input 
      name="stock" 
      type="number" 
      defaultValue={product.stock} 
      required 
      className="w-full p-3 bg-white border border-gray-200 shadow-sm rounded-xl text-sm focus:ring-2 focus:ring-black outline-none transition-all" 
    />
  </div>
</div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-900">Avisar si quedan menos de:</label>
        <input name="min_stock_alert" type="number" defaultValue={product.min_stock_alert} required className="w-full p-3 bg-white border border-gray-200 shadow-sm rounded-xl text-sm focus:ring-2 focus:ring-black outline-none transition-all" />
      </div>

      <div className="flex items-center gap-4 p-5 bg-blue-50 border border-blue-100 rounded-xl">
        <input 
          type="checkbox" 
          id="is_public" 
          name="is_public" 
          defaultChecked={product.metadata?.is_public === true}
          className="w-6 h-6 text-blue-600 rounded border-gray-300 bg-white focus:ring-blue-500 cursor-pointer"
        />
        <div className="flex flex-col">
          <label htmlFor="is_public" className="text-sm font-bold text-blue-900 cursor-pointer">
            Mostrar en el Catálogo Público
          </label>
          <span className="text-xs text-blue-700">El producto aparecerá en tu página web (requiere Stock mayor a 0).</span>
        </div>
      </div>

      <div className="pt-4">
        <button 
          type="submit" 
          disabled={isPending || isCompressing}
          className="w-full bg-primary text-primary-foreground p-3.5 rounded-xl font-semibold hover:bg-gray-800 disabled:bg-gray-300 transition-all flex justify-center items-center gap-2 shadow-sm"
        >
          {(isPending || isCompressing) && (
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isCompressing ? "Optimizando..." : isPending ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>
    </form>
  );
}