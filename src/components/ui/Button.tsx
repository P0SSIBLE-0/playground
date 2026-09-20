import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

const variantStyles: Record<ButtonVariant, string> = {
  // button-primary: lavender CTA, 8px corners per DESIGN.md
  primary:
    "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-focus border border-transparent",
  // button-secondary: charcoal button, 1px hairline
  secondary:
    "bg-surface-1 text-ink border border-hairline hover:bg-surface-2 hover:border-hairline-strong active:bg-surface-3",
  // button-tertiary: plain on canvas
  ghost: "bg-transparent text-ink-muted border border-transparent hover:bg-surface-1 hover:text-ink",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-[14px] text-sm",
};

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra?: string,
): string {
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus",
    "disabled:pointer-events-none disabled:opacity-50",
    variantStyles[variant],
    sizeStyles[size],
    extra,
  );
}

type ButtonCommon = {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export type ButtonProps = ButtonCommon &
  (
    | (ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined })
    | (AnchorHTMLAttributes<HTMLAnchorElement> & { to: string })
  );

/** Foundational button / link-button used across shell pages. */
export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className, ...rest } = props;
  const styles = buttonStyles(variant, size, className);
  if (rest.to !== undefined) {
    const { to, ...linkRest } = rest;
    return <Link to={to} className={styles} {...linkRest} />;
  }
  return <button type="button" className={styles} {...rest} />;
}
