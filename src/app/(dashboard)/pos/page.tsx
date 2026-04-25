import { createClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import PosTerminal from "./PosTerminal";
import { Product } from "@/types/inventory";
import { getDiscountsAction } from "@/modules/discounts/actions";

export default async function PosPage() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, can_give_credit, max_credit_days, can_use_card, can_use_transfer, can_sell_without_shift, can_apply_discount')
    .eq('id', user?.id)
    .single();

  // Verificar si tiene turno abierto
  const { data: openShift } = await supabase
    .from('cash_shifts')
    .select('id, cash_registers(name)')
    .eq('user_id', user?.id ?? '')
    .eq('status', 'OPEN')
    .single();

  const isAdmin = profile?.role === 'admin';
  const hasOpenShift = !!openShift;
  const canSellWithoutShift = profile?.can_sell_without_shift ?? false;

  const discounts = await getDiscountsAction();

  // Sin turno abierto → ir a caja a abrirlo
  if (!hasOpenShift && !canSellWithoutShift && !isAdmin) {
    redirect('/cash-register');
  }

  return (
    <div className="fixed inset-0 lg:static lg:h-full lg:w-full bg-background overflow-hidden dashboard-page">
      <PosTerminal
        initialProducts={(products as Product[]) || []}
        profile={profile}
        openShiftName={(openShift?.cash_registers as any)?.name ?? null}
        discounts={discounts}
      />
    </div>
  );
}