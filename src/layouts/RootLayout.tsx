import { motion } from "motion/react";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { SiteHeader } from "@/components/site-header/SiteHeader";

/** App shell: header, main content area and footer (footer on home only). */
export function RootLayout() {
  const { pathname } = useLocation();
  const isAppRoute = pathname.startsWith("/apps/");

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <SiteHeader />
      <motion.main
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-8 sm:py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <Outlet />
      </motion.main>
      {!isAppRoute && (
        <footer className="border-t border-hairline">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="text-[13px] font-medium tracking-[-0.05px] text-ink">
              Playground
            </p>
            <p className="text-xs text-ink-tertiary">
              A home for tiny apps — games, tools and experiments.
            </p>
          </div>
        </footer>
      )}
      <ScrollRestoration />
    </div>
  );
}
