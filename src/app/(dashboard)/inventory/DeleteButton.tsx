"use client";

import { useActionState } from "react";
import { softDeleteProductAction } from "@/modules/inventory/actions";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteButton({ productId }: { productId: string }) {
  const [state, formAction, isPending] = useActionState(softDeleteProductAction, undefined);

  const handleSubmit = (payload: FormData) => {
    if (window.confirm("⚠️ ¿Deseas enviar este producto a la papelera? Se mantendrá en registros históricos pero no aparecerá en ventas.")) {
      formAction(payload);
    }
  };

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="id" value={productId} />
      <button 
        type="submit" 
        disabled={isPending}
        className="flex items-center gap-2 px-3 py-2 border border-transparent hover:border-red-600 hover:bg-red-50 text-red-600 transition-all active:scale-95 disabled:opacity-50"
        title="Eliminar producto"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Trash2 className="w-4 h-4" />
            <span className="lg:hidden text-[10px] font-black uppercase tracking-widest">Eliminar</span>
          </>
        )}
      </button>
    </form>
  );
}