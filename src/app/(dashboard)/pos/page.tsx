import { createClient } from "@/lib/supabase";
import PosTerminal from "./PosTerminal";
import { Product } from "@/types/inventory";

export default async function PosPage() {
  const supabase = await createClient();

  // RSC: Traemos todos los productos (incluso los de stock 0)
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, can_sell_on_credit, max_credit_days')
    .eq('id', user?.id)
    .single();

  return (
    <div className="fixed inset-0 lg:static lg:h-full lg:w-full bg-background overflow-hidden dashboard-page">
      <PosTerminal 
        initialProducts={(products as Product[]) || []} 
        profile={profile}
      />
    </div>
  );
}