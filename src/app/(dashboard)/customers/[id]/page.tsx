import { createClient } from "@/lib/supabase";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft, Wallet,
  CreditCard, Landmark, Clock, ShoppingBag,
  CheckCircle2, AlertTriangle, Receipt,
} from "lucide-react";
import Link from "next/link";
import { CustomerDetailHeader } from "@/modules/customers/components/CustomerDetailHeader";

// ── Helpers ────────────────────────────────────────────────────────────────────

const METHOD_LABEL: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  credit: "Crédito",
};

const METHOD_ICON: Record<string, React.ReactNode> = {
  cash:     <Wallet     className="w-3 h-3" />,
  card:     <CreditCard className="w-3 h-3" />,
  transfer: <Landmark   className="w-3 h-3" />,
  credit:   <Clock      className="w-3 h-3" />,
};

function fmt(n: number) {
  return `RD$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role, can_edit_customers")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const canEdit = profile.role === "admin" || profile.can_edit_customers === true;

  // ── Datos del cliente ────────────────────────────────────────────────────────
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id)
    .single();

  if (!customer) notFound();

  // ── Historial de facturas con items y cajero ─────────────────────────────────
  const { data: invoices } = await supabase
    .from("invoices")
    .select(`
      id, created_at, total, payment_method, status,
      ncf, ncf_type, amount_received,
      profiles ( full_name ),
      invoice_items ( product_name, quantity, unit_price, total )
    `)
    .eq("customer_id", id)
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  // ── Pagos de deuda ───────────────────────────────────────────────────────────
  const { data: debtPayments } = await supabase
    .from("debt_payments")
    .select(`
      id, amount, payment_method, created_at,
      profiles ( full_name ),
      debts ( invoice_id )
    `)
    .eq("tenant_id", profile.tenant_id)
    .in(
      "debt_id",
      (
        await supabase
          .from("debts")
          .select("id")
          .eq("tenant_id", profile.tenant_id)
          .in(
            "invoice_id",
            (invoices ?? []).map((i: any) => i.id),
          )
      ).data?.map((d: any) => d.id) ?? [],
    )
    .order("created_at", { ascending: false });

  const totalSpent = (invoices ?? []).reduce(
    (s: number, i: any) => s + Number(i.total),
    0,
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-20">

      {/* Back */}
      <Link
        href="/customers"
        className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-black transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a clientes
      </Link>

      <CustomerDetailHeader
        customer={customer}
        totalSpent={totalSpent}
        invoiceCount={(invoices ?? []).length}
        canEdit={canEdit}
      />

      {/* Historial de compras */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" /> Historial de compras
        </h2>

        {(invoices ?? []).length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-xs font-semibold text-gray-300">
            Este cliente no tiene compras registradas.
          </div>
        ) : (
          <div className="space-y-3">
            {(invoices as any[]).map((inv) => {
              const attendedBy = (inv.profiles as any)?.full_name ?? "Sistema";
              const items: any[] = inv.invoice_items ?? [];
              const isPaid = inv.status === "paid";
              const change = Number(inv.amount_received) - Number(inv.total);

              return (
                <div
                  key={inv.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                >
                  {/* Cabecera de la factura */}
                  <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-400">{fmtDate(inv.created_at)}</p>
                      <p className="text-sm font-semibold text-gray-700 mt-0.5">
                        Atendido por: <span className="text-black">{attendedBy}</span>
                      </p>
                    </div>

                    {/* Método */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
                      {METHOD_ICON[inv.payment_method]}
                      {METHOD_LABEL[inv.payment_method] ?? inv.payment_method}
                    </span>

                    {/* Estado */}
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                        <CheckCircle2 className="w-3 h-3" /> Pagado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-100">
                        <AlertTriangle className="w-3 h-3" /> Pendiente
                      </span>
                    )}

                    {/* NCF */}
                    {inv.ncf && inv.ncf !== "RECIBO-INTERNO" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-mono font-semibold border border-blue-100">
                        <Receipt className="w-3 h-3" /> {inv.ncf}
                      </span>
                    )}

                    {/* Total */}
                    <p className="text-base font-bold tabular-nums">{fmt(inv.total)}</p>
                  </div>

                  {/* Items */}
                  <div className="px-5 py-3 space-y-1.5">
                    {items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-gray-700 font-medium">
                          {item.quantity}× {item.product_name}
                        </span>
                        <div className="text-right tabular-nums">
                          <span className="text-gray-400 mr-3">
                            {fmt(item.unit_price)} c/u
                          </span>
                          <span className="font-semibold text-black">{fmt(item.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer: recibido / cambio */}
                  {inv.payment_method === "cash" && (
                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex gap-6 text-xs font-semibold text-gray-500">
                      <span>Recibido: <span className="text-black">{fmt(inv.amount_received)}</span></span>
                      {change > 0 && (
                        <span>Cambio: <span className="text-emerald-600">{fmt(change)}</span></span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Pagos de deuda */}
      {(debtPayments ?? []).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Pagos de deuda registrados
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {(debtPayments as any[]).map((dp) => (
              <div key={dp.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700">
                    {fmtDate(dp.created_at)}
                  </p>
                  <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                    Recibido por: {(dp.profiles as any)?.full_name ?? "Sistema"}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
                  {METHOD_ICON[dp.payment_method] ?? <Wallet className="w-3 h-3" />}
                  {METHOD_LABEL[dp.payment_method] ?? dp.payment_method}
                </span>
                <p className="text-sm font-bold text-emerald-600 tabular-nums">{fmt(dp.amount)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
