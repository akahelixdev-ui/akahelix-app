import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AuthFrame } from "@/components/dashboard/AuthFrame";
import { fieldClass, FieldLabel } from "@/components/dashboard/kit";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — AKAHELIX" },
      { name: "description", content: "Set a new password for your AKAHELIX dashboard account." },
      { property: "og:title", content: "Choose a new password — AKAHELIX" },
      {
        property: "og:description",
        content: "Set a new password for your AKAHELIX dashboard account.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isRecovery =
      window.location.hash.includes("type=recovery") || window.location.search.includes("code=");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setState("ready");
    });
    void supabase.auth.getSession().then(({ data: s }) => {
      if (s.session && isRecovery) setState("ready");
      else if (!isRecovery) setState("invalid");
    });
    const t = window.setTimeout(() => setState((s) => (s === "checking" ? "invalid" : s)), 6000);
    return () => {
      data.subscription.unsubscribe();
      window.clearTimeout(t);
    };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password") ?? "");
    if (password.length < 10) return setError("Use at least 10 characters.");
    if (password !== String(f.get("confirm") ?? ""))
      return setError("The two passwords don't match.");
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error)
      return setError(
        /pwned|weak|leaked/i.test(error.message)
          ? "That password has appeared in a data breach. Please choose another."
          : error.message,
      );
    toast.success("Password updated");
    void navigate({ to: "/dashboard", replace: true });
  }

  return (
    <AuthFrame>
      <p className="label-mono mb-5 flex items-center gap-2 text-muted-foreground">
        <span className="text-blue">03</span>
        <span className="h-px w-6 bg-border" />
        New password
      </p>
      <h1 className="text-[2.25rem] leading-[1.02] tracking-[-0.05em]">Choose a new password.</h1>
      {state === "invalid" ? (
        <p className="mt-6 text-[0.9375rem] text-muted-foreground">
          This reset link has expired or was already used. Go back to{" "}
          <a href="/auth" className="text-blue underline underline-offset-4">
            sign in
          </a>{" "}
          and request a new one.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          <div>
            <FieldLabel htmlFor="password">New password · 10+ characters</FieldLabel>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              className={fieldClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="confirm">Repeat it</FieldLabel>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
              className={fieldClass}
            />
          </div>
          {error && (
            <p role="alert" className="text-[0.875rem] text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || state !== "ready"}
            className="h-12 w-full rounded-[4px] bg-blue text-[0.9375rem] font-medium text-on-blue transition-colors hover:bg-blue-deep disabled:opacity-60"
          >
            {state === "checking" ? "Checking your link…" : busy ? "Saving…" : "Save new password"}
          </button>
        </form>
      )}
    </AuthFrame>
  );
}
