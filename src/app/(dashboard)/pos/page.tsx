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

  return (
    <div className="h-full w-full">
      <PosTerminal initialProducts={(products as Product[]) || []} />
    </div>
  );
}