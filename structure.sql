


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."decrement_stock_safe"("p_product_id" "uuid", "p_qty" integer) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_current_stock INTEGER;
BEGIN
    -- Bloquea la fila del producto temporalmente
    SELECT stock INTO v_current_stock FROM products WHERE id = p_product_id FOR UPDATE;
    
    IF v_current_stock < p_qty THEN
        RETURN FALSE; -- Rechaza la venta si alguien más lo compró un milisegundo antes
    END IF;

    UPDATE products SET stock = stock - p_qty WHERE id = p_product_id;
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."decrement_stock_safe"("p_product_id" "uuid", "p_qty" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_next_ncf"("p_tenant_id" "uuid", "p_type" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_prefix  text;
  v_new_seq integer;
  v_ncf     text;
BEGIN
  UPDATE public.ncf_sequences
  SET current_sequence = current_sequence + 1
  WHERE tenant_id = p_tenant_id
    AND type      = p_type
    AND is_active = true
  RETURNING prefix, current_sequence INTO v_prefix, v_new_seq;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_ncf := v_prefix || LPAD(v_new_seq::text, 8, '0');

  -- Log automático del comprobante usado
  INSERT INTO public.ncf_used_sequences(tenant_id, ncf_type, ncf_number, sequence_num)
  VALUES (p_tenant_id, p_type, v_ncf, v_new_seq);

  RETURN v_ncf;
END;
$$;


ALTER FUNCTION "public"."generate_next_ncf"("p_tenant_id" "uuid", "p_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_stats"("p_tenant_id" "uuid", "p_days" integer DEFAULT 7, "p_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_to" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_result     JSONB;
    v_start      TIMESTAMPTZ;
    v_end        TIMESTAMPTZ;
    v_prev_start TIMESTAMPTZ;
    v_prev_end   TIMESTAMPTZ;
    v_span       INTERVAL;
BEGIN
    IF p_from IS NOT NULL AND p_to IS NOT NULL THEN
        v_start := date_trunc('day', p_from);
        v_end   := date_trunc('day', p_to) + INTERVAL '1 day';
    ELSE
        v_start := date_trunc('day', NOW() - (p_days || ' days')::INTERVAL);
        v_end   := NOW();
    END IF;

    v_span       := v_end - v_start;
    v_prev_end   := v_start;
    v_prev_start := v_start - v_span;

    SELECT jsonb_build_object(

        'total_revenue',
            COALESCE((SELECT SUM(total)  FROM invoices      WHERE tenant_id = p_tenant_id AND status = 'paid' AND created_at >= v_start AND created_at < v_end), 0) +
            COALESCE((SELECT SUM(amount) FROM debt_payments WHERE tenant_id = p_tenant_id AND created_at >= v_start AND created_at < v_end), 0),

        'total_sales',
            (SELECT COUNT(*) FROM invoices WHERE tenant_id = p_tenant_id AND created_at >= v_start AND created_at < v_end),

        'total_products_sold',
            COALESCE((
                SELECT SUM(ii.quantity)
                FROM invoice_items ii
                JOIN invoices i ON i.id = ii.invoice_id
                WHERE ii.tenant_id = p_tenant_id AND i.created_at >= v_start AND i.created_at < v_end
            ), 0),

        'prev_revenue',
            COALESCE((SELECT SUM(total)  FROM invoices      WHERE tenant_id = p_tenant_id AND status = 'paid' AND created_at >= v_prev_start AND created_at < v_prev_end), 0) +
            COALESCE((SELECT SUM(amount) FROM debt_payments WHERE tenant_id = p_tenant_id AND created_at >= v_prev_start AND created_at < v_prev_end), 0),

        'prev_sales',
            (SELECT COUNT(*) FROM invoices WHERE tenant_id = p_tenant_id AND created_at >= v_prev_start AND created_at < v_prev_end),

        'prev_products_sold',
            COALESCE((
                SELECT SUM(ii.quantity)
                FROM invoice_items ii
                JOIN invoices i ON i.id = ii.invoice_id
                WHERE ii.tenant_id = p_tenant_id AND i.created_at >= v_prev_start AND i.created_at < v_prev_end
            ), 0),

        'payment_stats', (
            SELECT COALESCE(jsonb_object_agg(status, count), '{}'::jsonb)
            FROM (
                SELECT status, COUNT(*) as count
                FROM invoices
                WHERE tenant_id = p_tenant_id AND created_at >= v_start AND created_at < v_end
                GROUP BY status
            ) s
        ),

        'chart_data', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'date',        TO_CHAR(d.date_day, 'DD Mon'),
                    'revenue',     COALESCE(rev.dia_total, 0),
                    'sales_count', COALESCE(rev.dia_count, 0)
                )
                ORDER BY d.date_day
            )
            FROM (
                SELECT generate_series(
                    date_trunc('day', v_start),
                    date_trunc('day', v_end - INTERVAL '1 second'),
                    '1 day'::interval
                ) AS date_day
            ) d
            LEFT JOIN (
                SELECT
                    date_trunc('day', created_at) AS d_date,
                    SUM(total)                    AS dia_total,
                    COUNT(*)                      AS dia_count
                FROM invoices
                WHERE tenant_id = p_tenant_id AND status = 'paid' AND created_at >= v_start AND created_at < v_end
                GROUP BY 1
                UNION ALL
                SELECT
                    date_trunc('day', created_at) AS d_date,
                    SUM(amount)                   AS dia_total,
                    0                             AS dia_count
                FROM debt_payments
                WHERE tenant_id = p_tenant_id AND created_at >= v_start AND created_at < v_end
                GROUP BY 1
            ) rev ON rev.d_date = d.date_day
        ), '[]'::jsonb),

        'top_products', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object('name', t.product_name, 'qty', t.total_qty)
                ORDER BY t.total_qty DESC
            )
            FROM (
                SELECT ii.product_name, SUM(ii.quantity) AS total_qty
                FROM invoice_items ii
                JOIN invoices i ON i.id = ii.invoice_id
                WHERE ii.tenant_id = p_tenant_id AND i.created_at >= v_start AND i.created_at < v_end
                GROUP BY ii.product_name
                ORDER BY total_qty DESC
                LIMIT 5
            ) t
        ), '[]'::jsonb),

        'low_stock_products', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object('name', name, 'stock', stock, 'min', min_stock_alert)
                ORDER BY stock ASC
            )
            FROM products
            WHERE tenant_id = p_tenant_id
              AND is_deleted = false
              AND min_stock_alert > 0
              AND stock <= min_stock_alert
            LIMIT 5
        ), '[]'::jsonb)

    ) INTO v_result;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_dashboard_stats"("p_tenant_id" "uuid", "p_days" integer, "p_from" timestamp with time zone, "p_to" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_customer_debt"("p_customer_id" "uuid", "p_amount" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.customers
  SET    current_debt = GREATEST(0, current_debt + p_amount)
  WHERE  id = p_customer_id;
END;
$$;


ALTER FUNCTION "public"."increment_customer_debt"("p_customer_id" "uuid", "p_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_payment_debt"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.customer_id IS NOT NULL THEN
        UPDATE customers
        SET current_debt = current_debt - NEW.amount
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."process_payment_debt"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_dgii_taxpayers_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (NEW.company_name IS DISTINCT FROM OLD.company_name OR 
      NEW.status IS DISTINCT FROM OLD.status OR 
      NEW.economic_activity IS DISTINCT FROM OLD.economic_activity) THEN
    NEW.updated_at = NOW();
    RETURN NEW;
  ELSE
    RETURN OLD;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_dgii_taxpayers_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "description" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_registers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."cash_registers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_shifts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "register_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "opening_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "closing_amount" numeric(10,2),
    "status" character varying(50) DEFAULT 'OPEN'::character varying NOT NULL,
    "opened_at" timestamp with time zone DEFAULT "now"(),
    "closed_at" timestamp with time zone,
    "expected_amount" numeric(10,2),
    "amount_difference" numeric(10,2),
    "has_discrepancy" boolean DEFAULT false,
    "payment_breakdown" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."cash_shifts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."cash_shifts"."expected_amount" IS 'Monto esperado en caja: apertura + ventas en efectivo';



COMMENT ON COLUMN "public"."cash_shifts"."amount_difference" IS 'Diferencia entre monto contado y esperado (puede ser negativo)';



COMMENT ON COLUMN "public"."cash_shifts"."has_discrepancy" IS 'true cuando |monto_diferencia| > 1';



COMMENT ON COLUMN "public"."cash_shifts"."payment_breakdown" IS 'Desglose JSON de ventas por método: {cash, card, transfer}';



CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "city" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tax_type" "text" DEFAULT 'CEDULA'::"text",
    "tax_id" "text",
    "credit_limit" numeric DEFAULT 0 NOT NULL,
    "current_debt" numeric DEFAULT 0 NOT NULL,
    "company_name" "text",
    CONSTRAINT "customers_tax_type_check" CHECK (("tax_type" = ANY (ARRAY['CEDULA'::"text", 'RNC'::"text", 'PASAPORTE'::"text"])))
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."debt_payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "debt_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "payment_method" "text" DEFAULT 'cash'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "debt_payments_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash'::"text", 'card'::"text", 'transfer'::"text"])))
);


ALTER TABLE "public"."debt_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."debts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "invoice_id" "uuid",
    "total_amount" numeric(12,2) NOT NULL,
    "balance" numeric(12,2) NOT NULL,
    "due_date" "date",
    "status" "text" DEFAULT 'open'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "debts_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'paid'::"text", 'default'::"text"])))
);


ALTER TABLE "public"."debts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dgii_taxpayers" (
    "rnc" "text" NOT NULL,
    "company_name" "text" NOT NULL,
    "status" "text",
    "economic_activity" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dgii_taxpayers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "invoice_id" "uuid",
    "product_id" "uuid",
    "product_name" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "total" numeric(12,2) NOT NULL
);


ALTER TABLE "public"."invoice_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "customer_name" "text",
    "customer_rnc" "text",
    "total" numeric(12,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'paid'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "customer_id" "uuid",
    "shift_id" "uuid",
    "payment_method" character varying(50) DEFAULT 'CASH'::character varying,
    "ncf" "text",
    "ncf_type" "text" DEFAULT 'CONSUMIDOR_FINAL'::"text",
    "rnc_customer" "text",
    "amount_received" numeric DEFAULT 0,
    "change_amount" numeric DEFAULT 0,
    CONSTRAINT "invoices_status_check" CHECK (("status" = ANY (ARRAY['paid'::"text", 'pending'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ncf_sequences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "type" "text" NOT NULL,
    "prefix" "text" NOT NULL,
    "current_sequence" integer DEFAULT 0,
    "max_limit" integer NOT NULL,
    "valid_until" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ncf_sequences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ncf_used_sequences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "invoice_id" "uuid",
    "ncf_type" "text" NOT NULL,
    "ncf_number" "text" NOT NULL,
    "sequence_num" integer NOT NULL,
    "customer_name" "text",
    "customer_rnc" "text",
    "total" numeric DEFAULT 0 NOT NULL,
    "used_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ncf_used_sequences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "phone_number" "text" NOT NULL,
    "notification_type" "text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "meta_message_id" "text",
    "error_details" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_log_notification_type_check" CHECK (("notification_type" = ANY (ARRAY['INVOICE_WHATSAPP'::"text", 'PAYMENT_REMINDER'::"text"]))),
    CONSTRAINT "notifications_log_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'SENT'::"text", 'DELIVERED'::"text", 'FAILED'::"text"])))
);


ALTER TABLE "public"."notifications_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "invoice_id" "uuid",
    "amount" numeric(12,2) NOT NULL,
    "payment_method" character varying(50) DEFAULT 'CASH'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "price" numeric(15,2) NOT NULL,
    "stock" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_deleted" boolean DEFAULT false,
    "cost_price" numeric(15,2) DEFAULT 0,
    "min_stock_alert" integer DEFAULT 0,
    "image_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "barcode" "text",
    CONSTRAINT "products_type_check" CHECK (("type" = ANY (ARRAY['vehicle'::"text", 'mobile'::"text", 'medicina'::"text", 'property'::"text", 'general'::"text", 'services'::"text"])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "tenant_id" "uuid",
    "full_name" "text",
    "role" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "receive_fiscal_alerts" boolean DEFAULT false,
    "allowed_routes" "text"[] DEFAULT '{/pos}'::"text"[],
    "is_owner" boolean DEFAULT false,
    "phone" "text",
    "can_give_credit" boolean DEFAULT false,
    "max_credit_days" integer DEFAULT 0,
    "pin_code" "text",
    "can_use_card" boolean DEFAULT false NOT NULL,
    "can_use_transfer" boolean DEFAULT false NOT NULL,
    "assigned_register_id" "uuid",
    "can_sell_without_shift" boolean DEFAULT false NOT NULL,
    "can_edit_customers" boolean DEFAULT false NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'pos'::"text", 'hr'::"text", 'manager'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "purchase_id" "uuid",
    "product_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_cost" numeric(12,2) NOT NULL,
    "total" numeric(12,2) NOT NULL
);


ALTER TABLE "public"."purchase_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "supplier_name" "text" NOT NULL,
    "invoice_number" "text",
    "total_amount" numeric(12,2) DEFAULT 0,
    "status" "text" DEFAULT 'completed'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."purchases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."repair_orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "technician_id" "uuid",
    "device_details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "problem_description" "text" NOT NULL,
    "status" character varying(50) DEFAULT 'RECEIVED'::character varying,
    "cost" numeric(12,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."repair_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "rnc" character varying(20),
    "phone" character varying(50),
    "email" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_fiscal_settings" (
    "tenant_id" "uuid" NOT NULL,
    "ncf_threshold" integer DEFAULT 100,
    "notify_whatsapp" boolean DEFAULT false,
    "notify_email" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "auto_send_whatsapp" boolean DEFAULT false,
    "whatsapp_provider" "text" DEFAULT 'beral'::"text",
    "custom_whatsapp_key" "text"
);


ALTER TABLE "public"."tenant_fiscal_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "subdomain" "text" NOT NULL,
    "plan" "text" DEFAULT 'free'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "business_type" "text" DEFAULT 'retail'::"text",
    "whatsapp_auto_send" boolean DEFAULT false,
    "whatsapp_meta_token" "text",
    "whatsapp_phone_id" "text",
    "logo_url" "text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "admin_pin" "text" DEFAULT '0000'::"text",
    CONSTRAINT "tenants_business_type_check" CHECK (("business_type" = ANY (ARRAY['tecnologia'::"text", 'vehiculos'::"text", 'retail'::"text", 'construccion'::"text", 'gastronomia'::"text", 'salud'::"text", 'financiero'::"text", 'servicios'::"text", 'belleza'::"text", 'ong'::"text", 'real_estate'::"text"])))
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tenants"."business_type" IS 'Tipo de negocio para filtrado de UI y lógica de inventario flexible';



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_registers"
    ADD CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_shifts"
    ADD CONSTRAINT "cash_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_tenant_id_phone_key" UNIQUE ("tenant_id", "phone");



ALTER TABLE ONLY "public"."debt_payments"
    ADD CONSTRAINT "debt_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dgii_taxpayers"
    ADD CONSTRAINT "dgii_taxpayers_pkey" PRIMARY KEY ("rnc");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ncf_sequences"
    ADD CONSTRAINT "ncf_sequences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ncf_used_sequences"
    ADD CONSTRAINT "ncf_used_sequences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications_log"
    ADD CONSTRAINT "notifications_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_orders"
    ADD CONSTRAINT "repair_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_fiscal_settings"
    ADD CONSTRAINT "tenant_fiscal_settings_pkey" PRIMARY KEY ("tenant_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_subdomain_key" UNIQUE ("subdomain");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "unique_barcode_tenant" UNIQUE ("barcode", "tenant_id");



CREATE UNIQUE INDEX "customers_tenant_tax_id_unique" ON "public"."customers" USING "btree" ("tenant_id", "tax_id") WHERE ("tax_id" IS NOT NULL);



CREATE INDEX "dgii_taxpayers_company_name_idx" ON "public"."dgii_taxpayers" USING "gin" ("to_tsvector"('"spanish"'::"regconfig", "company_name"));



CREATE INDEX "idx_notifications_status" ON "public"."notifications_log" USING "btree" ("status");



CREATE INDEX "idx_notifications_tenant" ON "public"."notifications_log" USING "btree" ("tenant_id");



CREATE INDEX "idx_products_metadata" ON "public"."products" USING "gin" ("metadata");



CREATE INDEX "ncf_used_sequences_ncf_type_idx" ON "public"."ncf_used_sequences" USING "btree" ("tenant_id", "ncf_type");



CREATE INDEX "ncf_used_sequences_tenant_id_idx" ON "public"."ncf_used_sequences" USING "btree" ("tenant_id");



CREATE INDEX "ncf_used_sequences_used_at_idx" ON "public"."ncf_used_sequences" USING "btree" ("tenant_id", "used_at");



CREATE OR REPLACE TRIGGER "on_payment_inserted" AFTER INSERT ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."process_payment_debt"();



CREATE OR REPLACE TRIGGER "tr_update_dgii_taxpayers_timestamp" BEFORE UPDATE ON "public"."dgii_taxpayers" FOR EACH ROW EXECUTE FUNCTION "public"."update_dgii_taxpayers_timestamp"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_profiles_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."cash_registers"
    ADD CONSTRAINT "cash_registers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_shifts"
    ADD CONSTRAINT "cash_shifts_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "public"."cash_registers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_shifts"
    ADD CONSTRAINT "cash_shifts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_shifts"
    ADD CONSTRAINT "cash_shifts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."cash_shifts"
    ADD CONSTRAINT "cash_shifts_user_id_profiles_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."debt_payments"
    ADD CONSTRAINT "debt_payments_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."debt_payments"
    ADD CONSTRAINT "debt_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."debt_payments"
    ADD CONSTRAINT "debt_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id");



ALTER TABLE ONLY "public"."debts"
    ADD CONSTRAINT "debts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."cash_shifts"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_user_id_profiles_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."ncf_sequences"
    ADD CONSTRAINT "ncf_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ncf_used_sequences"
    ADD CONSTRAINT "ncf_used_sequences_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ncf_used_sequences"
    ADD CONSTRAINT "ncf_used_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_assigned_register_id_fkey" FOREIGN KEY ("assigned_register_id") REFERENCES "public"."cash_registers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_items"
    ADD CONSTRAINT "purchase_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."repair_orders"
    ADD CONSTRAINT "repair_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."repair_orders"
    ADD CONSTRAINT "repair_orders_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."repair_orders"
    ADD CONSTRAINT "repair_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_fiscal_settings"
    ADD CONSTRAINT "tenant_fiscal_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



CREATE POLICY "Acceso perfil propio" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Admins can insert registers" ON "public"."cash_registers" FOR INSERT WITH CHECK (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Admins can update registers" ON "public"."cash_registers" FOR UPDATE USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Lectura pública para autenticados" ON "public"."dgii_taxpayers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Manage Cash Registers" ON "public"."cash_registers" USING (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Permitir inserción a usuarios autenticados" ON "public"."tenants" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Tenant Fiscal Settings Isolation" ON "public"."tenant_fiscal_settings" TO "authenticated" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation" ON "public"."tenants" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation Cash Registers" ON "public"."cash_registers" USING (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Tenant Isolation Cash Shifts" ON "public"."cash_shifts" USING (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Tenant Isolation Customers" ON "public"."customers" USING (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Tenant Isolation Debts" ON "public"."debts" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation Invoices" ON "public"."invoices" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation Items" ON "public"."invoice_items" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation Logs" ON "public"."activity_logs" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation NCF" ON "public"."ncf_sequences" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation Payments" ON "public"."debt_payments" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation Payments" ON "public"."payments" USING (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Tenant Isolation Products" ON "public"."products" TO "authenticated" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation Repair Orders" ON "public"."repair_orders" USING (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Tenant Isolation Settings" ON "public"."tenant_fiscal_settings" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Tenant Isolation Suppliers" ON "public"."suppliers" USING (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Tenant purchase items" ON "public"."purchase_items" USING (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Tenant purchases" ON "public"."purchases" USING (("tenant_id" = (("auth"."jwt"() ->> 'tenant_id'::"text"))::"uuid"));



CREATE POLICY "Tenants view their own notification logs" ON "public"."notifications_log" FOR SELECT USING (("tenant_id" = "auth"."uid"()));



CREATE POLICY "Users can insert products to their tenant" ON "public"."products" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can start shifts" ON "public"."cash_shifts" FOR INSERT WITH CHECK (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update shifts" ON "public"."cash_shifts" FOR UPDATE USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view products from their tenant" ON "public"."products" FOR SELECT TO "authenticated" USING (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own tenant registers" ON "public"."cash_registers" FOR SELECT USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant shifts" ON "public"."cash_shifts" FOR SELECT USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Usuarios ven solo su propio tenant" ON "public"."tenants" FOR SELECT USING (("id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Ver propio tenant" ON "public"."tenants" FOR SELECT USING (("id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cash_registers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cash_shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."debt_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."debts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dgii_taxpayers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ncf_sequences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ncf_used_sequences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_read" ON "public"."dgii_taxpayers" FOR SELECT USING (true);



ALTER TABLE "public"."purchase_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."repair_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_fiscal_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_insert_customers" ON "public"."customers" FOR INSERT WITH CHECK (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "tenant_isolation" ON "public"."ncf_used_sequences" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "tenant_select_customers" ON "public"."customers" FOR SELECT USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "tenant_update_customers" ON "public"."customers" FOR UPDATE USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_stock_safe"("p_product_id" "uuid", "p_qty" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_stock_safe"("p_product_id" "uuid", "p_qty" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_stock_safe"("p_product_id" "uuid", "p_qty" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_next_ncf"("p_tenant_id" "uuid", "p_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_next_ncf"("p_tenant_id" "uuid", "p_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_next_ncf"("p_tenant_id" "uuid", "p_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_stats"("p_tenant_id" "uuid", "p_days" integer, "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"("p_tenant_id" "uuid", "p_days" integer, "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"("p_tenant_id" "uuid", "p_days" integer, "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_customer_debt"("p_customer_id" "uuid", "p_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_customer_debt"("p_customer_id" "uuid", "p_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_customer_debt"("p_customer_id" "uuid", "p_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."process_payment_debt"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_payment_debt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_payment_debt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_dgii_taxpayers_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_dgii_taxpayers_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_dgii_taxpayers_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."cash_registers" TO "anon";
GRANT ALL ON TABLE "public"."cash_registers" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_registers" TO "service_role";



GRANT ALL ON TABLE "public"."cash_shifts" TO "anon";
GRANT ALL ON TABLE "public"."cash_shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_shifts" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."debt_payments" TO "anon";
GRANT ALL ON TABLE "public"."debt_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."debt_payments" TO "service_role";



GRANT ALL ON TABLE "public"."debts" TO "anon";
GRANT ALL ON TABLE "public"."debts" TO "authenticated";
GRANT ALL ON TABLE "public"."debts" TO "service_role";



GRANT ALL ON TABLE "public"."dgii_taxpayers" TO "anon";
GRANT ALL ON TABLE "public"."dgii_taxpayers" TO "authenticated";
GRANT ALL ON TABLE "public"."dgii_taxpayers" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."ncf_sequences" TO "anon";
GRANT ALL ON TABLE "public"."ncf_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."ncf_sequences" TO "service_role";



GRANT ALL ON TABLE "public"."ncf_used_sequences" TO "anon";
GRANT ALL ON TABLE "public"."ncf_used_sequences" TO "authenticated";
GRANT ALL ON TABLE "public"."ncf_used_sequences" TO "service_role";



GRANT ALL ON TABLE "public"."notifications_log" TO "anon";
GRANT ALL ON TABLE "public"."notifications_log" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications_log" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_items" TO "anon";
GRANT ALL ON TABLE "public"."purchase_items" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_items" TO "service_role";



GRANT ALL ON TABLE "public"."purchases" TO "anon";
GRANT ALL ON TABLE "public"."purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."purchases" TO "service_role";



GRANT ALL ON TABLE "public"."repair_orders" TO "anon";
GRANT ALL ON TABLE "public"."repair_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_orders" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_fiscal_settings" TO "anon";
GRANT ALL ON TABLE "public"."tenant_fiscal_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_fiscal_settings" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







