import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { fieldClass } from "./kit";

function Wrap({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="label-mono mb-2 block text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
export function TextField({
  label,
  ...p
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <Wrap label={label}>
      <input className={fieldClass} {...p} />
    </Wrap>
  );
}
export function SelectField({
  label,
  children,
  ...p
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <Wrap label={label}>
      <select className={fieldClass} {...p}>
        {children}
      </select>
    </Wrap>
  );
}
export function AreaField({
  label,
  ...p
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <Wrap label={label}>
      <textarea className={`${fieldClass} min-h-24 resize-y`} {...p} />
    </Wrap>
  );
}
export function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}
export function ok(result: { error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
}
