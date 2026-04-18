import { createClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EditProductForm } from "./EditProductForm";

// Next.js 15: params es tratado como una promesa asíncrona
export default async function EditProductPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const supabase = await createClient();
  
  // Fetch Server-First veloz (Añadimos image_url)
  const { data: product } = await supabase
    .from("products")
    .select("id, name, price, stock, min_stock_alert, image_url, metadata")
    .eq("id", id)
    .single();

  if (!product) redirect("/inventory");

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Editar: {product.name}</h1>
        <Link href="/inventory" className="text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors border border-gray-200">
          ← Volver
        </Link>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
        <EditProductForm product={product} />
      </div>
    </div>
  );
}