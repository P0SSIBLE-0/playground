import type { ReactNode } from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

/** Generic empty/placeholder panel used by catalog, search and error states. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      className={cn(
        "flex flex-col items-center rounded-xl border border-hairline bg-surface-1 px-6 py-12 text-center edge-highlight",
        className,
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <span className="flex size-11 items-center justify-center rounded-lg border border-hairline bg-surface-2 text-ink-subtle">
        <Icon className="size-5" aria-hidden strokeWidth={1.75} />
      </span>
      <h2 className="mt-4 text-[17px] font-medium tracking-[-0.2px] text-ink">
        {title}
      </h2>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-ink-subtle">
        {description}
      </p>
      {action !== undefined && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
