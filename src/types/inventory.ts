export type BusinessType =
  | "tecnologia"
  | "vehiculos"
  | "retail"
  | "construccion"
  | "gastronomia"
  | "salud"
  | "financiero"
  | "servicios"
  | "belleza"
  | "ong"
  | "real_estate";

export const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: "tecnologia", label: "Tecnología (Celulares, PC)" },
  { value: "vehiculos", label: "Dealer de Vehículos" },
  { value: "retail", label: "Retail / Colmado" },
  { value: "construccion", label: "Ferretería / Construcción" },
  { value: "gastronomia", label: "Restaurante / Cafetería" },
  { value: "salud", label: "Farmacia / Salud" },
  { value: "financiero", label: "Financiero / Cooperativa" },
  { value: "real_estate", label: "Bienes Raíces / Inmobiliaria" },
  { value: "belleza", label: "Salón / Barbería" },
  { value: "ong", label: "Iglesia / ONG" },
  { value: "servicios", label: "Servicios Profesionales" },
];

export type ProductType =
  | "vehicle"
  | "mobile"
  | "medicina"
  | "property"
  | "general"
  | "services";

export interface InventoryActionState {
  success: boolean;
  error?: string;
  data?: string;
}

// --- METADATOS ESPECÍFICOS (ESCALABLES VÍA JSONB) ---
export interface VehicleMetadata {
  chasis: string;
  year?: number;
}

export interface MobileMetadata {
  imei: string;
  condition?: string;
}

export interface MedicinaMetadata {
  lote: string;
  vencimiento: string;
}

export interface PropertyMetadata {
  address: string;
  operation_type: "rent" | "sale";
}

export type ProductMetadata =
  | VehicleMetadata
  | MobileMetadata
  | MedicinaMetadata
  | PropertyMetadata
  | Record<string, unknown>;

// --- ENTIDAD CORE ---
export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  type: ProductType;
  price: number;
  cost_price?: number;
  stock: number;
  min_stock_alert: number;
  image_url?: string;
  is_deleted: boolean;
  metadata: ProductMetadata;
  created_at: string;
  barcode?: string;
}

// --- DICCIONARIO DE CATEGORÍAS (UI) ---
export const PRODUCT_CATEGORIES: { value: ProductType; label: string }[] = [
  { value: "vehicle", label: "Vehículos (Chasis/Año)" },
  { value: "mobile", label: "Equipos Tecnológicos (IMEI)" },
  { value: "medicina", label: "Salud (Lote/Vence)" },
  { value: "property", label: "Propiedades (Inmuebles)" },
  { value: "general", label: "Mercancía General" },
  { value: "services", label: "Servicios / Mano de Obra" },
];

// =========================================================================
// SOLUCIÓN ESCALABLE: Formateador Centralizado
// =========================================================================
const METADATA_FORMATTERS: Record<string, (meta: any) => string> = {
  vehicle: (meta: VehicleMetadata) =>
    meta?.chasis ? `Chasis: ${meta.chasis}` : "",
  mobile: (meta: MobileMetadata) => (meta?.imei ? `IMEI: ${meta.imei}` : ""),
  medicina: (meta: MedicinaMetadata) =>
    meta?.lote ? `Lote: ${meta.lote}` : "",
  property: (meta: PropertyMetadata) =>
    meta?.address
      ? `${meta.operation_type === "rent" ? "Alquiler" : "Venta"} - ${meta.address}`
      : "",
  general: () => "",
  services: () => "",
};

export function formatProductMetadata(
  type: ProductType,
  metadata: ProductMetadata,
): string {
  const formatter = METADATA_FORMATTERS[type];
  return formatter ? formatter(metadata) : "";
}

// =========================================================================
// FILTRO MAESTRO: Máximo 3 categorías por negocio para simplificar UI
// =========================================================================
const BUSINESS_CONFIG: Record<BusinessType, ProductType[]> = {
  tecnologia: ["mobile", "general", "services"],
  vehiculos: ["vehicle", "general", "services"],
  salud: ["medicina", "general", "services"],
  real_estate: ["property", "general", "services"],
  // Los demás operan con el modelo tradicional (Productos físicos y Servicios)
  retail: ["general", "services"],
  construccion: ["general", "services"],
  gastronomia: ["general", "services"],
  belleza: ["general", "services"],
  financiero: ["general", "services"], // Pueden embargar/vender artículos
  ong: ["general", "services"],
  servicios: ["services"],
};

export function getAllowedCategories(businessType: BusinessType = "retail") {
  const allowed = BUSINESS_CONFIG[businessType] || ["general", "services"];
  return PRODUCT_CATEGORIES.filter((cat) => allowed.includes(cat.value));
}
