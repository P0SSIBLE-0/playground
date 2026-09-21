import { Suspense } from "react";
import { Clock } from "lucide-react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { MiniAppLayout } from "@/layouts/MiniAppLayout";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { getAppBySlug } from "@/registry/apps";
import { SongPlayerSkeleton } from "@/apps/song-player/SongPlayerSkeleton";

/** Resolves `:appSlug` from the registry and renders the lazy-loaded app. */
export function MiniAppPage() {
  const { appSlug } = useParams();
  const app = appSlug ? getAppBySlug(appSlug) : undefined;

  if (!app) return <NotFoundPage />;

  if (app.status !== "available") {
    return (
      <MiniAppLayout
        title={app.name}
        description={app.description}
        icon={app.icon}
      >
        <EmptyState
          icon={Clock}
          title="Coming soon"
          description={`${app.name} is registered but isn't available yet. Check back later.`}
        />
      </MiniAppLayout>
    );
  }

  const AppComponent = app.component;

  // Available apps render full-bleed on a blank canvas —
  // no back link, no title block. Site header only.
  return (
    <Suspense fallback={<MiniAppFallback slug={app.slug} name={app.name} />}>
      <AppComponent />
    </Suspense>
  );
}

function MiniAppFallback({ slug, name }: { slug: string; name: string }) {
  if (slug === "song-player") {
    return <SongPlayerSkeleton />;
  }

  return (
    <div
      className="mx-auto flex min-h-[calc(100dvh-14rem)] w-full max-w-2xl items-center justify-center p-4"
      aria-busy="true"
      aria-label={`Loading ${name}`}
      role="status"
    >
      <div className="w-full rounded-xl border border-hairline bg-surface-1 p-6 edge-highlight">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-1/3 rounded bg-surface-3" />
          <div className="h-32 rounded-lg bg-surface-2" />
          <div className="h-4 w-2/3 rounded bg-surface-3" />
        </div>
      </div>
    </div>
  );
}
