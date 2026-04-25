export interface DebtInvoiceRef {
  id: string;
  customer_name: string | null;
  customer_id: string | null;
  payment_method: string | null;
}

export interface DebtRow {
  id: string;
  total_amount: number;
  balance: number;
  due_date: string | null;
  status: string;
  created_at: string;
  /** Supabase returns a single object for FK joins when using `.single()` semantics,
   *  but when selected via array join it may come back as array or object depending
   *  on the query shape. We cast to the single-object form in the page. */
  invoices: DebtInvoiceRef | null;
}

/** Shape returned directly by Supabase before normalisation */
export interface DebtRowRaw {
  id: string;
  total_amount: number;
  balance: number;
  due_date: string | null;
  status: string;
  created_at: string;
  invoices: DebtInvoiceRef[] | DebtInvoiceRef | null;
}

export function normaliseDebtRow(raw: DebtRowRaw): DebtRow {
  const inv = Array.isArray(raw.invoices) ? raw.invoices[0] ?? null : raw.invoices;
  return { ...raw, invoices: inv };
}
