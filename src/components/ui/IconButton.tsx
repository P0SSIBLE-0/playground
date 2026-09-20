import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type IconButtonSize = "sm" | "md";
type IconButtonTone = "default" | "active" | "primary";

const sizeStyles: Record<IconButtonSize, string> = {
  sm: "size-7",
  md: "size-8",
};

const toneStyles: Record<IconButtonTone, string> = {
  default: "text-ink-subtle hover:bg-surface-2 hover:text-ink",
  active: "bg-surface-2 text-primary hover:text-primary-hover",
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
};

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: IconButtonSize;
  tone?: IconButtonTone;
};

/**
 * Shared icon-only button (player transport, playlist header, dialogs).
 * One affordance: 8px radius, hairline-aware tones, focus ring.
 * Colors transition; the press scale snaps instantly for direct feedback.
 */
export function IconButton({
  size = "md",
  tone = "default",
  type = "button",
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "flex shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors duration-150 active:scale-95",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus",
        "disabled:pointer-events-none disabled:opacity-50",
        sizeStyles[size],
        toneStyles[tone],
        className,
      )}
      {...rest}
    />
  );
}
