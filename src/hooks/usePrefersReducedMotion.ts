import { useEffect, useState } from "react";

/**
 * Tracks the OS-level `prefers-reduced-motion` setting.
 * Used to tone down list/entrance animations (Motion's `MotionConfig`
 * with `reducedMotion="user"` already covers transform animations).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    setReduced(query.matches);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
