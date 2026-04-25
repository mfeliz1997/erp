import { Product } from "./inventory";

// ── Discounts ─────────────────────────────────────────────────────────────────

export interface Discount {
  id: string;
  tenant_id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  is_active: boolean;
  created_at: string;
}

/** Descuento activo aplicado al carrito — null = sin descuento */
export interface AppliedDiscount {
  id: string | null;       // null si es "Manual"
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  amount: number;          // monto en RD$ ya calculado
}

// ── Multi-tier pricing ────────────────────────────────────────────────────────

/** Maps Customer.price_tier string values to a numeric level (1 = Detal, 2 = Mayorista, 3 = VIP) */
export type PriceTier = 'retail' | 'wholesale_1' | 'wholesale_2';

export const PRICE_TIER_LEVEL: Record<PriceTier, 1 | 2 | 3> = {
  retail:      1,
  wholesale_1: 2,
  wholesale_2: 3,
};

/** Returns the correct unit price from a Product given a numeric price level (1-3) */
export function resolvePriceForLevel(product: Pick<Product, 'price' | 'wholesale_price_1' | 'wholesale_price_2'>, level: 1 | 2 | 3): number {
  if (level === 2) return product.wholesale_price_1 ?? product.price;
  if (level === 3) return product.wholesale_price_2 ?? product.wholesale_price_1 ?? product.price;
  return product.price;
}

// ── Cart ──────────────────────────────────────────────────────────────────────

// Extendemos el Producto para manejar la cantidad en el carrito
export interface CartItem extends Product {
  cartQuantity: number;
  /** Active unit price — may differ from product.price when a customer price tier is applied */
  unit_price: number;
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
