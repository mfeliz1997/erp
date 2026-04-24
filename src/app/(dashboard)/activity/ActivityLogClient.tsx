"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Package,
  ShoppingCart,
  Wallet,
  Clock,
  RefreshCw,
  AlertTriangle,
  Banknote,
  CreditCard,
  ArrowLeftRight,
} from "lucide-react";

// ── Cash-close metadata shape (mirrors CashClosingResult) ────────────────────
interface CashCloseMetadata {
  shift_id?: string;
  opening_amount?: number;
  total_sales?: number;
  closing_amount?: number;
  expected_amount?: number;
  amount_difference?: number;
  has_discrepancy?: boolean;
  payment_breakdown?: { cash: number; card: number; transfer: number; credit?: number };
}

interface ActivityLog {
  id: string;
  action: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

interface Props {
  initialLogs: ActivityLog[];
  tenantId: string;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case "sale": return <ShoppingCart className="w-4 h-4" />;
    case "cash_open":
    case "cash_close": return <Wallet className="w-4 h-4" />;
    case "inventory_create":
    case "inventory_delete": return <Package className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

// ── Cash-close breakdown card ────────────────────────────────────────────────
function CashCloseBreakdown({ meta }: { meta: CashCloseMetadata }) {
  const fmt = (n?: number) =>
    `RD$ ${(n ?? 0).toLocaleString("es-DO", { minimumFractionDigits: 2 })}`;

  const pb = meta.payment_breakdown;
  const diff      = meta.amount_difference ?? 0;
  const descuadre = meta.has_discrepancy ?? false;

  // Top 4 cells: use stored opening_amount if available, fallback to derivation
  const opening = meta.opening_amount ?? ((meta.expected_amount ?? 0) - (pb?.cash ?? 0));
  const totalSales = meta.total_sales ??
    ((pb?.cash ?? 0) + (pb?.card ?? 0) + (pb?.transfer ?? 0) + (pb?.credit ?? 0));

  const topCells = [
    { label: "Base Apertura",    value: fmt(opening) },
    { label: "Total Vendido",    value: fmt(totalSales) },
    { label: "Efectivo Esperado",value: fmt(meta.expected_amount) },
    { label: "Cierre Real",      value: fmt(meta.closing_amount) },
  ];

  // Payment method rows
  const methods = [
    { key: "cash"     as const, label: "Efectivo",      Icon: Banknote,       color: "text-emerald-600" },
    { key: "card"     as const, label: "Tarjeta",       Icon: CreditCard,     color: "text-blue-600"    },
    { key: "transfer" as const, label: "Transferencia", Icon: ArrowLeftRight, color: "text-violet-600"  },
    { key: "credit"   as const, label: "Crédito",       Icon: Clock,          color: "text-orange-500"  },
  ];

  return (
    <div className={`mt-3 rounded-lg overflow-hidden border ${descuadre ? "border-l-4 border-red-500" : "border-gray-100"}`}>
      {/* 4-cell summary grid */}
      <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
        {topCells.map((c) => (
          <div key={c.label} className="px-3 py-2 bg-gray-50/60">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{c.label}</p>
            <p className="text-xs font-semibold text-gray-800 tabular-nums mt-0.5">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Payment method breakdown */}
      {pb && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2 border-t border-gray-100 bg-white">
          {methods.map(({ key, label, Icon, color }) => (
            <div key={key} className="flex items-center gap-1.5">
              <Icon className={`w-3 h-3 ${color} shrink-0`} />
              <span className="text-[10px] text-gray-500">
                <span className={`font-semibold tabular-nums ${color}`}>{fmt(pb[key] ?? 0)}</span>
                {" "}{label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Discrepancy alert */}
      {descuadre && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-red-100 bg-red-50">
          <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
          <p className="text-[11px] font-semibold text-red-600">
            Faltante de{" "}
            <span className="tabular-nums">
              RD$ {Math.abs(diff).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
            </span>
          </p>
          <Badge variant="destructive" className="ml-auto text-[10px] h-4 px-1.5 rounded-sm">
            DESCUADRE
          </Badge>
        </div>
      )}
    </div>
  );
}

const getActionColor = (action: string) => {
  switch (action) {
    case "sale": return "bg-blue-500";
    case "cash_open": return "bg-green-500";
    case "cash_close": return "bg-red-500";
    case "inventory_create": return "bg-orange-500";
    case "inventory_delete": return "bg-gray-700";
    default: return "bg-slate-400";
  }
};

export function ActivityLogClient({ initialLogs, tenantId }: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel("activity_logs_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
          filter: `tenant_id=eq.${tenantId}`,
        },
        async (payload) => {
          // Fetch full log con JOIN a profiles
          const { data } = await supabase
            .from("activity_logs")
            .select("*, profiles:user_id(full_name)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setLogs((prev) => [data as ActivityLog, ...prev].slice(0, 100));
          }
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">
      <div className="border-b border-gray-200 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold">Auditoría del Sistema</h1>
          <p className="text-xs font-bold text-gray-400 mt-2">
            Línea de tiempo de actividades en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
              isLive
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-gray-50 text-gray-400 border-gray-200"
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${isLive ? "animate-spin" : ""}`} />
            {isLive ? "En vivo" : "Conectando..."}
          </span>
          <Badge variant="outline" className="text-xs font-semibold text-gray-400 border-gray-200">
            {logs.length} registros
          </Badge>
        </div>
      </div>

      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
        {logs.length === 0 ? (
          <div className="text-center p-20 border-2 border-solid border-gray-200 font-semibold text-gray-300">
            No se han registrado actividades aún
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${getActionColor(log.action)} text-white`}
              >
                {getActionIcon(log.action)}
              </div>

              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
                <div className="flex items-center justify-between space-x-2 mb-1">
                  <div className="font-semibold text-black text-xs">
                    {log.profiles?.full_name || "Sistema"}
                  </div>
                  <time className="font-mono text-xs text-gray-400">
                    {format(new Date(log.created_at), "HH:mm · dd MMM", { locale: es })}
                  </time>
                </div>
                <div className="text-sm font-bold text-gray-800 leading-tight">
                  {log.description}
                </div>

                {/* Metadata de venta: NCF y total */}
                {log.action === "sale" && log.metadata && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {log.metadata.ncf != null && (
                      <p className="text-[11px] font-mono text-gray-400">
                        NCF: {log.metadata.ncf as string}
                      </p>
                    )}
                    {log.metadata.total != null && (
                      <p className="text-[11px] font-semibold text-gray-600 text-right">
                        RD$ {Number(log.metadata.total).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Metadata de cierre de caja: desglose 2x2 */}
                {log.action === "cash_close" && log.metadata && (
                  <CashCloseBreakdown meta={log.metadata as CashCloseMetadata} />
                )}

                <div className="mt-3 flex gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-xl border-gray-200 text-xs font-semibold text-gray-400"
                  >
                    {log.action}
                  </Badge>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-10 text-center">
        <p className="text-xs font-semibold text-gray-300">
          Fin del Historial Reciente
        </p>
      </div>
    </div>
  );
}
