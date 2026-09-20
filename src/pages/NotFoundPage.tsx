import { Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/empty-state/EmptyState";

/** Rendered for unknown routes and unknown app slugs. */
export function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="The page you're looking for doesn't exist or the app hasn't been added to the registry yet."
      action={
        <Button to="/" variant="secondary">
          Back to home
        </Button>
      }
    />
  );
}
