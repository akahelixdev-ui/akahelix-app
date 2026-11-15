import { formatDistanceToNowStrict } from "date-fns";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { EASE } from "@/components/site/motion";
import type { InquiryStatus, Phase, PhaseStatus, ProjectStatus } from "@/lib/dashboard/data";
import { inquiryStatusLabel, phaseStatusLabel, projectStatusLabel } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

export function ago(date: string | null | undefined) {
  if (!date) return "—";
  return `${formatDistanceToNowStrict(new Date(date))} ago`;
}

export function shortDate(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function initials(name: string) {
  const parts = name
    .replace(/^(dr\.?|prof\.?)\s+/i, "")
    .trim()
    .split(/\s+/);
  return (
    (
      (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")
    ).toUpperCase() || "·"
  );
}

/** Page title block: numbered mono label, big headline, optional actions. */
export function PageHeader({
  n,
  label,
  title,
  description,
  actions,
}: {
  n: string;
  label: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 pb-8">
      <div className="min-w-0">
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="label-mono mb-4 flex items-center gap-2 text-muted-foreground"
        >
          <span className="text-blue">{n}</span>
          <span className="h-px w-6 bg-border" />
          {label}
        </motion.p>
        <h1 className="overflow-hidden text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.05] tracking-[-0.045em]">
          <motion.span
            className="inline-block"
            initial={{ y: "105%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.05 }}
          >
            {title}
          </motion.span>
        </h1>
        {description && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="mt-3 max-w-[60ch] text-[0.9375rem] text-muted-foreground"
          >
            {description}
          </motion.p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** White card on the mist canvas. */
export function Panel({
  children,
  className,
  delay = 0,
  title,
  meta,
  action,
  bodyClassName,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  title?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE, delay }}
      className={cn("rounded-[4px] border border-border bg-card", className)}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5">
          <div className="flex min-w-0 items-baseline gap-3">
            <h2 className="truncate text-[0.9375rem] font-medium tracking-[-0.015em]">{title}</h2>
            {meta && <span className="label-mono text-muted-foreground">{meta}</span>}
          </div>
          {action}
        </header>
      )}
      <div className={cn(bodyClassName)}>{children}</div>
    </motion.section>
  );
}

const inquiryTone: Record<InquiryStatus, string> = {
  new: "bg-blue text-on-blue",
  in_progress: "bg-blue-soft text-blue",
  booked: "bg-ink text-on-blue",
  closed: "bg-mist text-muted-foreground",
};
const phaseTone: Record<PhaseStatus, string> = {
  not_started: "bg-mist text-muted-foreground",
  in_progress: "bg-blue-soft text-blue",
  awaiting_signoff: "bg-blue text-on-blue",
  signed_off: "bg-ink text-on-blue",
};
const projectTone: Record<ProjectStatus, string> = {
  active: "bg-blue-soft text-blue",
  on_hold: "bg-mist text-muted-foreground",
  complete: "bg-ink text-on-blue",
};

function Pill({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "label-mono inline-flex h-6 shrink-0 items-center gap-1.5 rounded-[3px] px-2 text-[0.625rem]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function InquiryPill({ status }: { status: InquiryStatus }) {
  return <Pill className={inquiryTone[status]}>{inquiryStatusLabel[status]}</Pill>;
}
export function PhasePill({ status }: { status: PhaseStatus }) {
  return <Pill className={phaseTone[status]}>{phaseStatusLabel[status]}</Pill>;
}
export function ProjectPill({ status }: { status: ProjectStatus }) {
  return <Pill className={projectTone[status]}>{projectStatusLabel[status]}</Pill>;
}
export function SamplePill() {
  return (
    <Pill className="border border-dashed border-border bg-transparent text-muted-foreground">
      Sample
    </Pill>
  );
}

/** Five segments, one per phase: ink = signed off, blue = live, mist = not started. */
export function PhaseTrack({
  phases,
  className,
  showLabels,
}: {
  phases: Phase[];
  className?: string;
  showLabels?: boolean;
}) {
  return (
    <div className={cn("w-full", className)}>
      <div className="grid grid-cols-5 gap-1">
        {phases.map((p, i) => (
          <div key={p.id} className="relative h-1.5 overflow-hidden rounded-full bg-mist-deep">
            <motion.div
              className={cn(
                "absolute inset-0 origin-left rounded-full",
                p.status === "signed_off" && "bg-ink",
                p.status === "in_progress" && "bg-blue",
                p.status === "awaiting_signoff" && "bg-blue",
              )}
              initial={{ scaleX: 0 }}
              animate={{
                scaleX: p.status === "not_started" ? 0 : p.status === "in_progress" ? 0.5 : 1,
              }}
              transition={{ duration: 1, ease: EASE, delay: 0.2 + i * 0.08 }}
            />
            {p.status === "awaiting_signoff" && (
              <motion.div
                className="absolute inset-0 bg-on-blue/50"
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
            )}
          </div>
        ))}
      </div>
      {showLabels && (
        <div className="mt-2 grid grid-cols-5 gap-1">
          {phases.map((p) => (
            <span
              key={p.id}
              className={cn(
                "label-mono truncate text-[0.5625rem]",
                p.status === "not_started" ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {String(p.phase_no).padStart(2, "0")} {p.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Avatar({
  name,
  className,
  tone = "blue",
  src,
}: {
  name: string;
  className?: string;
  tone?: "blue" | "ink" | "mist";
  src?: string | null;
}) {
  if (src)
    return (
      <img
        src={src}
        alt=""
        className={cn("size-8 shrink-0 rounded-[4px] object-cover", className)}
      />
    );
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-[4px] font-mono text-[0.6875rem] font-medium",
        tone === "blue" && "bg-blue text-on-blue",
        tone === "ink" && "bg-ink text-on-blue",
        tone === "mist" && "bg-mist-deep text-foreground",
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/** Empty state with a small drawn diagram instead of an icon blob. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <svg
        viewBox="0 0 120 48"
        className="mb-6 h-12 w-32 text-border"
        fill="none"
        stroke="currentColor"
        aria-hidden
      >
        <rect x="1" y="8" width="34" height="32" rx="2" />
        <rect x="43" y="8" width="34" height="32" rx="2" strokeDasharray="3 3" />
        <rect x="85" y="8" width="34" height="32" rx="2" strokeDasharray="3 3" />
        <path d="M8 18h20M8 24h14M8 30h18" className="text-blue" stroke="var(--blue)" />
      </svg>
      <p className="text-[0.9375rem] font-medium">{title}</p>
      <p className="mt-1.5 max-w-[42ch] text-[0.875rem] text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[3px] bg-mist", className)} />;
}

/** Text-style dashboard buttons that match the site's chips. */
export function DashButton({
  children,
  variant = "primary",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger" | "dark";
}) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-[4px] px-3.5 text-[0.8125rem] font-medium tracking-[-0.01em] transition-colors duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
        variant === "primary" && "bg-blue text-on-blue hover:bg-blue-deep",
        variant === "dark" && "bg-ink text-on-blue hover:bg-blue",
        variant === "outline" &&
          "border border-border bg-card text-foreground hover:border-foreground/40",
        variant === "ghost" && "text-muted-foreground hover:bg-mist hover:text-foreground",
        variant === "danger" &&
          "border border-border bg-card text-destructive hover:border-destructive",
        className,
      )}
    >
      {children}
    </button>
  );
}

export const fieldClass =
  "w-full rounded-[4px] border border-border bg-card px-3 py-2.5 text-[0.9375rem] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-blue focus:ring-2 focus:ring-blue/15";

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="label-mono mb-2 block text-muted-foreground">
      {children}
    </label>
  );
}
