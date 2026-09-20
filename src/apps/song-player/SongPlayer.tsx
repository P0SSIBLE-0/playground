import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import {
  ChevronRight,
  Clock,
  ListMusic,
  Moon,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  RotateCw,
  Share2,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/IconButton";
import { getItem, setItem } from "@/lib/storage";
import { AudioEngine, DEFAULT_TRACKS } from "./audioEngine";
import { PlaylistHistoryScreen } from "./PlaylistHistoryScreen";
import { SleepTimerModal } from "./SleepTimerModal";
import type { HistoryItem, PlayerScreen, SleepTimerState, Track } from "./types";
import {
  formatTime,
  getTrackColor,
  sanitizeArtist,
  sanitizeTrackTitle,
} from "./utils";
import { FluidOrb } from "./FluidOrb";

const WAVEFORM_BAR_COUNT = 57;
const STORAGE_HISTORY_KEY = "song_player_history";

/**
 * Transitions-polish spring curve for card expansion / collapse.
 */
const springTransition = {
  type: "spring" as const,
  stiffness: 320,
  damping: 30,
  mass: 1,
};

const screenEase: [number, number, number, number] = [0.22, .95, 0.56, 1];

const screenVariants: Variants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? 8 : -8,
    filter: "blur(5px)",
  }),
  center: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.25,
      ease: screenEase,
    },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -8 : 8,
    filter: "blur(5px)",
    transition: {
      duration: 0.25,
      ease: screenEase,
    },
  }),
};

const BASE_WAVEFORM_HEIGHTS = [
  3, 14, 28, 6, 36, 18, 40, 10, 24, 32, 8, 38, 16, 30, 4, 26, 38, 12, 34, 20,
  6, 35, 20, 12, 9, 8, 26, 18, 28, 4, 38, 12, 24, 34, 10, 40, 16, 30, 6, 22,
  36, 14, 34, 8, 22, 32, 4, 18, 22, 18, 10, 15, 20, 38, 6, 24, 33, 12, 29, 8,
  26, 16, 20, 4, 14, 8, 3,
];

/**
 * Podcast-style ±10s seek button: circular arrow with a "10" badge.
 * Rendered through the shared IconButton so the transport row stays
 * one consistent affordance.
 */
function SeekButton({
  direction,
  onSeek,
}: {
  direction: -10 | 10;
  onSeek: (deltaSeconds: number) => void;
}) {
  const Icon = direction < 0 ? RotateCcw : RotateCw;
  const label = direction < 0 ? "Back 10 seconds" : "Forward 10 seconds";
  return (
    <IconButton aria-label={label} title={label} onClick={() => onSeek(direction)}>
      <span className="relative flex items-center justify-center" aria-hidden="true">
        <Icon className="size-4.5" strokeWidth={2} />
        <span className="absolute mt-px text-[8px] leading-none font-bold">10</span>
      </span>
    </IconButton>
  );
}

export interface SongPlayerProps {
  initialTrack?: Track;
}

export function SongPlayer({ initialTrack }: SongPlayerProps) {
  const shouldReduceMotion = useReducedMotion();

  // Expansion state: miniplayer vs full player
  const [isExpanded, setIsExpanded] = useState(true);
  // View inside expanded mode: 'player' or 'playlist'
  const [currentScreen, setCurrentScreen] = useState<PlayerScreen>("player");
  const [slideDirection, setSlideDirection] = useState<number>(1);
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Tracks & History State
  const [playlist, setPlaylist] = useState<Track[]>(DEFAULT_TRACKS);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const currentTrack = useMemo(
    () => initialTrack || playlist[currentTrackIndex] || DEFAULT_TRACKS[0],
    [initialTrack, playlist, currentTrackIndex]
  );

  // Stable per-track orb color (deterministic hash — never flickers).
  const trackColor = useMemo(
    () => getTrackColor(currentTrack.id),
    [currentTrack.id]
  );

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    return getItem<HistoryItem[]>(STORAGE_HISTORY_KEY, []);
  });

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(currentTrack.duration || 30);
  const [isRepeating, setIsRepeating] = useState(false);

  // Sleep Timer State
  const [sleepTimer, setSleepTimer] = useState<SleepTimerState>({
    isActive: false,
    remainingSeconds: 0,
    totalSeconds: 0,
  });

  // Audio Engine instance (stable singleton)
  const [engine] = useState(() => new AudioEngine());

  // Live repeat flag for the engine's end-of-track callback (see onEnd).
  const repeatRef = useRef(isRepeating);
  useEffect(() => {
    repeatRef.current = isRepeating;
  }, [isRepeating]);

  // Add track to history
  const logTrackToHistory = useCallback((track: Track) => {
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== track.id);
      const updated: HistoryItem[] = [
        { ...track, playedAt: Date.now() },
        ...filtered,
      ].slice(0, 30);
      setItem(STORAGE_HISTORY_KEY, updated);
      return updated;
    });
  }, []);

  // Track loader
  const loadAndPlayTrack = useCallback(
    (track: Track, autoPlay = true) => {
      setCurrentTime(0);
      engine.loadTrack(track, {
        onLoad: (dur) => {
          setDuration(dur > 0 ? dur : track.duration || 30);
          if (autoPlay) {
            engine.play();
            setIsPlaying(true);
            logTrackToHistory(track);
          }
        },
        onPlay: () => setIsPlaying(true),
        onPause: () => setIsPlaying(false),
        onEnd: () => {
          // Read repeat through a ref: this callback is registered once per
          // load and would otherwise close over the stale toggle value.
          if (repeatRef.current) {
            engine.seek(0);
            engine.play();
          } else {
            setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
          }
        },
      });
    },
    [engine, logTrackToHistory, playlist.length]
  );

  // Sync repeat mode with Howler
  useEffect(() => {
    engine.setLoop(isRepeating);
  }, [engine, isRepeating]);

  // Initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAndPlayTrack(currentTrack, false);
    return () => {
      engine.unload();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Time progress sync interval
  useEffect(() => {
    let intervalId: number | null = null;
    if (isPlaying) {
      intervalId = window.setInterval(() => {
        const floored = Math.floor(engine.getSeek());
        // Bail out on identical values so the 250ms poll doesn't
        // re-render the tree when the displayed second hasn't changed.
        setCurrentTime((prev) => (prev === floored ? prev : floored));
      }, 250);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [engine, isPlaying]);

  // Sleep timer interval countdown
  useEffect(() => {
    if (!sleepTimer.isActive) return;

    const timer = window.setInterval(() => {
      setSleepTimer((prev) => {
        if (!prev.isActive) return prev;
        if (prev.remainingSeconds <= 1) {
          engine.fadeOut(1500, () => {
            setIsPlaying(false);
          });
          return { isActive: false, remainingSeconds: 0, totalSeconds: 0 };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [engine, sleepTimer.isActive]);

  // Sleep timer actions
  const handleSetSleepTimer = (minutes: number) => {
    const totalSecs = minutes * 60;
    setSleepTimer({
      isActive: true,
      remainingSeconds: totalSecs,
      totalSeconds: totalSecs,
    });
  };

  const handleCancelSleepTimer = () => {
    setSleepTimer({ isActive: false, remainingSeconds: 0, totalSeconds: 0 });
  };

  // Play / Pause toggle
  const handleTogglePlay = () => {
    if (isPlaying) {
      engine.pause();
      setIsPlaying(false);
    } else {
      engine.play();
      setIsPlaying(true);
      logTrackToHistory(currentTrack);
    }
  };

  // Skip controls
  const handleSkipNext = () => {
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(nextIndex);
    loadAndPlayTrack(playlist[nextIndex], true);
  };

  const handleSkipPrevious = () => {
    if (currentTime > 3) {
      engine.seek(0);
      setCurrentTime(0);
    } else {
      const prevIndex =
        (currentTrackIndex - 1 + playlist.length) % playlist.length;
      setCurrentTrackIndex(prevIndex);
      loadAndPlayTrack(playlist[prevIndex], true);
    }
  };

  // Clamped absolute seek shared by the ±10s buttons and slider keys.
  const seekToTime = useCallback(
    (targetSeconds: number) => {
      const max = engine.getDuration() || duration || 0;
      const target = Math.min(Math.max(0, targetSeconds), max);
      engine.seek(target);
      setCurrentTime(Math.floor(target));
    },
    [engine, duration]
  );

  // Relative seek from the live engine position (fresher than state).
  const handleSeekBy = useCallback(
    (deltaSeconds: number) => {
      seekToTime(engine.getSeek() + deltaSeconds);
    },
    [engine, seekToTime]
  );

  // Seek via waveform click
  const handleWaveformSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = clickPercent * duration;
    engine.seek(targetSeconds);
    setCurrentTime(Math.floor(targetSeconds));
  };

  // Share link handler
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentTrack.audioUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Switch between Player view and Playlist view
  const handleOpenPlaylist = () => {
    setSlideDirection(1);
    setCurrentScreen("playlist");
  };

  const handleBackToPlayer = () => {
    setSlideDirection(-1);
    setCurrentScreen("player");
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative flex items-center justify-center p-4">
      {/* Mini-vinyl rotation & waveform dance keyframes */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes vinyl-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .vinyl-record-spin { animation: vinyl-spin 14s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .vinyl-record-spin { animation: none; } }
        
        @keyframes waveform-dance {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(var(--bar-scale, 1.4)); }
        }
        .waveform-animated {
          animation: waveform-dance var(--anim-speed, 0.9s) ease-in-out var(--anim-delay, 0s) infinite alternate;
        }
        @media (prefers-reduced-motion: reduce) { .waveform-animated { animation: none !important; } }
      `,
        }}
      />

      <AnimatePresence mode="wait" initial={false}>
        {!isExpanded ? (
          /* MINIPLAYER (Collapsed bar) */
          <motion.div
            key="mini-player"
            layoutId="player-card-wrapper"
            transition={springTransition}
            onClick={() => setIsExpanded(true)}
            role="button"
            tabIndex={0}
            aria-label={`Expand player for ${currentTrack.title}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsExpanded(true);
              }
            }}
            style={{ ["--player-accent" as string]: trackColor }}
            className="relative flex w-88 cursor-pointer items-center justify-between rounded-xl border border-hairline bg-surface-1 p-3 transition-colors duration-150 select-none hover:border-hairline-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-focus shadow-md"
          >
            <div className="flex min-w-0 items-center gap-3">
              {/* Spinning mini vinyl */}
              <motion.div
                layoutId="player-vinyl-container"
                transition={springTransition}
                className="relative flex size-12 shrink-0 items-center justify-center"
              >
                <div
                  style={{
                    animationPlayState:
                      isPlaying && !shouldReduceMotion ? "running" : "paused",
                  }}
                  className="vinyl-record-spin relative flex size-11 items-center justify-center rounded-full border border-hairline-strong bg-surface-2"
                >
                  {[38, 30].map((s) => (
                    <div
                      key={s}
                      className="absolute rounded-full border border-hairline"
                      style={{ width: s, height: s }}
                      aria-hidden="true"
                    />
                  ))}

                  <div
                    className="absolute flex size-4.5 items-center justify-center overflow-hidden rounded-full border border-hairline-strong"
                    style={{ backgroundColor: trackColor }}
                  />
                  <div className="absolute z-10 size-1 rounded-full bg-ink" />
                </div>
              </motion.div>

              {/* Mini metadata */}
              <div className="flex min-w-0 flex-col pr-2">
                <motion.span
                  layoutId="player-metadata-title"
                  transition={springTransition}
                  className="truncate text-sm leading-none font-medium tracking-[-0.05px] text-ink"
                >
                  {sanitizeTrackTitle(currentTrack.title, 22)}
                </motion.span>
                <motion.span
                  layoutId="player-metadata-artist"
                  transition={springTransition}
                  className="mt-1 truncate text-xs leading-none text-ink-tertiary"
                >
                  {sanitizeArtist(currentTrack.artist, 22)}
                </motion.span>
              </div>
            </div>

            {/* Mini controls */}
            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                layoutId="player-play-pause-circle"
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePlay();
                }}
                aria-label={isPlaying ? "Pause" : "Play"}
                style={{ backgroundColor: trackColor }}
                className="flex size-8 cursor-pointer items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 active:opacity-80 focus-visible:outline-2 focus-visible:outline-primary-focus"
              >
                {isPlaying ? (
                  <Pause size={14} fill="currentColor" strokeWidth={0} />
                ) : (
                  <Play
                    size={14}
                    className="ml-0.5"
                    fill="currentColor"
                    strokeWidth={0}
                  />
                )}
              </motion.button>

              <div className="flex size-7 items-center justify-center text-ink-tertiary">
                <ChevronRight size={18} strokeWidth={2} />
              </div>
            </div>
          </motion.div>
        ) : (
          /* ============================================================ */
          /* EXPANDED CONTAINER (Persistent Card Shell)                   */
          /* ============================================================ */
          <motion.div
            key="expanded-player-card"
            layoutId="player-card-wrapper"
            layout
            transition={springTransition}
            style={{ ["--player-accent" as string]: trackColor }}
            className="relative flex w-88 flex-col rounded-xl border border-hairline bg-surface-1 p-5 shadow-xl"
          >
            {/* View Switcher: Player View vs Playlist View */}
            <AnimatePresence mode="wait" initial={false} custom={slideDirection}>
              {currentScreen === "player" ? (
                <motion.div
                  key="view-player"
                  custom={slideDirection}
                  variants={screenVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex w-full flex-col items-center"
                >
                  {/* Top Navigation Bar */}
                  <div className="flex w-full items-center justify-between">
                    {/* Sleep timer trigger */}
                    <button
                      type="button"
                      onClick={() => setIsSleepModalOpen(true)}
                      style={sleepTimer.isActive ? { backgroundColor: trackColor } : undefined}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-150 cursor-pointer",
                        sleepTimer.isActive
                          ? "text-white shadow-xs"
                          : "bg-surface-2 text-ink-subtle hover:bg-surface-3 hover:text-ink"
                      )}
                      title="Set sleep timer"
                      aria-label="Set sleep timer"
                    >
                      {sleepTimer.isActive ? (
                        <>
                          <Clock className="size-3 animate-pulse" />
                          <span className="font-mono text-[11px]">
                            {formatTime(sleepTimer.remainingSeconds)}
                          </span>
                        </>
                      ) : (
                        <>
                          <Moon className="size-3.5" style={{ color: trackColor }} />
                          <span className="text-[11px]">Timer</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Playlist button */}
                      <button
                        type="button"
                        onClick={handleOpenPlaylist}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-surface-2 text-ink-subtle transition-colors hover:bg-surface-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-focus active:scale-95"
                        title="Open playlist & history"
                        aria-label="Open playlist and history"
                      >
                        <ListMusic className="size-4" strokeWidth={2.2} />
                      </button>

                      {/* Dark circular Close (X) button collapsing to miniplayer */}
                      <button
                        type="button"
                        onClick={() => setIsExpanded(false)}
                        className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-surface-3 text-ink transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-primary-focus"
                        title="Collapse player"
                        aria-label="Collapse player"
                      >
                        <X className="size-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  {/* Fluid Orb artwork — per-track color, animated while playing */}
                  <motion.div
                    layoutId="player-vinyl-container"
                    transition={springTransition}
                    className="relative mt-2 mb-3 flex size-58 items-center justify-center"
                  >
                    <FluidOrb
                      size={208}
                      color={trackColor}
                      animated={isPlaying && !shouldReduceMotion}
                      role="img"
                      aria-label={`${currentTrack.title} artwork`}
                    />
                  </motion.div>

                  {/* Track Metadata: Sanitized & Restricted Length */}
                  <motion.h2
                    layoutId="player-metadata-title"
                    transition={springTransition}
                    className="w-full truncate px-3 text-center text-[18px] font-semibold tracking-[-0.2px] text-ink"
                    title={currentTrack.title}
                  >
                    {sanitizeTrackTitle(currentTrack.title, 26)}
                  </motion.h2>
                  <motion.p
                    layoutId="player-metadata-artist"
                    transition={springTransition}
                    className="mt-0.5 w-full truncate px-3 text-center text-sm text-ink-subtle"
                    title={currentTrack.artist}
                  >
                    {sanitizeArtist(currentTrack.artist, 28)}
                  </motion.p>

                  {/* Bottom Transport Panel */}
                  <div className="mt-4 flex w-full flex-col gap-3 rounded-xl border border-hairline bg-surface-2 px-3.5 py-5 shadow-sm">
                    {/* Animated Interactive Audio Waveform */}
                    <div
                      onClick={handleWaveformSeek}
                      role="slider"
                      aria-label="Seek track"
                      aria-valuemin={0}
                      aria-valuemax={duration}
                      aria-valuenow={currentTime}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowLeft") {
                          e.preventDefault();
                          handleSeekBy(-10);
                        } else if (e.key === "ArrowRight") {
                          e.preventDefault();
                          handleSeekBy(10);
                        } else if (e.key === "Home") {
                          e.preventDefault();
                          seekToTime(0);
                        } else if (e.key === "End") {
                          e.preventDefault();
                          seekToTime(duration);
                        }
                      }}
                      className="flex h-11 w-full cursor-pointer items-center justify-between select-none px-8 focus-visible:outline-2 focus-visible:outline-primary-focus"
                    >
                      {Array.from({ length: WAVEFORM_BAR_COUNT }).map((_, i) => {
                        const barProgress = (i / (WAVEFORM_BAR_COUNT - 1)) * 100;
                        const isActive = barProgress <= progressPercent;
                        const baseHeight =
                          BASE_WAVEFORM_HEIGHTS[i % BASE_WAVEFORM_HEIGHTS.length];
                        const isPip = baseHeight <= 3.5;

                        const waveScale = isPip ? 1 : 1.15 + (i % 3) * 0.12;
                        const animDuration = `${0.65 + (i % 4) * 0.12}s`;
                        const animDelay = `${(i * 0.02).toFixed(3)}s`;

                        return (
                          <div
                            key={i}
                            className={cn(
                              "w-[1.5px] shrink-0 rounded-full transition-colors duration-150",
                              !isActive && "bg-hairline-strong opacity-45 dark:opacity-35",
                              isPlaying &&
                              !shouldReduceMotion &&
                              !isPip &&
                              "waveform-animated"
                            )}
                            style={{
                              height: baseHeight,
                              backgroundColor: isActive ? trackColor : undefined,
                              transformOrigin: "center",
                              ["--bar-scale" as string]: waveScale,
                              ["--anim-speed" as string]: animDuration,
                              ["--anim-delay" as string]: animDelay,
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Centered Timestamp 00:12 / 00:30 */}
                    <div className="flex justify-center font-mono text-xs font-normal text-ink-tertiary tabular-nums">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>

                    {/* Bottom Controls Row: Repeat, SkipBack, Play/Pause, SkipForward, Share */}
                    <div className="mt-0.5 flex items-center justify-between px-1">
                      {/* Repeat Toggle */}
                      <IconButton
                        onClick={() => setIsRepeating((prev) => !prev)}
                        aria-label={isRepeating ? "Disable repeat" : "Enable repeat"}
                        aria-pressed={isRepeating}
                        tone={isRepeating ? "active" : "default"}
                        style={isRepeating ? { color: trackColor } : undefined}
                      >
                        <Repeat className="size-4" strokeWidth={2.2} />
                      </IconButton>

                      {/* Center Controls: Prev, -10s, Play/Pause, +10s, Next */}
                      <div className="flex items-center gap-2">
                        <IconButton onClick={handleSkipPrevious} aria-label="Previous track">
                          <SkipBack className="size-4 fill-current" strokeWidth={0} />
                        </IconButton>

                        <SeekButton direction={-10} onSeek={handleSeekBy} />

                        <motion.button
                          type="button"
                          layoutId="player-play-pause-circle"
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          onClick={handleTogglePlay}
                          aria-label={isPlaying ? "Pause" : "Play"}
                          style={{ backgroundColor: trackColor }}
                          className="flex size-10 cursor-pointer items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-primary-focus"
                        >
                          {isPlaying ? (
                            <Pause className="size-5 fill-current" strokeWidth={0} />
                          ) : (
                            <Play
                              className="size-5 fill-current ml-0.5"
                              strokeWidth={0}
                            />
                          )}
                        </motion.button>

                        <SeekButton direction={10} onSeek={handleSeekBy} />

                        <IconButton onClick={handleSkipNext} aria-label="Next track">
                          <SkipForward
                            className="size-4 fill-current"
                            strokeWidth={0}
                          />
                        </IconButton>
                      </div>

                      {/* Share Button with Confirmation Toast */}
                      <div className="relative flex items-center">
                        <AnimatePresence>
                          {isCopied && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.96 }}
                              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                              className="pointer-events-none absolute right-0 bottom-full z-30 mb-2 rounded-md border border-hairline bg-surface-3 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-ink shadow-sm"
                            >
                              Copied audio URL!
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <IconButton
                          onClick={handleShare}
                          aria-label="Share audio link"
                          title="Share audio link"
                        >
                          <Share2 className="size-4" strokeWidth={2.2} />
                        </IconButton>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="view-playlist"
                  custom={slideDirection}
                  variants={screenVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex w-full flex-col"
                >
                  <PlaylistHistoryScreen
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    playlist={playlist}
                    history={history}
                    onSelectTrack={(track) => {
                      const idx = playlist.findIndex((t) => t.id === track.id);
                      if (idx !== -1) {
                        setCurrentTrackIndex(idx);
                      } else {
                        setPlaylist((prev) => [track, ...prev]);
                        setCurrentTrackIndex(0);
                      }
                      loadAndPlayTrack(track, true);
                    }}
                    onClearHistory={() => {
                      setHistory([]);
                      setItem(STORAGE_HISTORY_KEY, []);
                    }}
                    onAddCustomTrack={(url, title) => {
                      const newTrack: Track = {
                        id: `custom-${Date.now()}`,
                        title: title || "Stream Track",
                        artist: "Online Stream",
                        audioUrl: url,
                        duration: 30,
                      };
                      setPlaylist((prev) => [newTrack, ...prev]);
                      setCurrentTrackIndex(0);
                      loadAndPlayTrack(newTrack, true);
                    }}
                    onBackToPlayer={handleBackToPlayer}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sleep Timer Configuration Modal */}
      <SleepTimerModal
        isOpen={isSleepModalOpen}
        onClose={() => setIsSleepModalOpen(false)}
        timerState={sleepTimer}
        onSetTimer={handleSetSleepTimer}
        onCancelTimer={handleCancelSleepTimer}
        accentColor={trackColor}
      />
    </div>
  );
}
