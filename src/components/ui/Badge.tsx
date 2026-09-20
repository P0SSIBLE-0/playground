import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "neutral" | "accent";

const variantStyles: Record<BadgeVariant, string> = {
  // status-badge: surface-2 lift, muted text, pill
  neutral:
    "bg-surface-2 text-ink-muted ring-1 ring-hairline ring-inset",
  // Reserved for scarce emphasis: lavender-tinted text on surface-2, never a solid fill
  accent:
    "bg-surface-2 text-primary-hover ring-1 ring-hairline ring-inset",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

/** Small metadata pill (categories, tags, statuses). */
export function Badge({
  variant = "neutral",
  className,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-normal tabular-nums",
        variantStyles[variant],
        className,
      )}
      {...rest}
    />
  );
}
