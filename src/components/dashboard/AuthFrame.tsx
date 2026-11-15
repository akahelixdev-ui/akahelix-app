import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import floorplan from "@/assets/lab-floorplan.jpg";
import { EASE } from "@/components/site/motion";
import { Wordmark } from "@/components/site/Wordmark";
import { phases } from "@/content/site";

/** Split screen for sign-in screens: the form on white, the lab being built on blue. */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 md:px-10 md:py-8">
        <div className="flex items-center justify-between">
          <a
            href="https://akahelix.com"
            className="transition-opacity hover:opacity-80"
            aria-label="AKAHELIX"
            title="Go to https://akahelix.com"
          >
            <Wordmark />
          </a>
          <a
            href="https://akahelix.com"
            className="label-mono flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
            title="Go to https://akahelix.com"
          >
            <span>Website</span>
            <span aria-hidden>↗</span>
          </a>
        </div>
        <div className="flex flex-1 items-center py-16">
          <div className="mx-auto w-full max-w-[24rem]">{children}</div>
        </div>
        <p className="label-mono text-muted-foreground">Invite only · Client &amp; team access</p>
      </div>

      <aside className="surface-blue relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-10">
        <motion.div
          className="absolute inset-0"
          initial={{ clipPath: "inset(0% 0% 0% 100%)" }}
          animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
          transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
        >
          <motion.img
            src={floorplan}
            alt=""
            className="size-full object-cover opacity-90 mix-blend-luminosity"
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.8, ease: EASE }}
          />
          <div className="absolute inset-0 bg-blue/70" />
        </motion.div>

        <div className="relative flex items-center justify-between">
          <span className="label-mono text-on-blue-muted">Project record</span>
          <span className="ticks w-40 text-on-blue" />
        </div>

        <div className="relative">
          <motion.p
            className="display-md max-w-[16ch]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.5 }}
          >
            Every phase of your laboratory, signed off in one place.
          </motion.p>
          <ol className="mt-10 grid grid-cols-5 border-t border-on-blue-line">
            {phases.map((p, i) => (
              <motion.li
                key={p.n}
                className="border-r border-on-blue-line pr-3 pt-4 last:border-r-0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.7 + i * 0.07 }}
              >
                <span className="label-mono block text-on-blue-muted">{p.n}</span>
                <span className="mt-1 block text-[0.9375rem]">{p.title}</span>
              </motion.li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
