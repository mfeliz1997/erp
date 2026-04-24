-- Migration: add discrepancy audit fields to cash_shifts
-- Safe: all columns are optional with defaults, no existing columns touched

ALTER TABLE public.cash_shifts
  ADD COLUMN IF NOT EXISTS expected_amount      numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_diferencia     numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiene_descuadre      boolean       DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_breakdown    jsonb         DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.cash_shifts.expected_amount   IS 'apertura + ventas efectivo calculado al cierre';
COMMENT ON COLUMN public.cash_shifts.monto_diferencia  IS 'closing_amount - expected_amount (negativo = faltante)';
COMMENT ON COLUMN public.cash_shifts.tiene_descuadre   IS 'true si abs(monto_diferencia) > 1';
COMMENT ON COLUMN public.cash_shifts.payment_breakdown IS '{"cash": 0, "card": 0, "transfer": 0}';
