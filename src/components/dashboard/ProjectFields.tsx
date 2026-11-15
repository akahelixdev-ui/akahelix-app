import type { Database } from "@/integrations/supabase/types";

import { SelectField, str, TextField } from "./fields";

type P = Database["public"]["Tables"]["projects"]["Row"];
export const testTypes = [
  "Molecular / PCR",
  "Next-generation sequencing",
  "Pharmacogenomics",
  "Hereditary cancer",
  "Infectious disease",
  "Prenatal / reproductive",
  "Other",
];
export const pathways = [
  "CLIA LDT",
  "CAP accreditation",
  "New York State (NYS)",
  "FDA submission",
  "Not decided yet",
];
export const sampleTypes = [
  "Blood",
  "Saliva",
  "Buccal swab",
  "Tissue / FFPE",
  "Nasopharyngeal swab",
  "Other",
];
export const priorities = [
  ["low", "Low"],
  ["normal", "Normal"],
  ["high", "High"],
  ["urgent", "Urgent"],
] as const;

/** Extra scientific + contact fields shared by the new-project and edit-project forms. */
export function ProjectExtraFields({ p }: { p?: Partial<P> }) {
  return (
    <>
      <p className="label-mono border-t border-border pt-4 text-muted-foreground">Scope</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Test type" name="test_type" defaultValue={p?.test_type ?? ""}>
          <option value="">Choose…</option>
          {testTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </SelectField>
        <SelectField
          label="Approval pathway"
          name="regulatory_pathway"
          defaultValue={p?.regulatory_pathway ?? ""}
        >
          <option value="">Choose…</option>
          {pathways.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </SelectField>
        <SelectField label="Sample type" name="sample_type" defaultValue={p?.sample_type ?? ""}>
          <option value="">Choose…</option>
          {sampleTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </SelectField>
        <SelectField label="Priority" name="priority" defaultValue={p?.priority ?? "normal"}>
          {priorities.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Expected samples / month"
          name="monthly_volume"
          type="number"
          min={0}
          max={10000000}
          defaultValue={p?.monthly_volume ?? ""}
        />
        <TextField
          label="Lab location"
          name="location"
          maxLength={200}
          defaultValue={p?.location ?? ""}
        />
      </div>
      <p className="label-mono border-t border-border pt-4 text-muted-foreground">Lab contact</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Contact name"
          name="contact_name"
          maxLength={200}
          defaultValue={p?.contact_name ?? ""}
        />
        <TextField
          label="Contact email"
          name="contact_email"
          type="email"
          maxLength={320}
          defaultValue={p?.contact_email ?? ""}
        />
        <TextField
          label="Contact phone"
          name="contact_phone"
          maxLength={50}
          defaultValue={p?.contact_phone ?? ""}
        />
      </div>
    </>
  );
}

export function readProjectExtras(f: FormData) {
  const vol = str(f, "monthly_volume");
  return {
    test_type: str(f, "test_type") || null,
    regulatory_pathway: str(f, "regulatory_pathway") || null,
    sample_type: str(f, "sample_type") || null,
    priority: str(f, "priority") || "normal",
    monthly_volume: vol ? Math.max(0, Math.round(Number(vol))) : null,
    location: str(f, "location") || null,
    contact_name: str(f, "contact_name") || null,
    contact_email: str(f, "contact_email") || null,
    contact_phone: str(f, "contact_phone") || null,
  };
}
