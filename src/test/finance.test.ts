import { describe, expect, it } from "vitest";
import {
  accountBalance,
  cashFlow,
  cents,
  invoiceBalance,
  invoiceStatus,
  invoiceTotals,
  projectCosts,
  type LedgerEntry,
} from "@/lib/finance/calculations";
const entry = (values: Partial<LedgerEntry>): LedgerEntry => ({
  id: "e",
  account_id: "bank",
  destination_id: null,
  kind: "income",
  amount_cents: 5000,
  invoice_id: null,
  project_id: null,
  phase_id: null,
  entry_date: "2026-11-15",
  ...values,
});
describe("Finance calculations", () => {
  it("calculates quantities, stage rates and invoice tax in cents", () => {
    expect(
      invoiceTotals(
        [
          { description: "Stage 1", quantity: 2.5, rate_cents: 12000 },
          { description: "Stage 2", quantity: 1, rate_cents: 4500 },
        ],
        825,
      ),
    ).toEqual({ subtotal: 34500, tax: 2846, total: 37346 });
  });
  it("converts decimal amounts without losing cents", () => expect(cents("19.99")).toBe(1999));
  it("rejects negative line rates", () =>
    expect(() =>
      invoiceTotals([{ description: "Stage", quantity: 1, rate_cents: -1 }], 0),
    ).toThrow());
  it("subtracts invoice payments from amount due", () =>
    expect(
      invoiceBalance({ id: "inv", total_cents: 10000 }, [
        entry({ invoice_id: "inv", amount_cents: 2500 }),
      ]),
    ).toBe(7500));
  it("marks a fully settled invoice paid", () =>
    expect(
      invoiceStatus(
        { id: "inv", total_cents: 5000, status: "issued", due_date: "2026-11-01" },
        [entry({ invoice_id: "inv" })],
        "2026-11-15",
      ),
    ).toBe("paid"));
  it("marks unpaid invoices overdue after due date", () =>
    expect(
      invoiceStatus(
        { id: "inv", total_cents: 5000, status: "issued", due_date: "2026-11-14" },
        [],
        "2026-11-15",
      ),
    ).toBe("overdue"));
  it("transfers change account balances without becoming income or expenses", () => {
    const entries = [entry({ kind: "transfer", destination_id: "cash", amount_cents: 2000 })];
    expect(accountBalance({ id: "bank", opening_cents: 10000 }, entries)).toBe(8000);
    expect(accountBalance({ id: "cash", opening_cents: 0 }, entries)).toBe(2000);
    expect(cashFlow(entries)).toEqual({ income: 0, expenses: 0, net: 0 });
  });
  it("counts only project expenses as project costs", () =>
    expect(
      projectCosts("project", [
        entry({ project_id: "project", kind: "expense", amount_cents: 1200 }),
        entry({ project_id: "project", kind: "income", amount_cents: 3000 }),
      ]),
    ).toBe(1200));
  it("credit account expenses increase a negative balance", () =>
    expect(
      accountBalance({ id: "bank", opening_cents: -1000 }, [
        entry({ kind: "expense", amount_cents: 500 }),
      ]),
    ).toBe(-1500));
  it("filters income and expense reports by date", () =>
    expect(
      cashFlow(
        [entry({ entry_date: "2026-10-01" }), entry({ kind: "expense", amount_cents: 1000 })],
        "2026-11-01",
        "2026-11-30",
      ),
    ).toEqual({ income: 0, expenses: 1000, net: -1000 }));
});
