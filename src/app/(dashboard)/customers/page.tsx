import { createClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import { Search, Users, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CustomerTable } from "@/modules/customers/components/CustomerTable";
import { CustomerFormDialog } from "@/modules/customers/components/CustomerFormDialog";

export default async function CustomersPage(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
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
    <div className="p-6 max-w-7xl mx-auto space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-gray-200 pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary text-primary-foreground">
                <Users className="w-5 h-5" />
             </div>
             <span className="text-xs font-semibold   text-gray-400">Directorio CRM</span>
          </div>
          <h1 className="text-6xl font-semibold    leading-none">Clientes</h1>
          <p className="text-gray-400 font-bold text-xs   pl-1">Gestión de cuentas y límites de crédito</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          <form className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
            <input 
                name="q"
                defaultValue={query}
                placeholder="BUSCAR POR NOMBRE O RNC..." 
                className="pl-10 h-12 w-full md:w-80 rounded-xl border border-gray-200 focus:outline-none focus:ring-0 text-xs font-semibold   placeholder:text-gray-300"
            />
          </form>
          
          <CustomerFormDialog />
        </div>
      </div>

      <div className="border border-gray-200 bg-white shadow-sm rounded-xl overflow-hidden">
        <CustomerTable customers={customers || []} />
      </div>
    </div>
  );
}
