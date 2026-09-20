import { MotionConfig } from "motion/react";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { router } from "@/routes/router";

export default function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
      </MotionConfig>
    </ThemeProvider>
  );
}
