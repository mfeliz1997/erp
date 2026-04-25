export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  rnc: string | null;
  credit_limit: number;
  current_debt: number;
  price_tier?: 'retail' | 'wholesale_1' | 'wholesale_2';
  ncf_type?: string | null;
}

export interface CustomerSearchResult extends Pick<Customer, 'id' | 'name' | 'phone' | 'rnc' | 'credit_limit' | 'current_debt' | 'price_tier' | 'ncf_type'> {
  /** Viene de dgii_taxpayers, no existe aún en el tenant */
  is_new_from_dgii?: boolean;
}

export type CustomerActionResult =
  | { success: true; data: CustomerSearchResult[] }
  | { success: false; error: string };

export type QuickCustomerResult =
  | { success: true; data: CustomerSearchResult }
  | { success: false; error: string };
