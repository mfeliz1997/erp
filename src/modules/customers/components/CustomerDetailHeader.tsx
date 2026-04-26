"use client";

import { User, Phone, FileText } from "lucide-react";
import { EditCustomerModal } from "./EditCustomerModal";

interface Customer {
  id: string;
  name: string;
  company_name?: string | null;
  phone?: string | null;
  tax_id?: string | null;
  tax_type?: string | null;
  email?: string | null;
  credit_limit: number;
  current_debt: number;
  ncf_type?: string | null;
  price_tier?: string | null;
}

interface Props {
  customer: Customer;
  totalSpent: number;
  invoiceCount: number;
  canEdit: boolean;
}

function fmt(n: number) {
  return `RD$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export function CustomerDetailHeader({ customer, totalSpent, invoiceCount, canEdit }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 flex flex-col gap-4">
      {/* Top row: avatar + info + edit button */}
      <div className="flex items-start gap-4">
        <div className="p-3 sm:p-4 bg-black text-white shrink-0">
          <User className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">{customer.name}</h1>
          {customer.company_name && (
            <p className="text-sm text-blue-600 font-semibold mt-1">{customer.company_name}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-2 text-xs font-semibold text-gray-500">
            {customer.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> {customer.phone}
              </span>
            )}
            {customer.tax_id && (
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> {customer.tax_type} {customer.tax_id}
              </span>
            )}
          </div>
        </div>
        {canEdit && (
          <div className="shrink-0">
            <EditCustomerModal customer={{
              ...customer,
              credit_limit: customer.credit_limit ?? 0,
              tax_type: customer.tax_type ?? "CEDULA",
              tax_id: customer.tax_id ?? "",
            }} />
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="flex flex-col divide-y divide-gray-100 border-t border-gray-100 pt-2">
        <div className="flex items-center justify-between py-2 px-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Compras</p>
          <p className="text-sm font-bold">{invoiceCount}</p>
        </div>
        <div className="flex items-center justify-between py-2 px-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total gastado</p>
          <p className="text-sm font-bold tabular-nums">{fmt(totalSpent)}</p>
        </div>
        <div className="flex items-center justify-between py-2 px-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Deuda activa</p>
          <p className={`text-sm font-bold tabular-nums ${customer.current_debt > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {fmt(customer.current_debt ?? 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
