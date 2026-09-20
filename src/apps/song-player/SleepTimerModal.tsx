import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Clock, Disc3, Moon, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/IconButton";
import { formatTime } from "./utils";
import type { SleepTimerState } from "./types";

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  timerState: SleepTimerState;
  remainingTrackSeconds?: number;
  onSetTimer: (value: number, mode: "duration" | "end_of_track") => void;
  onCancelTimer: () => void;
  accentColor?: string;
}

const PRESETS = [10, 15, 30] as const;

type TimerChoice = (typeof PRESETS)[number] | "custom" | "end_of_track";

// Transitions-polish: --ease-smooth-out. Typed as a tuple so it stays
// assignable to motion's Easing inside animate/exit targets.
const dialogEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function SleepTimerModal({
  isOpen,
  onClose,
  timerState,
  remainingTrackSeconds = 0,
  onSetTimer,
  onCancelTimer,
  accentColor = "var(--color-primary)",
}: SleepTimerModalProps) {
  const [selectedChoice, setSelectedChoice] = useState<TimerChoice>(() => {
    if (timerState.isActive) {
      if (timerState.mode === "end_of_track") return "end_of_track";
      const mins = Math.round(timerState.totalSeconds / 60);
      if (PRESETS.includes(mins as (typeof PRESETS)[number])) return mins as (typeof PRESETS)[number];
      return "custom";
    }
    return "end_of_track";
  });
  const [customMinutes, setCustomMinutes] = useState<string>("45");

  const handleApply = () => {
    if (selectedChoice === "end_of_track") {
      const remaining = Math.max(1, remainingTrackSeconds);
      onSetTimer(remaining, "end_of_track");
    } else if (selectedChoice === "custom") {
      const parsed = parseInt(customMinutes, 10);
      if (!isNaN(parsed) && parsed > 0) {
        onSetTimer(parsed, "duration");
      }
    } else {
      onSetTimer(selectedChoice, "duration");
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Dialog surface.
              Transitions-polish: modal open --duration-fast (250ms) /
              close --duration-quick (150ms), scale --scale-large (0.96),
              --ease-smooth-out. Exit keeps the enter distance/scale so the
              close reads as the reverse of the open. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { duration: 0.25, ease: dialogEase },
            }}
            exit={{
              opacity: 0,
              scale: 0.96,
              y: 8,
              transition: { duration: 0.15, ease: dialogEase },
            }}
            className="relative z-10 w-full max-w-[320px] rounded-xl border border-hairline bg-surface-1 p-5 shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="flex size-7 items-center justify-center rounded-lg bg-surface-2"
                  style={{ color: accentColor }}
                >
                  <Moon className="size-4" strokeWidth={2} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-ink">Sleep Timer</h3>
                  <p className="text-xs text-ink-tertiary">Fade out and pause</p>
                </div>
              </div>
              <IconButton
                size="sm"
                onClick={onClose}
                aria-label="Close sleep timer dialog"
              >
                <X className="size-4" />
              </IconButton>
            </div>

            {/* Running timer status badge if active */}
            {timerState.isActive && (
              <div
                className="mt-4 flex items-center justify-between rounded-lg border px-3 py-2"
                style={{
                  borderColor: `color-mix(in srgb, ${accentColor} 30%, transparent)`,
                  backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                }}
              >
                <div className="flex items-center gap-2">
                  <Clock className="size-4 animate-pulse" style={{ color: accentColor }} />
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-medium text-ink">
                      {formatTime(timerState.remainingSeconds)} left
                    </span>
                    {timerState.mode === "end_of_track" && (
                      <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-ink-secondary">
                        Track end
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCancelTimer}
                  className="cursor-pointer text-xs font-semibold transition-opacity hover:opacity-80 hover:underline"
                  style={{ color: accentColor }}
                >
                  Turn off
                </button>
              </div>
            )}

            {/* Stop Playback Options */}
            <div className="mt-4 space-y-2">
              <label className="text-xs font-medium text-ink-subtle">
                Choose duration
              </label>

              {/* End of Current Track Option */}
              <button
                type="button"
                onClick={() => setSelectedChoice("end_of_track")}
                style={
                  selectedChoice === "end_of_track"
                    ? {
                        borderColor: accentColor,
                        backgroundColor: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
                      }
                    : undefined
                }
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between rounded-lg border p-2.5 text-left transition-all duration-150",
                  selectedChoice === "end_of_track"
                    ? "border-primary shadow-xs"
                    : "border-hairline bg-surface-2 hover:border-hairline-strong"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex size-7 items-center justify-center rounded-md bg-surface-1"
                    style={{ color: accentColor }}
                  >
                    <Disc3 className="size-4" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-ink">
                      When current track ends
                    </div>
                    <div className="text-[11px] text-ink-tertiary">
                      {remainingTrackSeconds > 0
                        ? `Stops in ${formatTime(remainingTrackSeconds)}`
                        : "Stops when track finishes"}
                    </div>
                  </div>
                </div>
                <div
                  className={cn(
                    "flex size-4.5 items-center justify-center rounded-full border transition-colors",
                    selectedChoice === "end_of_track"
                      ? "border-transparent text-white"
                      : "border-hairline bg-surface-1"
                  )}
                  style={
                    selectedChoice === "end_of_track"
                      ? { backgroundColor: accentColor }
                      : undefined
                  }
                >
                  {selectedChoice === "end_of_track" && (
                    <Check className="size-3" strokeWidth={3} />
                  )}
                </div>
              </button>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-hairline" />
                <span className="shrink-0 px-2 text-[10px] font-medium text-ink-tertiary uppercase tracking-wider">
                  or set timer
                </span>
                <div className="flex-grow border-t border-hairline" />
              </div>

              {/* Presets */}
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSelectedChoice(preset)}
                    style={
                      selectedChoice === preset
                        ? { backgroundColor: accentColor, borderColor: accentColor }
                        : undefined
                    }
                    className={cn(
                      "flex h-9 cursor-pointer items-center justify-center rounded-lg border text-xs font-semibold transition-all duration-150",
                      selectedChoice === preset
                        ? "text-white shadow-xs"
                        : "border-hairline bg-surface-2 text-ink hover:border-hairline-strong"
                    )}
                  >
                    {preset}m
                  </button>
                ))}
              </div>

              {/* Custom input */}
              <div
                onClick={() => setSelectedChoice("custom")}
                style={
                  selectedChoice === "custom"
                    ? {
                        borderColor: accentColor,
                        boxShadow: `0 0 0 1px color-mix(in srgb, ${accentColor} 40%, transparent)`,
                      }
                    : undefined
                }
                className={cn(
                  "mt-1.5 flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition-colors duration-150",
                  selectedChoice === "custom"
                    ? "bg-surface-2"
                    : "border-hairline bg-surface-2 hover:border-hairline-strong"
                )}
              >
                <span className="text-xs font-medium text-ink">Custom time</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={customMinutes}
                    onChange={(e) => {
                      setSelectedChoice("custom");
                      setCustomMinutes(e.target.value);
                    }}
                    style={
                      selectedChoice === "custom"
                        ? { borderColor: accentColor }
                        : undefined
                    }
                    className="h-7 w-14 rounded border border-hairline bg-surface-1 px-2 text-center text-xs font-semibold text-ink focus:outline-none"
                    aria-label="Custom minutes"
                  />
                  <span className="text-xs text-ink-tertiary">min</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={handleApply}
                style={{ backgroundColor: accentColor }}
                className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
              >
                <Check className="size-3.5" strokeWidth={2.5} />
                Set Timer
              </button>
              {timerState.isActive && (
                <button
                  type="button"
                  onClick={() => {
                    onCancelTimer();
                    onClose();
                  }}
                  className="flex h-9 cursor-pointer items-center justify-center rounded-lg border border-hairline px-3 text-xs font-medium text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
