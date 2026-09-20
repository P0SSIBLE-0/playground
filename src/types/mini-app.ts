import type { ComponentType, LazyExoticComponent } from "react";
import type { LucideIcon } from "lucide-react";

/** Stable category identifiers. Add new categories in `registry/categories.ts` only. */
export type AppCategoryId =
  | "games"
  | "tools"
  | "media"
  | "productivity"
  | "utilities"
  | "other";

/** Lifecycle status of a mini-app. */
export type AppStatus = "available" | "coming-soon";

/** Display metadata for a category. */
export type CategoryMeta = {
  id: AppCategoryId;
  name: string;
  description: string;
  icon: LucideIcon;
};

/**
 * A mini-app entry in the central registry.
 *
 * To add a new app, create `src/apps/<slug>/`, export the component from
 * `src/apps/<slug>/index.ts`, then append one entry to `registry/apps.ts`:
 *
 *   {
 *     id: "snake",
 *     slug: "snake",
 *     name: "Snake",
 *     description: "Classic snake game",
 *     category: "games",
 *     tags: ["arcade", "keyboard"],
 *     icon: Gamepad2,
 *     component: lazy(() => import("@/apps/snake")),
 *     status: "available",
 *   }
 */
export type MiniApp = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: AppCategoryId;
  tags: string[];
  icon: LucideIcon;
  component: LazyExoticComponent<ComponentType>;
  featured?: boolean;
  status: AppStatus;
};
