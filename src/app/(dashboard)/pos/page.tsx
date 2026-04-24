import { createClient } from "@/lib/supabase";
import PosTerminal from "./PosTerminal";
import { Product } from "@/types/inventory";
import Link from "next/link";
import { Monitor } from "lucide-react";

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
    .select('role, can_give_credit, max_credit_days, can_use_card, can_use_transfer, can_sell_without_shift')
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

  // Bloquear si no tiene turno y no tiene permiso especial
  if (!hasOpenShift && !canSellWithoutShift && !isAdmin) {
    return (
      <div className="fixed inset-0 lg:static lg:h-full lg:w-full bg-background flex items-center justify-center">
        <div className="max-w-sm w-full mx-4 p-8 border border-border bg-card rounded-xl text-center space-y-5">
          <div className="p-4 bg-muted rounded-full w-fit mx-auto">
            <Monitor className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-foreground">Caja no abierta</h2>
            <p className="text-sm text-muted-foreground">
              Debes abrir un turno de caja antes de poder vender.
            </p>
          </div>
          <Link
            href="/cash-register"
            className="block w-full h-11 rounded-xl bg-foreground text-background text-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            Ir a Caja Registradora
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 lg:static lg:h-full lg:w-full bg-background overflow-hidden dashboard-page">
      <PosTerminal
        initialProducts={(products as Product[]) || []}
        profile={profile}
        openShiftName={(openShift?.cash_registers as any)?.name ?? null}
      />
    </div>
  );
}