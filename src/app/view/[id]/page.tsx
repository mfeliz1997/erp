import { createClient } from "@/lib/supabase";
import { notFound } from "next/navigation";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch de la factura (Nota: requiere política RLS pública en tu BD)
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, tenants(name, rnc, logo_url)")
    .eq("id", id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  // Desestructuramos para mayor limpieza
  const tenant = invoice.tenants;
  const items = invoice.items || []; // Asumiendo que guardas los items en un JSONB

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-sm w-full rounded-xl shadow-lg overflow-hidden border border-slate-200">
        
        {/* Header del Ticket */}
        <div className="bg-slate-900 p-6 text-center text-white">
          <h1 className="text-2xl font-bold">{tenant.name || 'Negocio'}</h1>
          {/* <p className="text-sm text-slate-400 mt-1">RNC: {tenant.rnc || 'N/A'}</p> */}
        </div>

        {/* Info Fiscal */}
        <div className="p-6 border-b border-solid border-slate-300 bg-slate-50">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-500">Fecha:</span>
            <span className="font-medium">{new Date(invoice.created_at).toLocaleDateString()}</span>
          </div>
          {/* 
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-500">NCF:</span>
            <span className="font-mono font-medium text-slate-800">{invoice.ncf || 'Consumidor Final'}</span>
          </div>
          */}
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Factura ID:</span>
            <span className="font-mono text-xs text-slate-400">{invoice.id.split('-')[0]}</span>
          </div>
        </div>

        {/* Productos */}
        <div className="p-6">
          <h3 className="text-xs font-bold  tracking-wider text-slate-400 mb-4">Artículos</h3>
          <ul className="space-y-3">
            {items.map((item: any, i: number) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-slate-700">
                  {item.qty}x {item.name}
                </span>
                <span className="font-medium">RD$ {(item.price * item.qty).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Total */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-slate-700">TOTAL</span>
            <span className="text-2xl font-semibold text-green-600">
              RD$ {invoice.total_amount?.toLocaleString() || '0.00'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 text-center text-xs text-slate-400">
          <p>Comprobante generado por Invenza ERP</p>
        </div>
      </div>
    </main>
  );
}