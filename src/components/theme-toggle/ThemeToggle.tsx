import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ThemeToggleProps {
  className?: string;
}

/**
 * Binary light/dark switch. Follows the resolved theme (so a "system"
 * setting shows as whichever mode is active); toggling pins an
 * explicit light/dark theme.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "h-6 w-11 shrink-0 rounded-full border border-hairline bg-surface-1 opacity-60",
          className
        )}
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-hairline bg-surface-2 px-0.5 transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus",
        className
      )}
    >
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full bg-surface-1 text-ink-subtle shadow-sm transition-transform duration-200 motion-reduce:transition-none",
          isDark ? "translate-x-5 text-ink" : "translate-x-0"
        )}
      >
        {isDark ? (
          <Moon className="size-3" aria-hidden strokeWidth={2.25} />
        ) : (
          <Sun className="size-3" aria-hidden strokeWidth={2.25} />
        )}
      </span>
    </button>
  );
}
