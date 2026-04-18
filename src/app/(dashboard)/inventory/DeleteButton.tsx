"use client";

import { useActionState } from "react";
import { softDeleteProductAction } from "@/modules/inventory/actions";

export function DeleteButton({ productId }: { productId: string }) {
  const [state, formAction, isPending] = useActionState(softDeleteProductAction, undefined);

  const handleSubmit = (payload: FormData) => {
    if (window.confirm("⚠️ ¿Estás seguro? El producto se marcará como eliminado pero se mantendrá en registros históricos.")) {
      formAction(payload);
    }
  };

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="id" value={productId} />
      <button 
        type="submit" 
        disabled={isPending}
        className="text-red-600 hover:text-red-800 text-xs font-medium"
      >
        {isPending ? "Eliminando..." : "Eliminar"}
      </button>
    </form>
  );
}