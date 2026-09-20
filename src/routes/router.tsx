import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "@/layouts/RootLayout";
import { HomePage } from "@/pages/HomePage";
import { MiniAppPage } from "@/pages/MiniAppPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

/**
 * Registry-driven routes. Individual apps are never registered here —
 * `MiniAppPage` resolves `:appSlug` from `registry/apps.ts`, so adding
 * an app requires no router changes.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "apps/:appSlug", element: <MiniAppPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
