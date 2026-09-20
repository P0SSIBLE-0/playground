import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonStyles } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

export type MiniAppLayoutProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  backLabel?: string;
  children: ReactNode;
};

/**
 * Consistent frame for every mini-app: back navigation,
 * title/description header, optional toolbar actions and content area.
 *
 * Usage:
 *   <MiniAppLayout title="Snake" description="Classic snake game">
 *     <Snake />
 *   </MiniAppLayout>
 */
export function MiniAppLayout({
  title,
  description,
  icon: Icon,
  actions,
  backLabel = "All apps",
  children,
}: MiniAppLayoutProps) {
  return (
    <div>
      <Link
        to="/"
        className={cn(buttonStyles("ghost", "sm"), "-ml-2 mb-5")}
        aria-label="Back to all apps"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {backLabel}
      </Link>

      <div className="mb-6 flex flex-wrap items-start gap-4">
        {Icon !== undefined && (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface-1 text-ink-muted edge-highlight">
            <Icon className="size-5" aria-hidden strokeWidth={1.75} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] leading-[1.2] font-semibold tracking-[-0.6px] text-ink">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-ink-subtle">
            {description}
          </p>
        </div>
        {actions !== undefined && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>

      <section aria-label={`${title} content`}>{children}</section>
    </div>
  );
}
