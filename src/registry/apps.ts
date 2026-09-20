import { lazy } from "react";
import { Disc3 } from "lucide-react";
import type { AppCategoryId, MiniApp } from "@/types/mini-app";

/**
 * The single source of truth for all mini-apps.
 *
 * To add an app, create `src/apps/<slug>/`, export the component from
 * `src/apps/<slug>/index.ts`, then append one entry here — no other
 * file needs to change. Routing, the home page and cards all resolve
 * from this list.
 */
export const apps: MiniApp[] = [
  {
    id: "song-player",
    slug: "song-player",
    name: "Song Player",
    description:
      "A quiet vinyl transport for YouTube audio — waveform seeking, repeat and share.",
    category: "media",
    tags: ["audio", "music", "player", "youtube", "vinyl"],
    icon: Disc3,
    component: lazy(() => import("@/apps/song-player")),
    featured: true,
    status: "available",
  },
];

export function getAppBySlug(slug: string): MiniApp | undefined {
  return apps.find((app) => app.slug === slug);
}

export function getAvailableApps(): MiniApp[] {
  return apps.filter((app) => app.status === "available");
}

export function getFeaturedApps(): MiniApp[] {
  return apps.filter((app) => app.status === "available" && app.featured);
}

export function getAppsByCategory(category: AppCategoryId): MiniApp[] {
  return apps.filter(
    (app) => app.category === category && app.status === "available",
  );
}

export function searchApps(query: string): MiniApp[] {
  const q = query.trim().toLowerCase();
  if (!q) return getAvailableApps();
  return getAvailableApps().filter((app) =>
    [app.name, app.description, app.category, ...app.tags]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

/** Canonical URL for a registered app. */
export function getAppPath(app: Pick<MiniApp, "slug">): string {
  return `/apps/${app.slug}`;
}
