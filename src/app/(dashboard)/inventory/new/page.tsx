"use client";

import { useActionState, useState, useEffect, startTransition, useRef } from "react";
import { getAllowedCategories, ProductType } from "@/types/inventory";
import { createProductAction } from "@/modules/inventory/actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTenant } from "@/providers/tenant-provider";
import imageCompression from "browser-image-compression";
import { NumericFormat } from "react-number-format";

const initialState = { success: false, error: undefined, data: undefined };

export default function NewProductPage() {
  const [state, formAction, isPending] = useActionState(createProductAction, initialState);
  const router = useRouter();
  
  const { tenant, isLoading } = useTenant(); 
  const categories = getAllowedCategories(tenant?.business_type);
  
const [selectedType, setSelectedType] = useState<ProductType>("general");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  
  // NUEVO: Candado de seguridad anti-doble-click
  const submitLock = useRef(false);

  useEffect(() => {
    if (!isLoading && categories.length > 0) {
      setSelectedType(categories[0].value);
    }
  }, [isLoading, categories]);

  // ACTUALIZADO: Manejo del éxito y desbloqueo si hay error
  useEffect(() => {
    if (state.success) {
      router.push("/inventory");
    } else if (state.error) {
 
      submitLock.current = false; 
    }
  }, [state.success, state.error, router]);
  

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  // --- INTERCEPTOR DEL FORMULARIO ---
const handleSubmit = async (formData: FormData) => {
    // 1. REGLA DE SEGURIDAD: Si ya se está enviando, abortar ejecución
    if (submitLock.current) return; 
    
    // 2. Bloqueamos instantáneamente los siguientes clicks
    submitLock.current = true; 

    const imageFile = formData.get("image") as File;

    if (imageFile && imageFile.size > 1024 * 1024) {
      setIsCompressing(true);
      try {
        const options = {
          maxSizeMB: 1, 
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(imageFile, options);
        formData.set("image", compressedFile, imageFile.name);
      } catch (error) {
        console.error("Error al comprimir la imagen:", error);
        submitLock.current = false; // Liberar candado si falla la compresión
      } finally {
        setIsCompressing(false);
      }
    }

    startTransition(() => {
      formAction(formData);
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-pulse">
        <div className="h-12 bg-gray-200 rounded-lg w-1/3 mb-8"></div>
        <div className="h-96 bg-white border border-gray-100 rounded-2xl p-8">
           <div className="h-10 bg-gray-200 rounded-xl mb-6"></div>
           <div className="h-40 bg-gray-200 rounded-xl mb-6"></div>
           <div className="h-12 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Nuevo Producto</h1>
          <p className="text-sm text-gray-500 mt-1">Registra inventario para tu negocio.</p>
        </div>
        <Link 
          href="/inventory" 
          className="text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors border border-gray-200"
        >
          ← Volver al Inventario
        </Link>
      </div>

      <form action={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-8">
        
        {!state.success && state.error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl text-sm font-medium flex items-center">
            <span className="mr-2">⚠️</span> {state.error}
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-900">Fotografía Principal</label>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gray-50 rounded-xl border-2 border-solid border-gray-200 flex items-center justify-center overflow-hidden transition-all hover:border-gray-300">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-xs font-medium">Subir foto</span>
              )}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">Categoría</label>
            <select 
              name="type" 
              required 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ProductType)}
              className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-black focus:border-transparent text-sm outline-none transition-all shadow-sm"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">Nombre del Producto</label>
            <input 
              type="text" 
              name="name" 
              required 
              placeholder="Ej. iPhone 15 Pro Max"
              className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-black focus:border-transparent text-sm outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {selectedType === "vehicle" && (
          <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
            <label className="block text-sm font-semibold text-gray-900">Chasis (VIN)</label>
            <input 
              type="text" 
              name="chasis" 
              required 
              placeholder="17 caracteres alfanuméricos"
              className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent text-sm outline-none transition-all"
            />
          </div>
        )}
        
        {selectedType === "mobile" && (
          <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
            <label className="block text-sm font-semibold text-gray-900">Número IMEI</label>
            <input 
              type="text" 
              name="imei" 
              required 
              placeholder="IMEI de 15 dígitos"
              className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent text-sm outline-none transition-all"
            />
          </div>
        )}
 
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50/50 rounded-xl border border-gray-100">
  <div className="space-y-2">
    <label className="block text-sm font-semibold text-gray-900">Precio de Costo</label>
    <NumericFormat 
      name="cost_price" 
      thousandSeparator="," 
      prefix="$ " 
      decimalScale={2}
      fixedDecimalScale
      placeholder="$ 0.00"
      className="w-full border border-gray-200 rounded-xl py-3 px-3 bg-white focus:ring-2 focus:ring-black outline-none text-sm shadow-sm"
    />
  </div>
  <div className="space-y-2">
    <label className="block text-sm font-semibold text-gray-900">Precio de Venta</label>
    <NumericFormat 
      name="price" 
      required
      thousandSeparator="," 
      prefix="$ " 
      decimalScale={2}
      fixedDecimalScale
      placeholder="$ 0.00"
      className="w-full border border-gray-200 rounded-xl py-3 px-3 bg-white focus:ring-2 focus:ring-black outline-none text-sm shadow-sm"
    />
  </div>
</div>
        
        <div className="flex items-center gap-4 p-5 bg-blue-50 border border-blue-100 rounded-xl">
          <input 
            type="checkbox" 
            id="is_public" 
            name="is_public" 
            defaultChecked
            className="w-6 h-6 text-blue-600 rounded border-gray-300 bg-white focus:ring-blue-500 cursor-pointer"
          />
          <div className="flex flex-col">
            <label htmlFor="is_public" className="text-sm font-bold text-blue-900 cursor-pointer">
              Mostrar en el Catálogo Público
            </label>
            <span className="text-xs text-blue-700">El producto aparecerá en tu página web (requiere Stock mayor a 0).</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">Stock Inicial</label>
            <input 
              type="number" 
              name="stock" 
              required min="0" placeholder="0"
              className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-black focus:border-transparent text-sm outline-none shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">Alerta de Stock Bajo</label>
            <input 
              type="number" 
              name="min_stock_alert" 
              defaultValue="5" min="1"
              className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-black focus:border-transparent text-sm outline-none shadow-sm"
            />
          </div>
        </div>

        <div className="pt-4">
          <button 
            type="submit" 
            disabled={isPending || isLoading || isCompressing}
            className="w-full bg-primary text-primary-foreground p-3.5 rounded-xl hover:bg-gray-800 transition-all font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm flex justify-center items-center gap-2"
          >
            {(isPending || isCompressing) ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isCompressing ? "Optimizando imagen..." : "Guardando..."}
              </>
            ) : 'Crear Producto'}
          </button>
        </div>
      </form>
    </div>
  );
}