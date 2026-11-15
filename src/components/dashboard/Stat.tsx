import { motion } from "motion/react";

import { Counter, EASE } from "@/components/site/motion";
import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  caption,
  index = 0,
  accent = false,
}: {
  label: string;
  value: number;
  caption: string;
  index?: number;
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE, delay: 0.05 + index * 0.06 }}
      className={cn(
        "flex min-h-[9.5rem] flex-col justify-between rounded-[4px] p-5 [--cut:1.5rem]",
        accent ? "surface-blue chamfer" : "border border-border bg-card",
      )}
    >
      <p
        className={cn(
          "label-mono flex items-center gap-2",
          accent ? "text-on-blue-muted" : "text-muted-foreground",
        )}
      >
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span className={cn("h-px w-4", accent ? "bg-on-blue-line" : "bg-border")} />
        {label}
      </p>
      <div>
        <Counter value={value} duration={1.2} className="numeral block text-[3rem]" />
        <p
          className={cn(
            "mt-1 text-[0.8125rem]",
            accent ? "text-on-blue-muted" : "text-muted-foreground",
          )}
        >
          {caption}
        </p>
      </div>
    </motion.div>
  );
}
