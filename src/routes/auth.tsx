import { ArrowRight, Eye, EyeSlash } from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";

import { AuthFrame } from "@/components/dashboard/AuthFrame";
import { fieldClass, FieldLabel } from "@/components/dashboard/kit";
import { EASE } from "@/components/site/motion";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth/session";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {},
  head: () => ({
    meta: [
      { title: "Sign in — AKAHELIX" },
      { name: "description", content: "Sign in to the AKAHELIX client and team dashboard." },
      { property: "og:title", content: "Sign in — AKAHELIX" },
      { property: "og:description", content: "Sign in to the AKAHELIX client and team dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function safeDestination(raw: string | undefined) {
  if (raw && raw.startsWith("/dashboard")) return raw;
  return "/dashboard";
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session, ready } = useSession();

  useEffect(() => {
    if (ready && session) {
      void navigate({ to: safeDestination(search.redirect), replace: true });
    }
  }, [ready, session, navigate, search.redirect]);

  return (
    <AuthFrame>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <SignIn destination={safeDestination(search.redirect)} />
      </motion.div>
    </AuthFrame>
  );
}

function Heading({
  n,
  label,
  title,
  body,
}: {
  n: string;
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="mb-10">
      <p className="label-mono mb-5 flex items-center gap-2 text-muted-foreground">
        <span className="text-blue">{n}</span>
        <span className="h-px w-6 bg-border" />
        {label}
      </p>
      <h1 className="text-[2.25rem] leading-[1.02] tracking-[-0.05em]">{title}</h1>
      <p className="mt-3 text-[0.9375rem] text-muted-foreground">{body}</p>
    </div>
  );
}

function Submit({ busy, children }: { busy: boolean; children: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="group flex h-12 w-full items-center justify-between rounded-[4px] bg-blue pl-4 pr-1.5 text-[0.9375rem] font-medium text-on-blue transition-colors duration-300 hover:bg-blue-deep disabled:opacity-60"
    >
      {busy ? "Signing in…" : children}
      <span className="flex size-9 items-center justify-center rounded-[3px] bg-on-blue/15 transition-transform duration-500 ease-out-expo group-hover:translate-x-0.5">
        <ArrowRight className="size-4" />
      </span>
    </button>
  );
}

function ErrorLine({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden text-[0.875rem] text-destructive"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function PasswordField({
  id,
  autoComplete,
  label = "Password",
}: {
  id: string;
  autoComplete: string;
  label?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          required
          autoComplete={autoComplete}
          className={`${fieldClass} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeSlash className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function SignIn({ destination }: { destination: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) {
      setError("That email and password don't match an account.");
    } else {
      void navigate({ to: destination, replace: true });
    }
  }

  return (
    <>
      <Heading
        n="01"
        label="Sign in"
        title="Welcome back."
        body="Follow your laboratory project, sign off phases and message the team."
      />
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue="azad@akahelix.com"
            className={fieldClass}
          />
        </div>
        <PasswordField id="password" autoComplete="current-password" />
        <ErrorLine message={error} />
        <Submit busy={busy}>Sign in</Submit>
      </form>
    </>
  );
}
