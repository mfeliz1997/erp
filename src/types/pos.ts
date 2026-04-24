import { Product } from "./inventory";

// Extendemos el Producto para manejar la cantidad en el carrito
export interface CartItem extends Product {
  cartQuantity: number;
}

export interface InvoiceItem {
  id: string;
  invoice_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total?: number;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  user_id: string;
  customer_name: string | null;
  customer_rnc?: string | null;
  customer_phone?: string | null;
  ncf?: string | null;
  ncf_type?: string | null;
  payment_method?: string | null;
  amount_received?: number | null;
  change_amount?: number | null;
  total: number;
  status: "paid" | "pending" | "cancelled";
  created_at: string;
  // Relaciones
  profiles?: { full_name: string | null } | null;
  invoice_items?: InvoiceItem[];
}

export interface Debt {
  id: string;
  tenant_id: string;
  invoice_id: string;
  total_amount: number;
  balance: number;
  due_date: string | null;
  status: "open" | "paid" | "default";
  created_at: string;
}
