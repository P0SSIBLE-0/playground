import {
  Gamepad2,
  ListChecks,
  Music,
  Shapes,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import type { AppCategoryId, CategoryMeta } from "@/types/mini-app";

/**
 * The single source of truth for app categories.
 * To add a category, append one entry here — nothing else needs to change.
 */
export const categories: CategoryMeta[] = [
  {
    id: "games",
    name: "Games",
    description: "Small playable games and arcade classics.",
    icon: Gamepad2,
  },
  {
    id: "tools",
    name: "Tools",
    description: "Handy utilities like calculators and formatters.",
    icon: Wrench,
  },
  {
    id: "media",
    name: "Media",
    description: "Audio, video and other playful media experiments.",
    icon: Music,
  },
  {
    id: "productivity",
    name: "Productivity",
    description: "Focus aids, timers and everyday helpers.",
    icon: ListChecks,
  },
  {
    id: "utilities",
    name: "Utilities",
    description: "System-style helpers and power-user widgets.",
    icon: SlidersHorizontal,
  },
  {
    id: "other",
    name: "Other",
    description: "Experiments and everything that defies categorization.",
    icon: Shapes,
  },
];

export const categoriesById: Record<AppCategoryId, CategoryMeta> =
  Object.fromEntries(categories.map((c) => [c.id, c])) as Record<
    AppCategoryId,
    CategoryMeta
  >;

export function getCategory(id: AppCategoryId): CategoryMeta {
  return categoriesById[id];
}
