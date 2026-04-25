-- ─────────────────────────────────────────────────────────────────────────────
-- Reports Module — PostgreSQL Aggregation Functions
-- All functions are multi-tenant: filter strictly by p_tenant_id.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. get_report_summary ─────────────────────────────────────────────────────
-- Returns executive KPIs + 7-day chart data for the reports page.
-- ITBIS is calculated as: total * 0.18 / 1.18  (ITBIS included in price, 18%)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_report_summary(p_tenant_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  v_today_start  timestamptz := date_trunc('day',  now() AT TIME ZONE 'America/Santo_Domingo') AT TIME ZONE 'America/Santo_Domingo';
  v_month_start  timestamptz := date_trunc('month', now() AT TIME ZONE 'America/Santo_Domingo') AT TIME ZONE 'America/Santo_Domingo';
  v_week_start   timestamptz := (now() AT TIME ZONE 'America/Santo_Domingo' - interval '6 days')::date::timestamptz AT TIME ZONE 'America/Santo_Domingo';
BEGIN
  RETURN json_build_object(
    'sales_today',      COALESCE((
      SELECT COUNT(*) FROM invoices
      WHERE tenant_id = p_tenant_id AND status = 'paid'
        AND created_at >= v_today_start
    ), 0),

    'revenue_today',    COALESCE((
      SELECT SUM(total) FROM invoices
      WHERE tenant_id = p_tenant_id AND status = 'paid'
        AND created_at >= v_today_start
    ), 0),

    'sales_month',      COALESCE((
      SELECT COUNT(*) FROM invoices
      WHERE tenant_id = p_tenant_id AND status = 'paid'
        AND created_at >= v_month_start
    ), 0),

    'revenue_month',    COALESCE((
      SELECT SUM(total) FROM invoices
      WHERE tenant_id = p_tenant_id AND status = 'paid'
        AND created_at >= v_month_start
    ), 0),

    -- Open credit (pending invoices = cuentas por cobrar)
    'pending_credit',   COALESCE((
      SELECT SUM(balance) FROM debts
      WHERE tenant_id = p_tenant_id AND status = 'open'
    ), 0),

    -- ITBIS collected this month (18% included in price: total * 18/118)
    'itbis_collected',  COALESCE((
      SELECT ROUND(SUM(total) * 18.0 / 118.0, 2) FROM invoices
      WHERE tenant_id = p_tenant_id AND status = 'paid'
        AND created_at >= v_month_start
        AND ncf_type IN ('B01', 'B02')
    ), 0),

    'chart_data', (
      SELECT json_agg(row_to_json(t) ORDER BY t.date)
      FROM (
        SELECT
          to_char(day::date, 'DD/MM') AS date,
          COALESCE(SUM(i.total), 0)::numeric   AS revenue,
          COALESCE(COUNT(i.id), 0)::int         AS sales_count
        FROM generate_series(v_week_start::date, now()::date, '1 day') AS day
        LEFT JOIN invoices i
          ON  i.tenant_id = p_tenant_id
          AND i.status    = 'paid'
          AND i.created_at::date = day::date
        GROUP BY day
      ) t
    )
  );
END;
$$;

ALTER FUNCTION public.get_report_summary(uuid) OWNER TO postgres;


-- ── 2. get_fiscal_report ──────────────────────────────────────────────────────
-- 607-style summary: totals per NCF type for a given month.
-- p_year / p_month: e.g. 2026, 4
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_fiscal_report(
  p_tenant_id uuid,
  p_year      int,
  p_month     int
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  v_start timestamptz := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'America/Santo_Domingo');
  v_end   timestamptz := v_start + interval '1 month';
BEGIN
  RETURN json_build_object(
    'rows', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          ncf_type,
          COUNT(*)                                          AS total_invoices,
          ROUND(SUM(total) * 100.0 / 118.0, 2)            AS subtotal,
          ROUND(SUM(total) * 18.0  / 118.0, 2)            AS itbis,
          SUM(total)                                        AS total
        FROM invoices
        WHERE tenant_id = p_tenant_id
          AND status    = 'paid'
          AND created_at >= v_start
          AND created_at <  v_end
          AND ncf_type IS NOT NULL
          AND ncf_type <> ''
        GROUP BY ncf_type
        ORDER BY ncf_type
      ) t
    ),

    'grand_total',    COALESCE((
      SELECT SUM(total) FROM invoices
      WHERE tenant_id = p_tenant_id AND status = 'paid'
        AND created_at >= v_start AND created_at < v_end
        AND ncf_type IS NOT NULL AND ncf_type <> ''
    ), 0),

    'grand_itbis',    COALESCE((
      SELECT ROUND(SUM(total) * 18.0 / 118.0, 2) FROM invoices
      WHERE tenant_id = p_tenant_id AND status = 'paid'
        AND created_at >= v_start AND created_at < v_end
        AND ncf_type IN ('B01', 'B02')
    ), 0)
  );
END;
$$;

ALTER FUNCTION public.get_fiscal_report(uuid, int, int) OWNER TO postgres;


-- ── 3. get_performance_report ─────────────────────────────────────────────────
-- Top 5 products + cashier summary for a given month.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_performance_report(
  p_tenant_id uuid,
  p_year      int,
  p_month     int
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  v_start timestamptz := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'America/Santo_Domingo');
  v_end   timestamptz := v_start + interval '1 month';
BEGIN
  RETURN json_build_object(

    'top_products', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          ii.product_name,
          SUM(ii.quantity)::int                        AS qty_sold,
          ROUND(SUM(ii.quantity * ii.unit_price), 2)  AS revenue
        FROM invoice_items ii
        JOIN invoices i ON i.id = ii.invoice_id
        WHERE i.tenant_id  = p_tenant_id
          AND i.status     = 'paid'
          AND i.created_at >= v_start
          AND i.created_at <  v_end
        GROUP BY ii.product_name
        ORDER BY qty_sold DESC
        LIMIT 5
      ) t
    ),

    'cashier_summary', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          COALESCE(p.full_name, 'Desconocido') AS cashier_name,
          COUNT(i.id)::int                      AS total_sales,
          ROUND(SUM(i.total), 2)                AS total_revenue
        FROM invoices i
        LEFT JOIN profiles p ON p.id = i.user_id
        WHERE i.tenant_id  = p_tenant_id
          AND i.status     = 'paid'
          AND i.created_at >= v_start
          AND i.created_at <  v_end
        GROUP BY p.full_name
        ORDER BY total_revenue DESC
      ) t
    )
  );
END;
$$;

ALTER FUNCTION public.get_performance_report(uuid, int, int) OWNER TO postgres;
