import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { PackageOpen, Search } from "lucide-react";
import { AppGrid } from "@/components/app-grid/AppGrid";
import { CategorySection } from "@/components/category-section/CategorySection";
import { EmptyState } from "@/components/empty-state/EmptyState";
import {
  apps,
  getAppsByCategory,
  getFeaturedApps,
  searchApps,
} from "@/registry/apps";
import { categories } from "@/registry/categories";

/**
 * Catalog home. Driven entirely by the registry:
 * empty registry → helpful empty state, otherwise a centered hero,
 * search, one featured section (no duplicates below) and
 * per-category sections for everything else.
 */
export function HomePage() {
  const [query, setQuery] = useState("");
  const featured = useMemo(() => getFeaturedApps(), []);
  const results = useMemo(() => searchApps(query), [query]);
  const isSearching = query.trim().length > 0;

  if (apps.length === 0) {
    return (
      <div className="space-y-8">
        <Hero />
        <EmptyState
          icon={PackageOpen}
          title="Your playground is empty"
          description="No mini-apps are registered yet. Create a folder in src/apps, export it, and add one entry to src/registry/apps.ts — it will show up here automatically."
        />
      </div>
    );
  }

  return (
    <div className="space-y-16">
      <Hero
        search={
          <div className="relative mx-auto mt-7 max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-tertiary"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search apps…"
              aria-label="Search apps"
              className="h-11 w-full rounded-full border border-hairline bg-surface-1 pr-4 pl-11 text-sm text-ink edge-highlight placeholder:text-ink-tertiary focus:border-hairline-strong focus:ring-2 focus:ring-primary-focus/50 focus:outline-none"
            />
          </div>
        }
      />

      {isSearching ? (
        <section aria-label="Search results">
          {results.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matches"
              description={`Nothing in the registry matches "${query.trim()}". Try a different search.`}
            />
          ) : (
            <>
              <p className="mb-5 text-center text-xs text-ink-tertiary">
                {results.length} {results.length === 1 ? "result" : "results"}
              </p>
              <AppGrid apps={results} />
            </>
          )}
        </section>
      ) : (
        <>
          {featured.length > 0 && (
            <section aria-labelledby="featured">
              <SectionHeader id="featured" title="Featured" />
              <AppGrid apps={featured} />
            </section>
          )}
          {categories.map((category) => {
            // Featured apps already appear above — never list twice.
            const rest = getAppsByCategory(category.id).filter(
              (app) => !app.featured
            );
            return (
              <CategorySection
                key={category.id}
                category={category}
                apps={rest}
              />
            );
          })}
        </>
      )}
    </div>
  );
}

function SectionHeader({ id, title }: { id: string; title: string }) {
  return (
    <div className="mb-5 flex items-baseline gap-2.5">
      <h2
        id={id}
        className="text-[13px] font-medium tracking-[0.4px] text-ink-subtle uppercase"
      >
        {title}
      </h2>
      <span className="h-px flex-1 self-center bg-hairline" aria-hidden />
    </div>
  );
}

function Hero({ search }: { search?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mx-auto max-w-2xl pt-8 text-center sm:pt-12"
    >
      <p className="text-[13px] font-medium tracking-[0.4px] text-ink-subtle uppercase">
        A collection of tiny apps
      </p>
      <h1 className="mt-3 text-[32px] leading-[1.1] font-semibold tracking-[-0.8px] text-ink sm:text-4xl">
        Welcome to your Playground
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-subtle">
        Games, tools and little experiments — each one independent, all in one
        place.
      </p>
      {search}
    </motion.div>
  );
}
