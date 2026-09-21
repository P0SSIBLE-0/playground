import { cn } from "@/lib/cn";

const SKELETON_BAR_HEIGHTS = [
  6, 16, 28, 12, 34, 18, 38, 14, 26, 32, 10, 36, 18, 28, 8, 24, 36, 14, 32, 18,
  8, 32, 18, 14, 10, 8, 24, 16, 26, 6, 36, 14, 22, 32, 12, 38, 18, 28, 8, 20,
  34, 16, 32, 10, 20, 30, 6, 16, 20, 16, 10, 14, 18, 36, 8, 22, 30,
];

export function SongPlayerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[calc(100dvh-14rem)] w-full items-center justify-center p-4",
        className
      )}
      aria-busy="true"
      aria-label="Loading Song Player"
      role="status"
    >
      <div className="relative flex w-88 flex-col rounded-xl border border-hairline bg-surface-1 p-5 shadow-xl animate-pulse">
        {/* Top Navigation Bar Skeleton */}
        <div className="flex w-full items-center justify-between">
          <div className="h-6 w-16 rounded-full bg-surface-2" />
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-surface-2" />
            <div className="size-7 rounded-full bg-surface-3" />
          </div>
        </div>

        {/* Fluid Orb Artwork Placeholder */}
        <div className="relative mt-2 mb-3 flex size-58 items-center justify-center mx-auto">
          <div className="size-52 rounded-full border border-hairline bg-surface-2/70" />
        </div>

        {/* Title & Artist Skeleton */}
        <div className="flex flex-col items-center gap-2 w-full px-3">
          <div className="h-5 w-44 rounded-md bg-surface-2" />
          <div className="h-3.5 w-28 rounded-md bg-surface-3/70" />
        </div>

        {/* Bottom Transport Panel Skeleton */}
        <div className="mt-4 flex w-full flex-col gap-3 rounded-xl border border-hairline bg-surface-2 px-3.5 py-5 shadow-xs">
          {/* Static Waveform Bars Skeleton */}
          <div className="flex h-11 w-full items-center justify-between select-none px-8">
            {SKELETON_BAR_HEIGHTS.map((height, i) => (
              <div
                key={i}
                className="w-[1.5px] shrink-0 rounded-full bg-hairline-strong opacity-40 dark:opacity-30"
                style={{ height }}
              />
            ))}
          </div>

          {/* Centered Timestamp 00:00 / --:-- */}
          <div className="mx-auto h-3 w-20 rounded bg-surface-3/60" />

          {/* Bottom Controls Row Skeleton */}
          <div className="mt-0.5 flex items-center justify-between px-1">
            {/* Repeat */}
            <div className="size-8 rounded-md bg-surface-3/40" />

            {/* Center Controls: Prev, -10s, Play, +10s, Next */}
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-md bg-surface-3/40" />
              <div className="size-8 rounded-md bg-surface-3/40" />
              <div className="size-10 rounded-full bg-surface-3 shadow-xs" />
              <div className="size-8 rounded-md bg-surface-3/40" />
              <div className="size-8 rounded-md bg-surface-3/40" />
            </div>

            {/* Share */}
            <div className="size-8 rounded-md bg-surface-3/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
