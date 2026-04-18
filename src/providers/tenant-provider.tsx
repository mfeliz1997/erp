"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { BusinessType } from "@/types/inventory";

interface Tenant {
  id: string;
  name: string;
  business_type: BusinessType;
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// 1. Agregamos tenantId a las props para que layout.tsx no de error
export function TenantProvider({ 
  children, 
  tenantId 
}: { 
  children: React.ReactNode; 
tenantId: string;  
}) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function getTenantData() {
      // 2. Si ya recibimos el ID desde el layout (Server Side), 
      // solo buscamos los detalles faltantes del negocio
      if (tenantId) {
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("id, name, business_type")
          .eq("id", tenantId)
          .single();

        if (tenantData) {
          setTenant(tenantData as unknown as Tenant);
        }
      }
      setIsLoading(false);
    }
    
    getTenantData();
  }, [supabase, tenantId]);

  return (
    <TenantContext.Provider value={{ tenant, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) throw new Error("useTenant debe usarse dentro de un TenantProvider");
  return context;
};