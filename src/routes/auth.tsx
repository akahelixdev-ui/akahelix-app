import { ArrowRight, Eye, EyeSlash } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";

import { AuthFrame } from "@/components/dashboard/AuthFrame";
import { fieldClass, FieldLabel } from "@/components/dashboard/kit";
import { EASE } from "@/components/site/motion";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth/session";
import { createOwner, getSetupState } from "@/lib/dashboard/people.functions";

type Mode = "signin" | "forgot" | "setup";

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

const REDIRECT_TARGET = "https://app.akahelix.com/";

function friendlyAuthError(message: string) {
  if (/invalid login credentials/i.test(message))
    return "That email and password don't match an account.";
  if (/email not confirmed/i.test(message))
    return "This account hasn't been confirmed yet. Ask the AKAHELIX team to resend your invite.";
  if (/rate limit|too many/i.test(message))
    return "Too many attempts. Please wait a minute and try again.";
  return message;
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session, ready } = useSession();
  const setupFn = useServerFn(getSetupState);
  const setup = useQuery({
    queryKey: ["setup-state"],
    queryFn: () => setupFn(),
    staleTime: 60_000,
  });
  const [mode, setMode] = useState<Mode>("signin");

  useEffect(() => {
    if (ready && session) {
      window.location.href = REDIRECT_TARGET;
    }
  }, [ready, session]);

  useEffect(() => {
    if (setup.data?.needsOwner) setMode("setup");
  }, [setup.data?.needsOwner]);

  return (
    <AuthFrame>
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {mode === "signin" && <SignIn onForgot={() => setMode("forgot")} />}
          {mode === "forgot" && <Forgot onBack={() => setMode("signin")} />}
          {mode === "setup" && <Setup onDone={() => setMode("signin")} />}
        </motion.div>
      </AnimatePresence>
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
      {busy ? "Please wait…" : children}
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

function SignIn({ onForgot }: { onForgot: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(f.get("email") ?? "").trim(),
      password: String(f.get("password") ?? ""),
    });
    setBusy(false);
    if (error) {
      setError(friendlyAuthError(error.message));
    } else {
      window.location.href = REDIRECT_TARGET;
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
            className={fieldClass}
          />
        </div>
        <PasswordField id="password" autoComplete="current-password" />
        <ErrorLine message={error} />
        <Submit busy={busy}>Sign in</Submit>
      </form>
      <div className="mt-6 flex items-center justify-between text-[0.875rem]">
        <button
          type="button"
          onClick={onForgot}
          className="link-draw text-muted-foreground hover:text-foreground"
        >
          Forgot password?
        </button>
        <span className="text-muted-foreground">No account? Ask your AKAHELIX lead.</span>
      </div>
    </>
  );
}

function Forgot({ onBack }: { onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(
      String(f.get("email") ?? "").trim(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );
    setBusy(false);
    if (error) setError(friendlyAuthError(error.message));
    else setSent(true);
  }

  return (
    <>
      <Heading
        n="02"
        label="Reset password"
        title="Forgot your password?"
        body="Enter your email and we'll send a link to choose a new one."
      />
      {sent ? (
        <div className="rounded-[4px] border border-border bg-mist p-5 text-[0.9375rem]">
          If that email has an account, a reset link is on its way. It can take a minute to arrive.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={fieldClass}
            />
          </div>
          <ErrorLine message={error} />
          <Submit busy={busy}>Send reset link</Submit>
        </form>
      )}
      <button
        type="button"
        onClick={onBack}
        className="link-draw mt-6 text-[0.875rem] text-muted-foreground hover:text-foreground"
      >
        Back to sign in
      </button>
    </>
  );
}

function Setup({ onDone }: { onDone: () => void }) {
  const create = useServerFn(createOwner);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    setBusy(true);
    setError(null);
    try {
      const res = await create({
        data: { fullName: String(f.get("fullName") ?? ""), email, password },
      });
      if (!res.ok) {
        setError(res.error);
        if (/already been set up/.test(res.error)) onDone();
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(friendlyAuthError(error.message));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        /at least 10/.test(msg)
          ? "Use at least 10 characters for the password."
          : /email/i.test(msg)
            ? "Enter a valid email address."
            : "Could not create the account. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Heading
        n="00"
        label="First-time setup"
        title="Create the owner account."
        body="This runs once. The owner can then add team members and client labs from the dashboard."
      />
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <FieldLabel htmlFor="fullName">Full name</FieldLabel>
          <input
            id="fullName"
            name="fullName"
            required
            autoComplete="name"
            className={fieldClass}
            placeholder="Dr. Abul Kalam Azad"
          />
        </div>
        <div>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={fieldClass}
          />
        </div>
        <PasswordField
          id="password"
          autoComplete="new-password"
          label="Password · 10+ characters"
        />
        <ErrorLine message={error} />
        <Submit busy={busy}>Create owner account</Submit>
      </form>
    </>
  );
}
