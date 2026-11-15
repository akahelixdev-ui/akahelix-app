import { ArrowUpRight } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";

import { EASE } from "@/components/site/motion";
import { phases as phaseCopy } from "@/content/site";
import { currentPhaseIndex, progressOf, type ProjectWithPhases } from "@/lib/dashboard/data";

import { PhaseTrack, ProjectPill, SamplePill, shortDate } from "./kit";

/** One project as a card: where it is, what the next gate is, how far along. */
export function ProjectCard({
  project,
  index = 0,
  showClient = true,
}: {
  project: ProjectWithPhases;
  index?: number;
  showClient?: boolean;
}) {
  const i = currentPhaseIndex(project.project_phases);
  const current = project.project_phases[i];
  const copy = phaseCopy[i];
  const pct = progressOf(project.project_phases);
  const waiting = current?.status === "awaiting_signoff";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE, delay: 0.1 + index * 0.06 }}
    >
      <Link
        to="/dashboard/projects/$projectId"
        params={{ projectId: project.id }}
        className="group block rounded-[4px] border border-border bg-card p-5 transition-colors duration-300 hover:border-foreground/30"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="label-mono truncate text-muted-foreground">{project.lab_name}</p>
            <h3 className="mt-1.5 text-[1.125rem] leading-snug tracking-[-0.025em]">
              {project.name}
            </h3>
          </div>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[3px] border border-border text-muted-foreground transition-all duration-500 ease-out-expo group-hover:border-blue group-hover:bg-blue group-hover:text-on-blue">
            <ArrowUpRight className="size-4" />
          </span>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="numeral text-[2.75rem]">
              {pct}
              <span className="text-[1.25rem] text-muted-foreground">%</span>
            </p>
          </div>
          <div className="text-right">
            <p className="label-mono text-muted-foreground">Now</p>
            <p className="mt-1 text-[0.875rem]">
              {copy?.n ?? "—"} · {current?.title ?? "—"}
            </p>
          </div>
        </div>

        <PhaseTrack phases={project.project_phases} className="mt-4" />

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <ProjectPill status={project.status} />
          {waiting && (
            <span className="label-mono inline-flex h-6 items-center rounded-[3px] bg-blue px-2 text-[0.625rem] text-on-blue">
              Sign-off needed
            </span>
          )}
          {project.is_sample && <SamplePill />}
          <span className="ml-auto text-[0.8125rem] text-muted-foreground">
            {showClient && (project.client?.full_name || "No client yet")}
            {showClient && " · "}
            Target {shortDate(project.target_date)}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
