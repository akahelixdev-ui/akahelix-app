CREATE TABLE public.finance_company (id boolean PRIMARY KEY DEFAULT true CHECK (id), name text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '', tax_id text NOT NULL DEFAULT '', currency text NOT NULL DEFAULT 'USD' CHECK(currency IN ('USD','EUR','GBP','BDT')), invoice_notes text NOT NULL DEFAULT '');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_company TO authenticated; GRANT ALL ON public.finance_company TO service_role;
ALTER TABLE public.finance_company ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin finance company" ON public.finance_company FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.finance_accounts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK(char_length(name) BETWEEN 1 AND 200), kind text NOT NULL CHECK(kind IN ('bank','cash','credit')), opening_cents bigint NOT NULL DEFAULT 0 CHECK(abs(opening_cents)<=100000000000), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_accounts TO authenticated; GRANT ALL ON public.finance_accounts TO service_role;
ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin finance accounts" ON public.finance_accounts FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.finance_invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number text NOT NULL UNIQUE CHECK(char_length(number) BETWEEN 1 AND 100), client_name text NOT NULL CHECK(char_length(client_name) BETWEEN 1 AND 200), client_email text NOT NULL DEFAULT '', client_address text NOT NULL DEFAULT '', project_id uuid REFERENCES public.projects(id), issue_date date NOT NULL, due_date date NOT NULL, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','issued','void')), lines jsonb NOT NULL, tax_bps integer NOT NULL DEFAULT 0 CHECK(tax_bps BETWEEN 0 AND 10000), subtotal_cents bigint NOT NULL DEFAULT 0, tax_cents bigint NOT NULL DEFAULT 0, total_cents bigint NOT NULL DEFAULT 0, notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), CHECK(due_date>=issue_date));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_invoices TO authenticated; GRANT ALL ON public.finance_invoices TO service_role;
ALTER TABLE public.finance_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin finance invoices" ON public.finance_invoices FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.finance_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid NOT NULL REFERENCES public.finance_accounts(id), destination_id uuid REFERENCES public.finance_accounts(id), kind text NOT NULL CHECK(kind IN ('income','expense','transfer')), amount_cents bigint NOT NULL CHECK(amount_cents>0 AND amount_cents<=100000000000), entry_date date NOT NULL, description text NOT NULL CHECK(char_length(description) BETWEEN 1 AND 500), category text NOT NULL DEFAULT '', project_id uuid REFERENCES public.projects(id), phase_id uuid REFERENCES public.project_phases(id), invoice_id uuid REFERENCES public.finance_invoices(id), created_at timestamptz NOT NULL DEFAULT now(), CHECK((kind='transfer' AND destination_id IS NOT NULL AND destination_id<>account_id AND invoice_id IS NULL AND project_id IS NULL AND phase_id IS NULL) OR (kind<>'transfer' AND destination_id IS NULL)), CHECK(invoice_id IS NULL OR kind='income'), CHECK(phase_id IS NULL OR project_id IS NOT NULL));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_entries TO authenticated; GRANT ALL ON public.finance_entries TO service_role;
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin finance entries" ON public.finance_entries FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE INDEX finance_entries_invoice ON public.finance_entries(invoice_id);
CREATE INDEX finance_entries_project ON public.finance_entries(project_id);
CREATE TABLE public.finance_budgets (phase_id uuid PRIMARY KEY REFERENCES public.project_phases(id), budget_cents bigint NOT NULL DEFAULT 0 CHECK(budget_cents>=0 AND budget_cents<=100000000000));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_budgets TO authenticated; GRANT ALL ON public.finance_budgets TO service_role;
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin finance budgets" ON public.finance_budgets FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.finance_invoice_totals() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE item jsonb; subtotal bigint:=0; quantity numeric; rate bigint;
BEGIN
 IF jsonb_typeof(NEW.lines)<>'array' OR jsonb_array_length(NEW.lines) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'An invoice needs 1 to 50 items'; END IF;
 IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.finance_entries WHERE invoice_id=OLD.id) THEN
  IF NEW.status='void' OR NEW.lines IS DISTINCT FROM OLD.lines OR NEW.tax_bps<>OLD.tax_bps OR NEW.client_name<>OLD.client_name OR NEW.number<>OLD.number OR NEW.project_id IS DISTINCT FROM OLD.project_id THEN RAISE EXCEPTION 'An invoice with payments cannot be changed or voided'; END IF;
 END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(NEW.lines) LOOP
  quantity:=(item->>'quantity')::numeric; rate:=(item->>'rate_cents')::bigint;
  IF quantity IS NULL OR rate IS NULL OR quantity<=0 OR quantity>100000 OR rate<0 OR rate>100000000 OR char_length(COALESCE(item->>'description','')) NOT BETWEEN 1 AND 300 THEN RAISE EXCEPTION 'Invalid invoice item'; END IF;
  subtotal:=subtotal+round(quantity*rate)::bigint;
 END LOOP;
 IF subtotal>100000000000 THEN RAISE EXCEPTION 'Invoice total is too large'; END IF;
 NEW.subtotal_cents:=subtotal; NEW.tax_cents:=round(subtotal::numeric*NEW.tax_bps/10000)::bigint; NEW.total_cents:=NEW.subtotal_cents+NEW.tax_cents; RETURN NEW;
END; $$;
CREATE TRIGGER finance_invoice_totals BEFORE INSERT OR UPDATE ON public.finance_invoices FOR EACH ROW EXECUTE FUNCTION public.finance_invoice_totals();
CREATE FUNCTION public.finance_validate_entry() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE inv public.finance_invoices; paid bigint;
BEGIN
 IF NEW.phase_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.project_phases WHERE id=NEW.phase_id AND project_id=NEW.project_id) THEN RAISE EXCEPTION 'Stage does not belong to project'; END IF;
 IF NEW.invoice_id IS NOT NULL THEN
  SELECT * INTO inv FROM public.finance_invoices WHERE id=NEW.invoice_id FOR UPDATE;
  IF inv.status IS DISTINCT FROM 'issued' THEN RAISE EXCEPTION 'Only issued invoices accept payments'; END IF;
  IF NEW.project_id IS DISTINCT FROM inv.project_id THEN RAISE EXCEPTION 'Payment project must match invoice'; END IF;
  SELECT COALESCE(sum(amount_cents),0) INTO paid FROM public.finance_entries WHERE invoice_id=NEW.invoice_id AND id<>NEW.id;
  IF paid+NEW.amount_cents>inv.total_cents THEN RAISE EXCEPTION 'Payment exceeds remaining invoice balance'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER finance_validate_entry BEFORE INSERT OR UPDATE ON public.finance_entries FOR EACH ROW EXECUTE FUNCTION public.finance_validate_entry();
CREATE FUNCTION public.finance_currency_lock() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF TG_OP='UPDATE' AND NEW.currency<>OLD.currency AND (EXISTS(SELECT 1 FROM public.finance_accounts) OR EXISTS(SELECT 1 FROM public.finance_invoices)) THEN RAISE EXCEPTION 'Currency cannot change after financial records exist'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER finance_currency_lock BEFORE UPDATE ON public.finance_company FOR EACH ROW EXECUTE FUNCTION public.finance_currency_lock();