import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle";

/** Minimal floating pill header: wordmark + nav + theme switch, centered. */
export function SiteHeader() {
  return (
    <header className="sticky top-3 z-40 flex justify-center items-center px-6 sm:top-4">
      <div className="flex w-full max-w-lg items-center justify-between gap-3 rounded-full border border-hairline bg-surface-1/80 py-1.5 pr-1.5 pl-5 shadow-sm backdrop-blur-md h-12 mt-2">
        <Link
          to="/"
          className="rounded-full text-sm font-semibold tracking-[-0.05px] text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-focus"
          aria-label="Playground home"
        >
          Playground
        </Link>

        <nav className="flex items-center gap-1.5" aria-label="Primary">
          {/* <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                "rounded-full px-3 py-1.5 text-sm font-normal transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus",
                isActive
                  ? "bg-surface-2 text-ink"
                  : "text-ink-subtle hover:bg-surface-1 hover:text-ink"
              )
            }
          >
            Home
          </NavLink> */}
          {/* <span className="h-4 w-px bg-hairline" aria-hidden="true" /> */}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
