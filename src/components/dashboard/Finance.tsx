import {
  EnvelopeSimple,
  DownloadSimple,
  Plus,
  Printer,
  Trash,
  PencilSimple,
  ArrowRight,
} from "@phosphor-icons/react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { company as siteCompany } from "@/content/site";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/dashboard/use-me";
import {
  accountBalance,
  cashFlow,
  cents,
  invoiceBalance,
  invoiceStatus,
  invoiceTotals,
  money,
  projectCosts,
  type InvoiceLine,
} from "@/lib/finance/calculations";
import { financeQuery, invoiceLines, type Invoice, type Entry } from "@/lib/finance/data";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DashButton, fieldClass, FieldLabel, PageHeader } from "./kit";

type Data = NonNullable<ReturnType<typeof useFinanceData>>;
function useFinanceData() {
  return useSuspenseQuery(financeQuery()).data;
}
type Tab = "Overview" | "Invoices" | "Transactions" | "Project costs" | "Accounts" | "Company";
type Modal =
  | { type: "account" }
  | { type: "entry"; invoice?: Invoice }
  | { type: "invoice"; invoice?: Invoice }
  | { type: "preview"; invoice: Invoice }
  | null;
function today() {
  return new Date().toISOString().slice(0, 10);
}
function value(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}
function check(result: { error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
}

export function FinancePage() {
  const me = useMe();
  return me.isAdmin ? (
    <FinanceWorkspace />
  ) : (
    <>
      <PageHeader n="06" label="Finance" title="Team access only" />
      <p className="text-muted-foreground">Financial records are private to the AKAHELIX team.</p>
    </>
  );
}
function FinanceWorkspace() {
  const data = useFinanceData();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("Overview");
  const [modal, setModal] = useState<Modal>(null);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const currency = data.company?.currency ?? "USD";
  const fmt = (amount: number) => money(amount, currency);
  const mutation = useMutation({
    mutationFn: async (action: () => Promise<void>) => action(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["finance"] });
      setModal(null);
      toast.success("Saved");
    },
    onError: (e) => toast.error(e.message),
  });
  const save = (action: () => Promise<void>) => mutation.mutate(action);
  const ensureCompany = async () => {
    if (!data.company)
      check(
        await supabase
          .from("finance_company")
          .upsert({
            id: true,
            name: siteCompany.legal,
            email: siteCompany.email,
            address: siteCompany.city,
            currency: "USD",
          }),
      );
  };
  const entries = data.entries.filter(
    (e) =>
      (!from || e.entry_date >= from) &&
      (!to || e.entry_date <= to) &&
      `${e.description} ${e.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  const flow = cashFlow(data.entries, from, to || undefined);
  const outstanding = data.invoices
    .filter((i) => i.status === "issued")
    .reduce((s, i) => s + invoiceBalance(i, data.entries), 0);
  const totalBalance = data.accounts.reduce((s, a) => s + accountBalance(a, data.entries), 0);
  function exportLedger() {
    const rows = [
      [
        "Date",
        "Type",
        "Account",
        "Description",
        "Category",
        "Amount",
        "Currency",
        "Project",
        "Invoice",
      ],
      ...entries.map((e) => [
        e.entry_date,
        e.kind,
        data.accounts.find((a) => a.id === e.account_id)?.name ?? "",
        e.description,
        e.category,
        (e.amount_cents / 100).toFixed(2),
        currency,
        data.projects.find((p) => p.id === e.project_id)?.name ?? "",
        data.invoices.find((i) => i.id === e.invoice_id)?.number ?? "",
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map(
            (cell) =>
              `"${String(cell)
                .replace(/^[=+@-]/, "'$&")
                .replaceAll('"', '""')}"`,
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `akahelix-ledger-${today()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageHeader
        n="06"
        label="Company accounts"
        title="Finance"
        actions={
          <>
            <DashButton variant="outline" onClick={exportLedger}>
              <DownloadSimple />
              Export ledger
            </DashButton>
            <DashButton onClick={() => setModal({ type: "invoice" })}>
              <Plus />
              New invoice
            </DashButton>
          </>
        }
      />
      <div
        className="mb-8 flex overflow-x-auto border-b border-border"
        role="tablist"
        aria-label="Finance views"
      >
        {(
          ["Overview", "Invoices", "Transactions", "Project costs", "Accounts", "Company"] as Tab[]
        ).map((t) => (
          <DashButton
            key={t}
            role="tab"
            aria-selected={tab === t}
            variant="ghost"
            className={`h-11 shrink-0 rounded-none border-b-2 ${tab === t ? "border-blue text-blue" : "border-transparent"}`}
            onClick={() => {
              setTab(t);
              setSearch("");
            }}
          >
            {t}
          </DashButton>
        ))}
      </div>
      {(tab === "Overview" || tab === "Transactions") && (
        <div className="mb-6 flex flex-wrap items-end gap-3">
          <Input
            label="From"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            required={false}
          />
          <Input
            label="To"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            required={false}
          />
          {tab === "Transactions" && (
            <Input
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              required={false}
            />
          )}
          <DashButton
            variant="ghost"
            onClick={() => {
              setFrom("");
              setTo("");
              setSearch("");
            }}
          >
            Clear
          </DashButton>
        </div>
      )}
      {tab === "Overview" && (
        <>
          <div className="mb-10 grid gap-px overflow-hidden rounded border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Company balance", totalBalance],
              ["Income · selected period", flow.income],
              ["Expenses · selected period", flow.expenses],
              ["Outstanding invoices · all dates", outstanding],
            ].map(([label, amount]) => (
              <div key={label} className="min-w-0 bg-card p-5">
                <p className="label-mono mb-5 text-muted-foreground">{label}</p>
                <p className="break-all font-mono text-2xl">{fmt(Number(amount))}</p>
              </div>
            ))}
          </div>
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-y border-border py-5">
            <div>
              <p className="label-mono text-muted-foreground">Net cash flow · selected period</p>
              <p className="mt-2 font-mono text-xl text-blue">{fmt(flow.net)}</p>
            </div>
            <DashButton variant="outline" onClick={() => setModal({ type: "entry" })}>
              <Plus />
              Record transaction
            </DashButton>
          </div>
          <div className="grid gap-10 xl:grid-cols-2">
            <section>
              <SectionTitle
                title="Company accounts"
                action={
                  <DashButton variant="ghost" onClick={() => setTab("Accounts")}>
                    View accounts <ArrowRight />
                  </DashButton>
                }
              />
              <AccountList data={data} fmt={fmt} />
              <p className="mt-3 text-xs text-muted-foreground">
                Balances include opening balances. Negative credit balances represent amounts owed.
              </p>
            </section>
            <section>
              <SectionTitle
                title="Recent invoices"
                action={
                  <DashButton variant="ghost" onClick={() => setTab("Invoices")}>
                    All invoices <ArrowRight />
                  </DashButton>
                }
              />
              <InvoiceList
                invoices={data.invoices.slice(0, 5)}
                data={data}
                fmt={fmt}
                onOpen={(i) => setModal({ type: "preview", invoice: i })}
              />
            </section>
          </div>
        </>
      )}
      {tab === "Accounts" && (
        <>
          <SectionTitle
            title="Bank, cash & credit"
            action={
              <DashButton onClick={() => setModal({ type: "account" })}>
                <Plus />
                Add account
              </DashButton>
            }
          />
          <AccountList data={data} fmt={fmt} />
          <p className="mt-4 text-sm text-muted-foreground">
            Credit accounts use a negative opening balance for existing debt. Transfers between
            accounts do not count as income or expenses.
          </p>
        </>
      )}
      {tab === "Invoices" && (
        <>
          <div className="mb-5 max-w-sm">
            <Input
              label="Find invoice"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              required={false}
            />
          </div>
          <InvoiceList
            invoices={data.invoices.filter((i) =>
              `${i.number} ${i.client_name}`.toLowerCase().includes(search.toLowerCase()),
            )}
            data={data}
            fmt={fmt}
            onOpen={(i) => setModal({ type: "preview", invoice: i })}
          />
        </>
      )}
      {tab === "Transactions" && (
        <>
          <SectionTitle
            title="Income, expenses & payments"
            action={
              <DashButton onClick={() => setModal({ type: "entry" })}>
                <Plus />
                Record transaction
              </DashButton>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[660px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  {["Date", "Description", "Account", "Type", "Amount", ""].map((h, i) => (
                    <th key={i} className="px-3 py-3 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-border">
                    <td className="p-3 font-mono text-xs">{e.entry_date}</td>
                    <td className="p-3">
                      {e.description}
                      <p className="text-xs text-muted-foreground">
                        {e.category}
                        {e.invoice_id
                          ? ` · ${data.invoices.find((i) => i.id === e.invoice_id)?.number}`
                          : ""}
                      </p>
                    </td>
                    <td className="p-3">
                      {data.accounts.find((a) => a.id === e.account_id)?.name}
                      {e.destination_id &&
                        ` → ${data.accounts.find((a) => a.id === e.destination_id)?.name}`}
                    </td>
                    <td className="p-3 capitalize">{e.invoice_id ? "Payment" : e.kind}</td>
                    <td className="p-3 text-right font-mono">
                      {e.kind === "expense" ? "−" : e.kind === "income" ? "+" : ""}
                      {fmt(e.amount_cents)}
                    </td>
                    <td className="p-3">
                      <DashButton
                        variant="ghost"
                        aria-label={`Delete ${e.description}`}
                        title="Delete transaction"
                        disabled={mutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Delete this transaction? Account and invoice balances will be recalculated.",
                            )
                          )
                            save(async () => {
                              check(await supabase.from("finance_entries").delete().eq("id", e.id));
                            });
                        }}
                      >
                        <Trash />
                      </DashButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!entries.length && <Empty text="No transactions for these dates." />}
        </>
      )}
      {tab === "Project costs" && (
        <ProjectBudgets data={data} fmt={fmt} save={save} busy={mutation.isPending} />
      )}
      {tab === "Company" && <CompanyForm data={data} save={save} busy={mutation.isPending} />}
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
          <DialogTitle>
            {modal?.type === "account"
              ? "Add company account"
              : modal?.type === "entry"
                ? modal.invoice
                  ? "Record invoice payment"
                  : "Record transaction"
                : modal?.type === "preview"
                  ? modal.invoice.number
                  : modal?.invoice
                    ? "Edit invoice"
                    : "New invoice"}
          </DialogTitle>
          <DialogDescription className="sr-only">AKAHELIX finance record</DialogDescription>
          {modal?.type === "account" && (
            <AccountForm
              busy={mutation.isPending}
              onSave={(form) =>
                save(async () => {
                  await ensureCompany();
                  check(
                    await supabase
                      .from("finance_accounts")
                      .insert({
                        name: value(form, "name"),
                        kind: value(form, "kind"),
                        opening_cents: cents(value(form, "opening")),
                      }),
                  );
                })
              }
            />
          )}
          {modal?.type === "entry" && (
            <EntryForm
              data={data}
              invoice={modal.invoice}
              busy={mutation.isPending}
              onSave={(payload) =>
                save(async () => {
                  await ensureCompany();
                  check(await supabase.from("finance_entries").insert(payload));
                })
              }
            />
          )}
          {modal?.type === "invoice" && (
            <InvoiceForm
              data={data}
              invoice={modal.invoice}
              fmt={fmt}
              busy={mutation.isPending}
              onSave={(payload) =>
                save(async () => {
                  await ensureCompany();
                  if (modal.invoice)
                    check(
                      await supabase
                        .from("finance_invoices")
                        .update(payload)
                        .eq("id", modal.invoice.id),
                    );
                  else check(await supabase.from("finance_invoices").insert(payload));
                })
              }
            />
          )}
          {modal?.type === "preview" && (
            <InvoicePreview
              invoice={modal.invoice}
              data={data}
              fmt={fmt}
              busy={mutation.isPending}
              onEdit={() => setModal({ type: "invoice", invoice: modal.invoice })}
              onPay={() => setModal({ type: "entry", invoice: modal.invoice })}
              onStatus={(status) =>
                save(async () => {
                  check(
                    await supabase
                      .from("finance_invoices")
                      .update({ status })
                      .eq("id", modal.invoice.id),
                  );
                })
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block min-w-0">
      <span className="label-mono mb-2 block text-muted-foreground">{label}</span>
      <input className={fieldClass} required {...props} />
    </label>
  );
}
function Select({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block min-w-0">
      <span className="label-mono mb-2 block text-muted-foreground">{label}</span>
      <select className={fieldClass} {...props}>
        {children}
      </select>
    </label>
  );
}
function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg">{title}</h2>
      {action}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <p className="border-y border-border py-10 text-center text-sm text-muted-foreground">{text}</p>
  );
}
function AccountList({ data, fmt }: { data: Data; fmt: (n: number) => string }) {
  return data.accounts.length ? (
    <div className="divide-y divide-border border-y border-border">
      {data.accounts.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <p className="font-medium">{a.name}</p>
            <p className="label-mono mt-1 text-muted-foreground">{a.kind}</p>
          </div>
          <p className="font-mono text-lg">{fmt(accountBalance(a, data.entries))}</p>
        </div>
      ))}
    </div>
  ) : (
    <Empty text="No company accounts yet." />
  );
}
function InvoiceList({
  invoices,
  data,
  fmt,
  onOpen,
}: {
  invoices: Invoice[];
  data: Data;
  fmt: (n: number) => string;
  onOpen: (i: Invoice) => void;
}) {
  return invoices.length ? (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[550px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            {["Invoice / client", "Due", "Status", "Total", "Balance"].map((h) => (
              <th key={h} className="px-3 py-3 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id} className="border-b border-border">
              <td className="px-3 py-4">
                <DashButton
                  variant="ghost"
                  className="h-auto px-0 text-blue"
                  onClick={() => onOpen(i)}
                >
                  {i.number}
                </DashButton>
                <p className="mt-1 text-muted-foreground">{i.client_name}</p>
              </td>
              <td className="p-3 font-mono text-xs">{i.due_date}</td>
              <td className="p-3 capitalize">{invoiceStatus(i, data.entries, today())}</td>
              <td className="p-3 text-right font-mono">{fmt(i.total_cents)}</td>
              <td className="p-3 text-right font-mono">
                {i.status === "void" ? "—" : fmt(invoiceBalance(i, data.entries))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty text="No invoices yet." />
  );
}
function AccountForm({ onSave, busy }: { onSave: (f: FormData) => void; busy: boolean }) {
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(new FormData(e.currentTarget));
      }}
    >
      <Input label="Account name" name="name" maxLength={200} />
      <Select label="Account type" name="kind">
        <option value="bank">Bank</option>
        <option value="cash">Cash</option>
        <option value="credit">Credit</option>
      </Select>
      <Input label="Opening balance" name="opening" type="number" step="0.01" defaultValue="0" />
      <p className="text-sm text-muted-foreground">
        Enter existing credit debt as a negative balance.
      </p>
      <DashButton type="submit" disabled={busy}>
        Save account
      </DashButton>
    </form>
  );
}
function EntryForm({
  data,
  invoice,
  onSave,
  busy,
}: {
  data: Data;
  invoice?: Invoice | undefined;
  onSave: (e: Omit<Entry, "id" | "created_at">) => void;
  busy: boolean;
}) {
  const [kind, setKind] = useState("income");
  const [project, setProject] = useState(invoice?.project_id ?? "");
  const phases = data.projects.find((p) => p.id === project)?.project_phases ?? [];
  if (!data.accounts.length)
    return <Empty text="Add a company account before recording transactions." />;
  const remaining = invoice ? invoiceBalance(invoice, data.entries) : 0;
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const amount = cents(value(form, "amount"));
      if (amount <= 0) throw new Error("Amount must be greater than zero.");
      if (invoice && amount > remaining)
        throw new Error("Payment exceeds the outstanding balance.");
      const destination = value(form, "destination");
      const account = value(form, "account");
      if (kind === "transfer" && destination === account)
        throw new Error("Choose different source and destination accounts.");
      onSave({
        account_id: account,
        destination_id: kind === "transfer" ? destination : null,
        kind: invoice ? "income" : kind,
        amount_cents: amount,
        entry_date: value(form, "date"),
        description: value(form, "description"),
        category: invoice ? "Invoice payment" : value(form, "category"),
        project_id: kind === "transfer" ? null : project || null,
        phase_id: kind === "transfer" ? null : value(form, "phase") || null,
        invoice_id: invoice?.id ?? null,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Check transaction details.");
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      {invoice ? (
        <p className="font-mono text-blue">
          {invoice.number} · Remaining {money(remaining, data.company?.currency ?? "USD")}
        </p>
      ) : (
        <Select
          label="Type"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setProject("");
          }}
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </Select>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label={kind === "transfer" ? "From account" : "Account"} name="account" required>
          {data.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        {kind === "transfer" ? (
          <Select label="To account" name="destination" required>
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Category"
            name="category"
            required={false}
            defaultValue={invoice ? "Invoice payment" : ""}
            maxLength={200}
          />
        )}
        <Input
          label="Amount"
          type="number"
          name="amount"
          min="0.01"
          step="0.01"
          max={invoice ? remaining / 100 : 1000000000}
          defaultValue={invoice ? (remaining / 100).toFixed(2) : undefined}
        />
        <Input label="Date" type="date" name="date" defaultValue={today()} />
      </div>
      <Input
        label="Description"
        name="description"
        defaultValue={invoice ? `Payment for ${invoice.number}` : ""}
        maxLength={500}
      />
      {kind !== "transfer" && !invoice && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Project (optional)"
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="">None</option>
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.is_sample ? " (Sample)" : ""}
              </option>
            ))}
          </Select>
          <Select key={project} label="Project stage (optional)" name="phase">
            <option value="">None</option>
            {phases
              .sort((a, b) => a.phase_no - b.phase_no)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.phase_no}. {p.title}
                </option>
              ))}
          </Select>
        </div>
      )}
      <DashButton type="submit" disabled={busy}>
        Save {invoice ? "payment" : "transaction"}
      </DashButton>
    </form>
  );
}
function InvoiceForm({
  data,
  invoice,
  fmt,
  onSave,
  busy,
}: {
  data: Data;
  invoice?: Invoice | undefined;
  fmt: (n: number) => string;
  onSave: (payload: {
    number: string;
    client_name: string;
    client_email: string;
    client_address: string;
    issue_date: string;
    due_date: string;
    project_id: string | null;
    lines: InvoiceLine[];
    tax_bps: number;
    notes: string;
    status: string;
  }) => void;
  busy: boolean;
}) {
  const [lines, setLines] = useState<InvoiceLine[]>(
    invoice ? invoiceLines(invoice) : [{ description: "", quantity: 1, rate_cents: 0 }],
  );
  const [tax, setTax] = useState(invoice ? invoice.tax_bps / 100 : 0);
  let totals = { subtotal: 0, tax: 0, total: 0 };
  try {
    totals = invoiceTotals(
      lines.map((l) => ({ ...l, description: l.description || "Item" })),
      Math.round(tax * 100),
    );
  } catch {
    /* Invalid edits cannot be saved. */
  }
  const update = (index: number, payload: Partial<InvoiceLine>) =>
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...payload } : line)));
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const taxBps = Math.round(tax * 100);
      invoiceTotals(lines, taxBps);
      if (value(form, "due") < value(form, "issue"))
        throw new Error("Due date cannot be before issue date.");
      onSave({
        number: value(form, "number"),
        client_name: value(form, "client"),
        client_email: value(form, "email"),
        client_address: value(form, "address"),
        issue_date: value(form, "issue"),
        due_date: value(form, "due"),
        project_id: value(form, "project") || null,
        lines,
        tax_bps: taxBps,
        notes: value(form, "notes"),
        status: invoice?.status ?? "draft",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check invoice details.");
    }
  }
  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Invoice number"
          name="number"
          maxLength={100}
          defaultValue={
            invoice?.number ??
            `INV-${today().replaceAll("-", "")}-${String(data.invoices.length + 1).padStart(3, "0")}`
          }
        />
        <Input
          label="Client / company"
          name="client"
          maxLength={200}
          defaultValue={invoice?.client_name}
        />
        <Input
          label="Client email"
          type="email"
          name="email"
          required={false}
          defaultValue={invoice?.client_email}
        />
        <Input
          label="Client address"
          name="address"
          required={false}
          defaultValue={invoice?.client_address}
        />
        <Input
          label="Issue date"
          type="date"
          name="issue"
          defaultValue={invoice?.issue_date ?? today()}
        />
        <Input
          label="Due date"
          type="date"
          name="due"
          defaultValue={invoice?.due_date ?? today()}
        />
      </div>
      <Select label="Project (optional)" name="project" defaultValue={invoice?.project_id ?? ""}>
        <option value="">None</option>
        {data.projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.is_sample ? " (Sample)" : ""}
          </option>
        ))}
      </Select>
      <div className="space-y-4 border-y border-border py-5">
        {lines.map((line, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_80px_110px_auto]"
          >
            <div className="col-span-3 sm:col-span-1">
              <Input
                label={`Item ${i + 1}`}
                value={line.description}
                maxLength={300}
                onChange={(e) => update(i, { description: e.target.value })}
              />
            </div>
            <Input
              label="Quantity"
              type="number"
              min="0.001"
              max="100000"
              step="0.001"
              value={line.quantity}
              onChange={(e) => update(i, { quantity: Number(e.target.value) })}
            />
            <Input
              label="Rate"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              value={line.rate_cents / 100}
              onChange={(e) => update(i, { rate_cents: cents(e.target.value) })}
            />
            <DashButton
              variant="ghost"
              title="Remove item"
              aria-label={`Remove item ${i + 1}`}
              disabled={lines.length === 1}
              onClick={() => setLines((ls) => ls.filter((_, n) => n !== i))}
            >
              <Trash />
            </DashButton>
          </div>
        ))}
        <DashButton
          variant="outline"
          disabled={lines.length >= 50}
          onClick={() => setLines((ls) => [...ls, { description: "", quantity: 1, rate_cents: 0 }])}
        >
          <Plus />
          Add item
        </DashButton>
      </div>
      <div className="grid items-start gap-5 sm:grid-cols-2">
        <Input
          label="Tax %"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={tax}
          onChange={(e) => setTax(Number(e.target.value))}
        />
        <div className="space-y-2 text-sm">
          <Total label="Subtotal" value={fmt(totals.subtotal)} />
          <Total label="Tax" value={fmt(totals.tax)} />
          <Total label="Total" value={fmt(totals.total)} />
        </div>
      </div>
      <label className="block">
        <FieldLabel>Invoice notes / payment instructions</FieldLabel>
        <textarea
          className={fieldClass}
          name="notes"
          rows={3}
          defaultValue={invoice?.notes ?? data.company?.invoice_notes ?? ""}
        />
      </label>
      <DashButton type="submit" disabled={busy}>
        Save {invoice ? "invoice" : "draft"}
      </DashButton>
    </form>
  );
}
function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
function InvoicePreview({
  invoice,
  data,
  fmt,
  busy,
  onEdit,
  onPay,
  onStatus,
}: {
  invoice: Invoice;
  data: Data;
  fmt: (n: number) => string;
  busy: boolean;
  onEdit: () => void;
  onPay: () => void;
  onStatus: (s: string) => void;
}) {
  const balance = invoiceBalance(invoice, data.entries);
  const paid = data.entries.filter((e) => e.invoice_id === invoice.id);
  const company = data.company;
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <DashButton variant="outline" onClick={printInvoice}>
          <Printer />
          Print / Save PDF
        </DashButton>
        {invoice.status !== "void" && (
          <DashButton
            variant="outline"
            onClick={() => {
              const email =
                invoice.client_email ||
                window.prompt("Send this invoice to which email address?") ||
                "";
              if (!/^\S+@\S+\.\S+$/.test(email)) return;
              window.location.href = invoiceMailto(invoice, data, fmt, email);
              if (invoice.status === "draft") onStatus("issued");
            }}
          >
            <EnvelopeSimple />
            Email invoice
          </DashButton>
        )}
        {!paid.length && invoice.status !== "void" && (
          <DashButton variant="outline" onClick={onEdit}>
            <PencilSimple />
            Edit
          </DashButton>
        )}
        {invoice.status === "draft" && (
          <DashButton disabled={busy} onClick={() => onStatus("issued")}>
            Issue invoice
          </DashButton>
        )}
        {invoice.status === "issued" && balance > 0 && (
          <DashButton disabled={busy} onClick={onPay}>
            <Plus />
            Record payment
          </DashButton>
        )}
        {invoice.status !== "void" && !paid.length && (
          <DashButton
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Void this invoice?")) onStatus("void");
            }}
          >
            Void invoice
          </DashButton>
        )}
      </div>
      <article id="finance-invoice-print" className="bg-card text-foreground">
        <div className="flex flex-wrap justify-between gap-5 border-b border-border pb-7">
          <div>
            <h2 className="text-2xl">{company?.name || siteCompany.legal}</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
              {company?.address || siteCompany.city}
              <br />
              {company?.email || siteCompany.email}
            </p>
            {company?.tax_id && <p className="mt-2 text-xs">Tax ID: {company.tax_id}</p>}
          </div>
          <div className="sm:text-right">
            <p className="label-mono text-blue">Invoice</p>
            <p className="mt-2 font-mono text-lg">{invoice.number}</p>
            <p className="mt-2 text-sm capitalize">
              {invoiceStatus(invoice, data.entries, today())}
            </p>
          </div>
        </div>
        <div className="grid gap-5 py-7 sm:grid-cols-2">
          <div>
            <p className="label-mono mb-2 text-muted-foreground">Bill to</p>
            <p className="font-medium">{invoice.client_name}</p>
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {invoice.client_address}
              <br />
              {invoice.client_email}
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <Total label="Issued" value={invoice.issue_date} />
            <Total label="Due" value={invoice.due_date} />
            {invoice.project_id && (
              <p className="text-muted-foreground">
                {data.projects.find((p) => p.id === invoice.project_id)?.name}
              </p>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border text-left">
                <th className="py-3 font-normal">Description</th>
                <th className="p-2 text-right font-normal">Qty</th>
                <th className="p-2 text-right font-normal">Rate</th>
                <th className="py-3 text-right font-normal">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoiceLines(invoice).map((l, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="max-w-52 break-words py-4 pr-3">{l.description}</td>
                  <td className="p-2 text-right font-mono">{l.quantity}</td>
                  <td className="p-2 text-right font-mono">{fmt(l.rate_cents)}</td>
                  <td className="py-4 text-right font-mono">
                    {fmt(Math.round(l.quantity * l.rate_cents))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ml-auto mt-7 max-w-xs space-y-3 text-sm">
          <Total label="Subtotal" value={fmt(invoice.subtotal_cents)} />
          <Total label={`Tax (${invoice.tax_bps / 100}%)`} value={fmt(invoice.tax_cents)} />
          <Total label="Total" value={fmt(invoice.total_cents)} />
          <Total label="Paid" value={fmt(invoice.total_cents - balance)} />
          <div className="border-t border-border pt-3 font-medium">
            <Total label="Amount due" value={invoice.status === "void" ? "Void" : fmt(balance)} />
          </div>
        </div>
        {invoice.notes && (
          <p className="mt-8 whitespace-pre-line border-t border-border pt-5 text-sm text-muted-foreground">
            {invoice.notes}
          </p>
        )}
        {paid.length > 0 && (
          <div className="mt-7 border-t border-border pt-4">
            <p className="label-mono mb-3">Payment history</p>
            {paid.map((p) => (
              <p key={p.id} className="flex justify-between gap-4 py-1 text-sm">
                <span>
                  {p.entry_date} · {data.accounts.find((a) => a.id === p.account_id)?.name}
                </span>
                <span className="font-mono">{fmt(p.amount_cents)}</span>
              </p>
            ))}
          </div>
        )}
      </article>
    </>
  );
}
function ProjectBudgets({
  data,
  fmt,
  save,
  busy,
}: {
  data: Data;
  fmt: (n: number) => string;
  save: (a: () => Promise<void>) => void;
  busy: boolean;
}) {
  return (
    <>
      {!data.projects.length && <Empty text="No projects yet." />}
      {data.projects.map((project) => {
        const budget = project.project_phases.reduce(
          (sum, phase) =>
            sum + (data.budgets.find((b) => b.phase_id === phase.id)?.budget_cents ?? 0),
          0,
        );
        const cost = projectCosts(project.id, data.entries);
        const income = data.entries
          .filter((e) => e.project_id === project.id && e.kind === "income")
          .reduce((s, e) => s + e.amount_cents, 0);
        return (
          <section key={project.id} className="mb-10">
            <SectionTitle title={`${project.name}${project.is_sample ? " · Sample" : ""}`} />
            <div className="mb-5 grid gap-4 border-y border-border py-4 sm:grid-cols-4">
              {[
                ["Stage budgets", budget],
                ["Actual cost", cost],
                ["Income received", income],
                ["Cash margin", income - cost],
              ].map(([label, amount]) => (
                <div key={label}>
                  <p className="label-mono text-muted-foreground">{label}</p>
                  <p className="mt-2 font-mono">{fmt(Number(amount))}</p>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                save(async () => {
                  check(
                    await supabase
                      .from("finance_budgets")
                      .upsert(
                        project.project_phases.map((p) => ({
                          phase_id: p.id,
                          budget_cents: cents(value(form, p.id)),
                        })),
                      ),
                  );
                });
              }}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[550px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-3 font-normal">Stage</th>
                      <th className="p-3 font-normal">Budget</th>
                      <th className="p-3 text-right font-normal">Actual</th>
                      <th className="py-3 text-right font-normal">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...project.project_phases]
                      .sort((a, b) => a.phase_no - b.phase_no)
                      .map((p) => {
                        const b = data.budgets.find((b) => b.phase_id === p.id)?.budget_cents ?? 0;
                        const actual = data.entries
                          .filter((e) => e.phase_id === p.id && e.kind === "expense")
                          .reduce((s, e) => s + e.amount_cents, 0);
                        return (
                          <tr key={p.id} className="border-b border-border">
                            <td className="py-3">
                              {p.phase_no}. {p.title}
                            </td>
                            <td className="p-3">
                              <input
                                key={b}
                                aria-label={`${project.name} ${p.title} budget`}
                                className={`${fieldClass} max-w-36`}
                                name={p.id}
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                defaultValue={b / 100}
                              />
                            </td>
                            <td className="p-3 text-right font-mono">{fmt(actual)}</td>
                            <td
                              className={`py-3 text-right font-mono ${actual > b ? "text-destructive" : ""}`}
                            >
                              {fmt(b - actual)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <DashButton className="mt-4" variant="outline" type="submit" disabled={busy}>
                Save stage budgets
              </DashButton>
            </form>
            {cost > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Unassigned stage costs:{" "}
                {fmt(
                  data.entries
                    .filter(
                      (e) => e.project_id === project.id && !e.phase_id && e.kind === "expense",
                    )
                    .reduce((s, e) => s + e.amount_cents, 0),
                )}
              </p>
            )}
          </section>
        );
      })}
    </>
  );
}
function CompanyForm({
  data,
  save,
  busy,
}: {
  data: Data;
  save: (a: () => Promise<void>) => void;
  busy: boolean;
}) {
  return (
    <form
      className="max-w-2xl space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        save(async () => {
          check(
            await supabase
              .from("finance_company")
              .upsert({
                id: true,
                name: value(form, "name"),
                email: value(form, "email"),
                address: value(form, "address"),
                tax_id: value(form, "tax_id"),
                currency: value(form, "currency"),
                invoice_notes: value(form, "notes"),
              }),
          );
        });
      }}
    >
      <SectionTitle title="Company & invoice details" />
      <Input
        label="Company name"
        name="name"
        defaultValue={data.company?.name || siteCompany.legal}
      />
      <Input
        label="Company address"
        name="address"
        required={false}
        defaultValue={data.company?.address ?? siteCompany.city}
      />
      <Input
        label="Company email"
        type="email"
        name="email"
        defaultValue={data.company?.email || siteCompany.email}
      />
      <Input
        label="Tax / registration ID"
        name="tax_id"
        required={false}
        defaultValue={data.company?.tax_id}
      />
      <Select
        label="Reporting currency"
        name="currency"
        defaultValue={data.company?.currency ?? "USD"}
        disabled={data.accounts.length > 0 || data.invoices.length > 0}
      >
        <option value="USD">USD · US dollar</option>
        <option value="EUR">EUR · Euro</option>
        <option value="GBP">GBP · British pound</option>
        <option value="BDT">BDT · Bangladeshi taka</option>
      </Select>
      {(data.accounts.length > 0 || data.invoices.length > 0) && (
        <input type="hidden" name="currency" value={data.company?.currency ?? "USD"} />
      )}
      <label className="block">
        <FieldLabel>Default invoice notes / payment instructions</FieldLabel>
        <textarea
          className={fieldClass}
          name="notes"
          rows={4}
          defaultValue={data.company?.invoice_notes}
        />
      </label>
      <p className="text-sm text-muted-foreground">
        Currency is fixed after the first account or invoice. Payments are recorded manually; no
        bank or card processing is connected.
      </p>
      <DashButton type="submit" disabled={busy}>
        Save company details
      </DashButton>
    </form>
  );
}
export function invoiceMailto(
  invoice: Invoice,
  data: { company: { name: string; email: string } | null; entries: Entry[] },
  fmt: (n: number) => string,
  to: string,
) {
  const lines = invoiceLines(invoice).map(
    (l) =>
      `- ${l.description}: ${l.quantity} x ${fmt(l.rate_cents)} = ${fmt(Math.round(l.quantity * l.rate_cents))}`,
  );
  const from = data.company?.name || siteCompany.legal;
  const body = [
    `Dear ${invoice.client_name},`,
    "",
    `Please find invoice ${invoice.number} from ${from} below.`,
    "",
    `Issue date: ${invoice.issue_date}`,
    `Due date: ${invoice.due_date}`,
    "",
    ...lines,
    "",
    `Subtotal: ${fmt(invoice.subtotal_cents)}`,
    `Tax: ${fmt(invoice.tax_cents)}`,
    `Total: ${fmt(invoice.total_cents)}`,
    `Balance due: ${fmt(invoiceBalance(invoice, data.entries))}`,
    ...(invoice.notes ? ["", invoice.notes] : []),
    "",
    "Thank you,",
    from,
  ].join("\n");
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(`Invoice ${invoice.number} from ${from}`)}&body=${encodeURIComponent(body)}`;
}

function printInvoice() {
  const el = document.getElementById("finance-invoice-print");
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!el || !w) return window.print();
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((n) => n.outerHTML)
    .join("");
  w.document.write(
    `<!doctype html><html><head><title>Invoice</title>${styles}<style>@page{size:A4;margin:16mm}body{background:#fff;margin:0;padding:0}#finance-invoice-print{max-width:780px;margin:0 auto;padding:8px}</style></head><body>${el.outerHTML}</body></html>`,
  );
  w.document.close();
  const go = () => {
    w.focus();
    w.print();
    w.close();
  };
  if (w.document.readyState === "complete") setTimeout(go, 400);
  else w.onload = () => setTimeout(go, 200);
}
