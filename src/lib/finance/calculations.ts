export type InvoiceLine = { description: string; quantity: number; rate_cents: number };
export type LedgerEntry = {
  id: string;
  account_id: string;
  destination_id: string | null;
  kind: string;
  amount_cents: number;
  invoice_id: string | null;
  project_id: string | null;
  phase_id: string | null;
  entry_date: string;
};
export function cents(value: string | number) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error("Enter a valid amount.");
  const result = Math.round((n + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(result) || Math.abs(result) > 100_000_000_000)
    throw new Error("Amount is too large.");
  return result;
}
export function invoiceTotals(lines: InvoiceLine[], taxBps: number) {
  if (!Number.isInteger(taxBps) || taxBps < 0 || taxBps > 10000)
    throw new Error("Tax must be between 0 and 100%.");
  if (!lines.length || lines.length > 50) throw new Error("Add 1 to 50 line items.");
  const subtotal = lines.reduce((sum, line) => {
    if (
      !line.description.trim() ||
      !Number.isFinite(line.quantity) ||
      line.quantity <= 0 ||
      line.quantity > 100000 ||
      !Number.isSafeInteger(line.rate_cents) ||
      line.rate_cents < 0 ||
      line.rate_cents > 100000000
    )
      throw new Error("Check each line item.");
    return sum + Math.round(line.quantity * line.rate_cents);
  }, 0);
  if (subtotal > 100000000000) throw new Error("Invoice total is too large.");
  const tax = Math.round((subtotal * taxBps) / 10000);
  return { subtotal, tax, total: subtotal + tax };
}
export function accountBalance(
  account: { id: string; opening_cents: number },
  entries: LedgerEntry[],
) {
  return entries.reduce(
    (balance, entry) =>
      balance +
      (entry.account_id === account.id
        ? entry.kind === "income"
          ? entry.amount_cents
          : -entry.amount_cents
        : 0) +
      (entry.destination_id === account.id ? entry.amount_cents : 0),
    account.opening_cents,
  );
}
export function invoiceBalance(
  invoice: { id: string; total_cents: number },
  entries: LedgerEntry[],
) {
  return (
    invoice.total_cents -
    entries
      .filter((e) => e.invoice_id === invoice.id && e.kind === "income")
      .reduce((sum, e) => sum + e.amount_cents, 0)
  );
}
export function invoiceStatus(
  invoice: { id: string; total_cents: number; status: string; due_date: string },
  entries: LedgerEntry[],
  today: string,
) {
  if (invoice.status !== "issued") return invoice.status;
  const balance = invoiceBalance(invoice, entries);
  if (balance <= 0) return "paid";
  if (invoice.due_date < today) return "overdue";
  return balance < invoice.total_cents ? "partial" : "issued";
}
export function projectCosts(projectId: string, entries: LedgerEntry[]) {
  return entries
    .filter((e) => e.project_id === projectId && e.kind === "expense")
    .reduce((sum, e) => sum + e.amount_cents, 0);
}
export function cashFlow(entries: LedgerEntry[], from = "", to = "9999-12-31") {
  const period = entries.filter((e) => e.entry_date >= from && e.entry_date <= to);
  const income = period.filter((e) => e.kind === "income").reduce((s, e) => s + e.amount_cents, 0);
  const expenses = period
    .filter((e) => e.kind === "expense")
    .reduce((s, e) => s + e.amount_cents, 0);
  return { income, expenses, net: income - expenses };
}
export function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
}
