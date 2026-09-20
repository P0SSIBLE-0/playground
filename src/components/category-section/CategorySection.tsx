import { AppGrid } from "@/components/app-grid/AppGrid";
import type { CategoryMeta, MiniApp } from "@/types/mini-app";

export type CategorySectionProps = {
  category: CategoryMeta;
  apps: MiniApp[];
};

/** Groups a category's apps under a quiet eyebrow header. Renders nothing when empty. */
export function CategorySection({ category, apps }: CategorySectionProps) {
  if (apps.length === 0) return null;

  return (
    <section aria-labelledby={`category-${category.id}`}>
      <div className="mb-5 flex items-baseline gap-2.5">
        <h2
          id={`category-${category.id}`}
          className="text-[13px] font-medium tracking-[0.4px] text-ink-subtle uppercase"
        >
          {category.name}
        </h2>
        <span className="h-px flex-1 self-center bg-hairline" aria-hidden />
      </div>
      <AppGrid apps={apps} />
    </section>
  );
}
