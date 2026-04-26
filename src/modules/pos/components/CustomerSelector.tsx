"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useTransition,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  searchCustomerAction,
} from "@/modules/pos/customer-actions";
import type { CustomerSearchResult } from "@/types/customer";
import { toast } from "sonner";
import {
  User,
  Phone,
  FileText,
  Sparkles,
  AlertTriangle,
  X,
  Loader2,
  UserPlus,
  Building2,
  Search,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SelectedCustomer {
  id?: string;
  name: string;
  phone: string;
  rnc: string;
  credit_limit: number;
  current_debt: number;
  is_new_from_dgii?: boolean;
  price_tier?: string;
  ncf_type?: string | null;
}

interface CustomerSelectorProps {
  value: SelectedCustomer | null;
  onChange: (customer: SelectedCustomer | null) => void;
  showDebtBadge?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPhone(raw: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10)
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return raw;
}

function hasExactMatch(results: CustomerSearchResult[], query: string): boolean {
  const q = query.trim().toLowerCase();
  return results.some((r) => r.name.toLowerCase() === q);
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CustomerSelector({
  value,
  onChange,
  showDebtBadge = true,
}: CustomerSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [isSearching, startSearch] = useTransition();
  const [isLookingUp, startLookup] = useTransition();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Cerrar al clic fuera ───────────────────────────────────────────────────

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // ── Búsqueda debounced ─────────────────────────────────────────────────────

  const runSearch = useCallback((q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    startSearch(async () => {
      const res = await searchCustomerAction(q);
      if (res.success) {
        setResults(res.data);
        setSearchError(null);
        setOpen(true);
      } else {
        setSearchError(res.error);
        setResults([]);
        setOpen(false);
      }
    });
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (value) onChange(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 350);
  };

  // ── Seleccionar resultado local ────────────────────────────────────────────

  const handleSelectLocal = (customer: CustomerSearchResult) => {
    onChange({
      id: customer.id,
      name: customer.name,
      phone: customer.phone ?? "",
      rnc: customer.rnc ?? "",
      credit_limit: customer.credit_limit,
      current_debt: customer.current_debt,
      price_tier: customer.price_tier,
      ncf_type: customer.ncf_type,
    });
    setQuery(customer.name);
    setOpen(false);
    setResults([]);
  };

  // ── Seleccionar resultado DGII → crear localmente de forma silenciosa ──────

  const handleSelectDgii = (customer: CustomerSearchResult) => {
    if (!customer.rnc || !customer.name) return;

    onChange({
      id: undefined,
      name: customer.name,
      phone: "",
      rnc: customer.rnc,
      credit_limit: 0,
      current_debt: 0,
      is_new_from_dgii: true,
      price_tier: customer.price_tier,
      ncf_type: customer.ncf_type,
    });
    setQuery(customer.name);
    setOpen(false);
    setResults([]);
  };

  // ── Creación rápida (nombre libre / teléfono) ──────────────────────────────

  const handleQuickCreate = () => {
    const q = query.trim();
    if (!q) return;

    onChange({
      id: undefined,
      name: q,
      phone: "",
      rnc: "",
      credit_limit: 0,
      current_debt: 0,
      price_tier: 'retail',
      ncf_type: null,
    });
    setQuery(q);
    setOpen(false);
    setResults([]);
  };

  // ── Buscar RNC directamente desde el chip ──────────────────────────────────

  const handleRncLookup = () => {
    if (!value?.rnc || value.rnc.length < 9) return;
    startLookup(async () => {
      const res = await searchCustomerAction(value.rnc);
      if (res.success && res.data.length > 0) {
        // Si existe localmente, lo tomamos
        const localMatch = res.data.find(c => !c.is_new_from_dgii && c.rnc === value.rnc);
        if (localMatch) {
          onChange({
            id: localMatch.id,
            name: localMatch.name,
            phone: localMatch.phone ?? "",
            rnc: localMatch.rnc ?? "",
            credit_limit: localMatch.credit_limit,
            current_debt: localMatch.current_debt,
            price_tier: localMatch.price_tier,
            ncf_type: localMatch.ncf_type,
          });
          toast.success("Cliente cargado desde la base de datos");
          return;
        }
        
        // Si no, tomamos los datos de DGII para actualizarlo al facturar
        const dgiiMatch = res.data.find(c => c.is_new_from_dgii && c.rnc === value.rnc);
        if (dgiiMatch) {
          onChange({
            ...value,
            name: dgiiMatch.name,
            rnc: dgiiMatch.rnc ?? value.rnc,
            is_new_from_dgii: true,
          });
          toast.success("Datos fiscales obtenidos de DGII");
          return;
        }
      }
      toast.error("No se encontraron datos para este RNC");
    });
  };

  // ── Edición inline de campos del chip ─────────────────────────────────────

  const handleFieldChange = (field: "name" | "phone" | "rnc", val: string) => {
    if (!value) return;
    onChange({ ...value, [field]: val });
  };

  // ── Limpiar ────────────────────────────────────────────────────────────────

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
    setOpen(false);
    setSearchError(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // ── Flags ──────────────────────────────────────────────────────────────────

  const trimmedQuery = query.trim();
  const localResults  = results.filter((r) => !r.is_new_from_dgii);
  const dgiiResults   = results.filter((r) => r.is_new_from_dgii);
  const showCreate    = trimmedQuery.length >= 2 && !isSearching && !hasExactMatch(results, trimmedQuery);
  const isLoading     = isSearching;
  const hasDebt       = (value?.current_debt ?? 0) > 0;
  const showDropdown  = open && (results.length > 0 || showCreate);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5">

      {/* ── Search input (native — no cmdk, no focus loss) ────────────────── */}
      {!value && (
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            {isLoading
              ? <Loader2 className="w-4 h-4 text-primary animate-spin" />
              : <Search className="w-4 h-4 text-muted-foreground" />
            }
          </div>
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="Buscar por nombre, teléfono o RNC..."
            value={query}
            onChange={handleQueryChange}
            onFocus={() => { if (results.length > 0 || showCreate) setOpen(true); }}
            className="w-full h-10 pl-9 pr-9 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:opacity-50"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors disabled:opacity-30"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Error */}
          {searchError && (
            <p className="flex items-center gap-1 text-[11px] text-destructive font-medium mt-1 px-1">
              <AlertTriangle className="w-3 h-3 shrink-0" /> {searchError}
            </p>
          )}

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-background shadow-xl overflow-hidden">
              <ul className="max-h-72 overflow-y-auto py-1">

                {/* Clientes locales */}
                {localResults.length > 0 && (
                  <>
                    <li className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40">
                      Clientes del negocio
                    </li>
                    {localResults.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); handleSelectLocal(c); }}
                          className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left"
                        >
                          <div className="mt-0.5 p-1.5 rounded-md bg-muted shrink-0">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground truncate">
                                {c.name}
                              </span>
                              {c.current_debt > 0 && (
                                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 shrink-0">
                                  Deuda: RD${c.current_debt.toLocaleString()}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              {c.phone && (
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Phone className="w-2.5 h-2.5" />
                                  {formatPhone(c.phone)}
                                </span>
                              )}
                              {c.rnc && (
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <FileText className="w-2.5 h-2.5" />
                                  {c.rnc}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </>
                )}

                {/* Resultados DGII */}
                {dgiiResults.length > 0 && (
                  <>
                    {localResults.length > 0 && <li className="h-px bg-border mx-3 my-1" />}
                    <li className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40">
                      Encontrado en DGII
                    </li>
                    {dgiiResults.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); handleSelectDgii(c); }}
                          className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left"
                        >
                          <div className="mt-0.5 p-1.5 rounded-md bg-primary/10 shrink-0">
                            <Building2 className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground truncate">
                                {c.name}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 border-primary/40 text-primary gap-1 shrink-0"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                DGII
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <FileText className="w-2.5 h-2.5 text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground">{c.rnc}</span>
                            </div>
                            <p className="text-[10px] text-primary/70 mt-0.5 font-medium">
                              ¿Desea agregarlo? — Se creará en su directorio de clientes
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </>
                )}

                {/* Sin resultados */}
                {results.length === 0 && trimmedQuery.length >= 2 && !isSearching && (
                  <li className="py-3 px-3 text-xs text-muted-foreground text-center">
                    No se encontraron clientes para &ldquo;{trimmedQuery}&rdquo;
                  </li>
                )}

                {/* Crear cliente */}
                {showCreate && (
                  <>
                    {results.length > 0 && <li className="h-px bg-border mx-3 my-1" />}
                    <li>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleQuickCreate(); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left"
                      >
                        <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                          <UserPlus className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-primary">+ Crear cliente</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            &ldquo;{trimmedQuery}&rdquo;
                          </p>
                        </div>
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Chip con campos editables ─────────────────────────────────────────── */}
      {value && (
        <div className={`p-3 rounded-lg border bg-card transition-colors ${
          hasDebt && showDebtBadge
            ? "border-destructive/30 bg-destructive/5"
            : "border-border"
        }`}>
          {/* Header del chip */}
          <div className="flex items-center gap-2 mb-2.5">
            <div className={`p-1.5 rounded-md shrink-0 ${value.is_new_from_dgii ? "bg-primary/10" : "bg-muted"}`}>
              {value.is_new_from_dgii
                ? <Building2 className="w-3.5 h-3.5 text-primary" />
                : <User className="w-3.5 h-3.5 text-muted-foreground" />
              }
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
              {value.is_new_from_dgii && !value.id && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 border-primary/40 text-primary gap-1"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  DGII
                </Badge>
              )}
              {showDebtBadge && hasDebt && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-destructive/10 border border-destructive/20 shrink-0">
                  <AlertTriangle className="w-3 h-3 text-destructive" />
                  <span className="text-[11px] font-bold text-destructive tabular-nums">
                    Deuda: RD${value.current_debt.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Campos editables */}
          <div className="grid grid-cols-1 gap-2">
            {/* Nombre */}
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Nombre completo *"
                value={value.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                className="h-8 pl-7 text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Teléfono */}
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Teléfono"
                  value={value.phone}
                  onChange={(e) => handleFieldChange("phone", e.target.value.replace(/\D/g, ""))}
                  className="h-8 pl-7 text-sm"
                />
              </div>

              {/* RNC */}
              <div className="relative flex gap-1">
                <div className="relative flex-1">
                  <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="RNC / Cédula"
                    value={value.rnc}
                    onChange={(e) => handleFieldChange("rnc", e.target.value.replace(/\D/g, ""))}
                    className="h-8 pl-7 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 px-2.5"
                  onClick={handleRncLookup}
                  disabled={isLookingUp || !value.rnc || value.rnc.length < 9}
                  title="Buscar en DGII o Clientes"
                >
                  {isLookingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
