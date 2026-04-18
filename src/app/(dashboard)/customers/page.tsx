import { createClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CustomerTable } from "@/modules/customers/components/CustomerTable";
import { CustomerFormDialog } from "@/modules/customers/components/CustomerFormDialog";

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = searchParams.q || "";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Obtener clientes con búsqueda básica
  let fetchQuery = supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .order("name", { ascending: true });

  if (query) {
    fetchQuery = fetchQuery.or(`name.ilike.%${query}%,tax_id.ilike.%${query}%`);
  }

  const { data: customers } = await fetchQuery;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-zinc-400" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 leading-none">CRM</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">Clientes</h1>
          <p className="text-slate-400 font-medium mt-2 text-sm uppercase tracking-widest">Directorio de Cuentas y Créditos</p>
        </div>

        <div className="flex items-center gap-4">
          <form className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
                name="q"
                defaultValue={query}
                placeholder="Buscar cliente..." 
                className="pl-10 h-10 w-64 rounded-none border-zinc-200 focus-visible:ring-black"
            />
          </form>
          
          <CustomerFormDialog />
        </div>
      </div>

      <CustomerTable customers={customers || []} />
    </div>
  );
}
