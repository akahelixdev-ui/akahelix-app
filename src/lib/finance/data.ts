import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { InvoiceLine } from "./calculations";

type Tables = Database["public"]["Tables"];
export type Invoice = Tables["finance_invoices"]["Row"];
export type Account = Tables["finance_accounts"]["Row"];
export type Entry = Tables["finance_entries"]["Row"];
export type FinanceCompany = Tables["finance_company"]["Row"];
export function invoiceLines(invoice: Invoice): InvoiceLine[] {
  return Array.isArray(invoice.lines) ? (invoice.lines as InvoiceLine[]) : [];
}
export const financeQuery = () =>
  queryOptions({
    queryKey: ["finance"],
    queryFn: async () => {
      const [company, accounts, invoices, entries, budgets, projects] = await Promise.all([
        supabase.from("finance_company").select("*").maybeSingle(),
        supabase.from("finance_accounts").select("*").order("created_at"),
        supabase.from("finance_invoices").select("*").order("issue_date", { ascending: false }),
        supabase
          .from("finance_entries")
          .select("*")
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase.from("finance_budgets").select("*"),
        supabase
          .from("projects")
          .select("id, name, is_sample, project_phases(id, title, phase_no)")
          .order("name"),
      ]);
      for (const result of [company, accounts, invoices, entries, budgets, projects])
        if (result.error) throw new Error(result.error.message);
      return {
        company: company.data,
        accounts: accounts.data ?? [],
        invoices: invoices.data ?? [],
        entries: entries.data ?? [],
        budgets: budgets.data ?? [],
        projects: projects.data ?? [],
      };
    },
  });
export type FinanceData = Awaited<
  ReturnType<
    ReturnType<typeof financeQuery>["queryFn"] extends (...args: never[]) => infer R
      ? () => R
      : never
  >
>;
