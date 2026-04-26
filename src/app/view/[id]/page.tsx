import { createClient } from "@/lib/supabase";
import { notFound } from "next/navigation";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, tenants(name, rnc, logo_url)")
    .eq("id", id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  const { data: items } = await supabase
    .from("invoice_items")
    .select("product_name, quantity, unit_price, total")
    .eq("invoice_id", id);

  const tenant = invoice.tenants;

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-sm w-full rounded-xl shadow-lg overflow-hidden border border-slate-200">

        {/* Header */}
        <div className="bg-slate-900 p-6 text-center text-white">
          <h1 className="text-2xl font-bold">{tenant?.name || "Negocio"}</h1>
          {tenant?.rnc && (
            <p className="text-sm text-slate-400 mt-1">RNC: {tenant.rnc}</p>
          )}
        </div>

        {/* Info Fiscal */}
        <div className="p-6 border-b border-slate-300 bg-slate-50">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-500">Fecha:</span>
            <span className="font-medium">
              {new Date(invoice.created_at).toLocaleDateString("es-DO")}
            </span>
          </div>
          {invoice.ncf && invoice.ncf !== "RECIBO-INTERNO" && (
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">NCF:</span>
              <span className="font-mono font-medium text-slate-800">
                {invoice.ncf}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Factura:</span>
            <span className="font-mono text-xs text-slate-400">
              #{invoice.id.split("-")[0].toUpperCase()}
            </span>
          </div>
          {invoice.customer_name && (
            <div className="flex justify-between text-sm mt-2">
              <span className="text-slate-500">Cliente:</span>
              <span className="font-medium">{invoice.customer_name}</span>
            </div>
          )}
        </div>

        {/* Productos */}
        <div className="p-6">
          <h3 className="text-xs font-bold tracking-wider text-slate-400 mb-4">
            ARTÍCULOS
          </h3>
          {items && items.length > 0 ? (
            <ul className="space-y-3">
              {items.map((item, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-slate-700">
                    {item.quantity}x {item.product_name}
                  </span>
                  <span className="font-medium">
                    RD$ {item.total.toLocaleString("es-DO")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 text-center">Sin artículos</p>
          )}
        </div>

        {/* Subtotal / Descuento */}
        {invoice.discount_amount > 0 && (
          <div className="px-6 pb-2 border-t border-slate-100">
            <div className="flex justify-between text-sm mt-3">
              <span className="text-slate-500">Subtotal:</span>
              <span>RD$ {invoice.subtotal?.toLocaleString("es-DO")}</span>
            </div>
            <div className="flex justify-between text-sm mt-1 text-red-500">
              <span>Descuento{invoice.discount_name ? ` (${invoice.discount_name})` : ""}:</span>
              <span>- RD$ {invoice.discount_amount.toLocaleString("es-DO")}</span>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-slate-700">TOTAL</span>
            <span className="text-2xl font-semibold text-green-600">
              RD$ {invoice.total?.toLocaleString("es-DO")}
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
