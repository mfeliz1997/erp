import { createClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { ShieldCheck, Tag } from "lucide-react";
import { getDiscountsAction } from "@/modules/discounts/actions";
import { DiscountManager } from "@/modules/discounts/components/DiscountManager";

export default async function DiscountsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <ShieldCheck className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-semibold">Acceso Restringido</h2>
        <p className="text-sm font-bold text-gray-400 text-center">
          Solo administradores pueden gestionar descuentos.
        </p>
      </div>
    );
  }

  const discounts = await getDiscountsAction();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
        <div className="p-2 bg-primary text-primary-foreground">
          <Tag className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold leading-none">Descuentos</h1>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            Configura los descuentos disponibles en el punto de venta
          </p>
        </div>
      </div>

      <DiscountManager initialDiscounts={discounts} />
    </div>
  );
}
