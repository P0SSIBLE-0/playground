import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { getAppPath } from "@/registry/apps";
import { getCategory } from "@/registry/categories";
import { cn } from "@/lib/cn";
import type { MiniApp } from "@/types/mini-app";

export type AppCardProps = {
  app: MiniApp;
  className?: string;
};

/**
 * Registry-driven card for a single mini-app.
 * Knows nothing about individual apps — everything comes from `app`.
 */
export function AppCard({ app, className }: AppCardProps) {
  const category = getCategory(app.category);
  const Icon = app.icon;
  const CategoryIcon = category.icon;
  const comingSoon = app.status === "coming-soon";

  const card = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg border border-hairline bg-surface-2 text-ink-muted">
          <Icon className="size-[18px]" aria-hidden strokeWidth={1.75} />
        </span>
        {comingSoon ? (
          <Badge variant="accent">Coming soon</Badge>
        ) : (
          <ArrowUpRight
            className="size-4 shrink-0 text-ink-tertiary transition-[color,translate] duration-150 group-hover:translate-x-px group-hover:-translate-y-px group-hover:text-ink-subtle"
            aria-hidden
          />
        )}
      </div>

      <div className="mt-4 space-y-1">
        <h3 className="text-[15px] leading-[1.25] font-medium tracking-[-0.2px] text-ink">
          {app.name}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-ink-subtle">
          {app.description}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Badge>
          <CategoryIcon className="size-3" aria-hidden />
          {category.name}
        </Badge>
        {app.featured === true && !comingSoon && (
          <Badge variant="accent">Featured</Badge>
        )}
      </div>
    </>
  );

  const cardStyles = cn(
    "group flex h-full flex-col rounded-xl border border-hairline bg-surface-1 p-6 transition-colors duration-150 edge-highlight",
    "hover:border-hairline-strong hover:bg-surface-2",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus",
    comingSoon && "opacity-70",
    className,
  );

  if (comingSoon) {
    return (
      <article className={cardStyles} aria-disabled="true" aria-label={`${app.name} (coming soon)`}>
        {card}
      </article>
    );
  }

  return (
    <Link to={getAppPath(app)} className={cardStyles} aria-label={`Open ${app.name}`}>
      {card}
    </Link>
  );
}
