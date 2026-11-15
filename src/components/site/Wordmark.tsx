import { cn } from "@/lib/utils";

/** Mark: three offset bands, read as chromosome banding, on a blue tile. */
export function Mark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-7 items-center justify-center rounded-[4px] bg-blue text-on-blue",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 20 20" className="size-4" fill="currentColor">
        <rect x="2" y="3" width="10" height="3" rx="1.5" />
        <rect x="8" y="8.5" width="10" height="3" rx="1.5" />
        <rect x="2" y="14" width="10" height="3" rx="1.5" />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Mark />
      <span className="font-sans text-[1rem] font-medium tracking-[-0.02em]">AKAHELIX</span>
    </span>
  );
}
