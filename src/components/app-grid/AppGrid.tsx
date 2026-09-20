import { motion } from "motion/react";
import { AppCard } from "@/components/app-card/AppCard";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { MiniApp } from "@/types/mini-app";

export type AppGridProps = {
  apps: MiniApp[];
};

/** Responsive grid of registry apps with a subtle stagger entrance. */
export function AppGrid({ apps }: AppGridProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <motion.ul
      className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3"
      initial={reduceMotion ? false : "hidden"}
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.04 } },
      }}
    >
      {apps.map((app) => (
        <motion.li
          key={app.id}
          variants={{
            hidden: { opacity: 0, y: 8 },
            show: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.25, ease: "easeOut" },
            },
          }}
        >
          <AppCard app={app} className="h-full" />
        </motion.li>
      ))}
    </motion.ul>
  );
}
