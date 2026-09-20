import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Clock,
  History,
  ListMusic,
  Play,
  Plus,
  Trash2,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/IconButton";
import {
  formatRelativeTime,
  formatTime,
  getCoverArt,
  sanitizeArtist,
  sanitizeTrackTitle,
} from "./utils";
import type { HistoryItem, Track } from "./types";

interface PlaylistHistoryScreenProps {
  currentTrack: Track;
  isPlaying: boolean;
  playlist: Track[];
  history: HistoryItem[];
  onSelectTrack: (track: Track) => void;
  onClearHistory: () => void;
  onAddCustomTrack: (audioUrl: string, title?: string) => void;
  onBackToPlayer: () => void;
}

// Transitions-polish: tabs sliding + accordion --duration-fast (250ms) + --ease-smooth-out;
// tab content swaps --duration-quick (150ms) + --ease-in-out (text-swap lane).
// Tuple-typed so it stays assignable to motion's Easing.
const smoothEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function PlaylistHistoryScreen({
  currentTrack,
  isPlaying,
  playlist,
  history,
  onSelectTrack,
  onClearHistory,
  onAddCustomTrack,
  onBackToPlayer,
}: PlaylistHistoryScreenProps) {
  const [activeTab, setActiveTab] = useState<"playlist" | "history">("playlist");
  const [customUrl, setCustomUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    onAddCustomTrack(customUrl.trim(), customTitle.trim() || undefined);
    setCustomUrl("");
    setCustomTitle("");
    setShowAddForm(false);
  };

  return (
    <div className="flex w-full flex-col">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <IconButton
          onClick={onBackToPlayer}
          aria-label="Back to Player"
          title="Back to Player"
        >
          <ArrowLeft className="size-4" strokeWidth={2.2} />
        </IconButton>

        {/* Tab pills with smooth layout transition */}
        <div className="flex items-center rounded-lg border border-hairline bg-surface-2 p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("playlist")}
            className={cn(
              "relative flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors duration-150 cursor-pointer",
              activeTab === "playlist"
                ? "text-ink"
                : "text-ink-subtle hover:text-ink"
            )}
          >
            {activeTab === "playlist" && (
              <motion.span
                layoutId="active-playlist-tab"
                transition={{ duration: 0.25, ease: smoothEase }}
                className="absolute inset-0 rounded-md bg-surface-1 shadow-xs"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <ListMusic className="size-3.5" />
              Playlist
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "relative flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors duration-150 cursor-pointer",
              activeTab === "history"
                ? "text-ink"
                : "text-ink-subtle hover:text-ink"
            )}
          >
            {activeTab === "history" && (
              <motion.span
                layoutId="active-playlist-tab"
                transition={{ duration: 0.25, ease: smoothEase }}
                className="absolute inset-0 rounded-md bg-surface-1 shadow-xs"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <History className="size-3.5" />
              History ({history.length})
            </span>
          </button>
        </div>

        {/* Add audio URL button */}
        <IconButton
          onClick={() => setShowAddForm((prev) => !prev)}
          tone={showAddForm ? "primary" : "default"}
          title="Add audio URL"
          aria-label="Add audio link"
        >
          <Plus className="size-4" strokeWidth={2.2} />
        </IconButton>
      </div>

      {/* Add Custom URL Drawer with smooth height transition */}
      <AnimatePresence>
        {showAddForm && (
          <motion.form
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.25, ease: smoothEase }}
            onSubmit={handleAddSubmit}
            className="mt-3 overflow-hidden space-y-2 rounded-xl border border-hairline bg-surface-2 p-3 text-xs"
          >
            <p className="font-semibold text-ink">Play from custom audio link</p>
            <input
              type="url"
              required
              placeholder="Direct audio URL (mp3, wav, ogg, etc.)"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="h-8 w-full rounded-md border border-hairline bg-surface-1 px-2.5 text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              placeholder="Track title (optional)"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="h-8 w-full rounded-md border border-hairline bg-surface-1 px-2.5 text-ink placeholder:text-ink-tertiary focus:border-primary focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="cursor-pointer rounded px-2.5 py-1 text-ink-subtle hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="cursor-pointer rounded bg-primary px-3 py-1 font-semibold text-on-primary transition-colors hover:bg-primary-hover active:bg-primary-focus"
              >
                Load & Play
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Content List with Stagger Tokens */}
      <div className="mt-3 max-h-88 min-h-65 space-y-1.5 overflow-y-auto pr-0.5">
        <AnimatePresence mode="wait">
          {activeTab === "playlist" ? (
            <motion.div
              key="tab-playlist-list"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="space-y-1.5"
            >
              {playlist.map((track, i) => {
                const isCurrent = track.id === currentTrack.id;
                return (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      ease: smoothEase,
                      delay: Math.min(i, 6) * 0.04, // transitions-polish: --duration-stagger (40ms)
                    }}
                    onClick={() => {
                      onSelectTrack(track);
                      onBackToPlayer();
                    }}
                    className={cn(
                      "group flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition-colors duration-150",
                      isCurrent
                        ? "border-primary/40 bg-surface-2 ring-1 ring-primary/20"
                        : "border-transparent bg-transparent hover:border-hairline hover:bg-surface-2"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-hairline bg-surface-3">
                        <img
                          src={getCoverArt(track.cover, i)}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                        />
                        {isCurrent && isPlaying && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-on-primary">
                            <Volume2 className="size-4 animate-pulse" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4
                          className={cn(
                            "truncate text-xs font-semibold",
                            isCurrent ? "text-primary" : "text-ink"
                          )}
                        >
                          {sanitizeTrackTitle(track.title)}
                        </h4>
                        <p className="truncate text-[11px] text-ink-tertiary">
                          {sanitizeArtist(track.artist)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-2">
                      <span className="font-mono text-[11px] text-ink-tertiary">
                        {formatTime(track.duration || 30)}
                      </span>
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full transition-opacity duration-150",
                          isCurrent
                            ? "bg-primary text-on-primary opacity-100"
                            : "bg-surface-3 text-ink opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <Play className="size-2.5 fill-current ml-0.5" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : history.length === 0 ? (
            <motion.div
              key="tab-history-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center justify-center py-12 text-center text-ink-tertiary"
            >
              <Clock className="size-8 opacity-40 mb-2" />
              <p className="text-xs font-medium">No listening history yet</p>
              <p className="text-[11px] text-ink-subtle mt-0.5">
                Tracks you play will show up here
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="tab-history-list"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="space-y-1.5"
            >
              {history.map((item, i) => {
                const isCurrent = item.id === currentTrack.id;
                return (
                  <motion.div
                    key={`${item.id}-${item.playedAt}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      ease: smoothEase,
                      delay: Math.min(i, 6) * 0.04, // transitions-polish: --duration-stagger (40ms)
                    }}
                    onClick={() => {
                      onSelectTrack(item);
                      onBackToPlayer();
                    }}
                    className={cn(
                      "group flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition-colors duration-150",
                      isCurrent
                        ? "border-primary/40 bg-surface-2 ring-1 ring-primary/20"
                        : "border-transparent bg-transparent hover:border-hairline hover:bg-surface-2"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-hairline bg-surface-3">
                        <img
                          src={getCoverArt(item.cover, i)}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-xs font-semibold text-ink">
                          {sanitizeTrackTitle(item.title)}
                        </h4>
                        <p className="truncate text-[11px] text-ink-tertiary">
                          {sanitizeArtist(item.artist)} • {formatRelativeTime(item.playedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-surface-3 text-ink opacity-0 transition-opacity group-hover:opacity-100">
                        <Play className="size-2.5 fill-current ml-0.5" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History Clear Footer */}
      {activeTab === "history" && history.length > 0 && (
        <div className="mt-3 flex justify-between items-center border-t border-hairline pt-3 text-xs">
          <span className="text-[11px] text-ink-tertiary">
            {history.length} tracks logged
          </span>
          <button
            type="button"
            onClick={onClearHistory}
            className="flex items-center gap-1 cursor-pointer font-medium text-red-500 hover:text-red-400 transition-colors duration-150"
          >
            <Trash2 className="size-3.5" />
            Clear history
          </button>
        </div>
      )}
    </div>
  );
}
