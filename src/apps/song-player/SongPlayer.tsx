import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import {
  ChevronRight,
  Clock,
  ListMusic,
  Loader2,
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
  fetchAudioDuration,
  formatTime,
  generateRandomTrackName,
  getTrackColor,
  getTrackGradientDataUrl,
  sanitizeArtist,
  sanitizeTrackTitle,
} from "./utils";
import { FluidOrb } from "./FluidOrb";

const WAVEFORM_BAR_COUNT = 57;
const STORAGE_HISTORY_KEY = "song_player_history";
const STORAGE_PLAYLIST_KEY = "song_player_playlist";

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
  disabled,
}: {
  direction: -10 | 10;
  onSeek: (deltaSeconds: number) => void;
  disabled?: boolean;
}) {
  const Icon = direction < 0 ? RotateCcw : RotateCw;
  const label = direction < 0 ? "Back 10 seconds" : "Forward 10 seconds";
  return (
    <IconButton
      aria-label={label}
      title={label}
      onClick={() => onSeek(direction)}
      disabled={disabled}
    >
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

  // Tracks & History State (playlist persists so deletes stick).
  const [playlist, setPlaylist] = useState<Track[]>(() => {
    const stored = getItem<Track[]>(STORAGE_PLAYLIST_KEY, DEFAULT_TRACKS);
    return Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_TRACKS;
  });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const currentTrack: Track | undefined = useMemo(
    () => initialTrack || playlist[currentTrackIndex],
    [initialTrack, playlist, currentTrackIndex]
  );

  // Display fallback so an emptied playlist never crashes the views.
  const displayTrack: Track = useMemo(
    () =>
      currentTrack ?? {
        id: "__empty__",
        title: "No tracks yet",
        artist: "Add audio from the playlist tab",
        audioUrl: "",
        duration: 0,
      },
    [currentTrack]
  );

  const hasTrack = currentTrack !== undefined;

  // Stable per-track orb color (deterministic hash — never flickers).
  const trackColor = useMemo(
    () => getTrackColor(displayTrack.id),
    [displayTrack.id]
  );

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    return getItem<HistoryItem[]>(STORAGE_HISTORY_KEY, []);
  });

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(currentTrack?.duration ?? 0);
  const [isRepeating, setIsRepeating] = useState(false);

  // Sleep Timer State
  const [sleepTimer, setSleepTimer] = useState<SleepTimerState>({
    isActive: false,
    remainingSeconds: 0,
    totalSeconds: 0,
  });

  const sleepTimerRef = useRef(sleepTimer);
  useEffect(() => {
    sleepTimerRef.current = sleepTimer;
  }, [sleepTimer]);

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const durationRef = useRef(duration);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

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

  // Stable ref for auto-advancing to next track when playback ends
  const skipNextRef = useRef<() => void>(() => {});

  // Track loader
  const loadAndPlayTrack = useCallback(
    (track: Track, autoPlay = true) => {
      setCurrentTime(0);
      setDuration(track.duration || 0);
      setIsLoading(true);

      // If sleep timer is set to stop at end of track, adapt remaining seconds to new track duration
      if (sleepTimerRef.current.isActive && sleepTimerRef.current.mode === "end_of_track") {
        const initDur = track.duration || 30;
        setSleepTimer((prev) => ({
          ...prev,
          remainingSeconds: initDur,
          totalSeconds: initDur,
        }));
      }

      engine.loadTrack(track, {
        onLoad: (dur) => {
          setIsLoading(false);
          const realDur =
            dur > 0 && isFinite(dur) ? Math.round(dur) : track.duration || 0;
          if (realDur > 0) {
            setDuration(realDur);
            if (sleepTimerRef.current.isActive && sleepTimerRef.current.mode === "end_of_track") {
              setSleepTimer((prev) => ({
                ...prev,
                remainingSeconds: realDur,
                totalSeconds: realDur,
              }));
            }
            setPlaylist((prev) => {
              const updated = prev.map((t) =>
                t.id === track.id ? { ...t, duration: realDur } : t
              );
              setItem(STORAGE_PLAYLIST_KEY, updated);
              return updated;
            });
          }
          if (autoPlay) {
            engine.play();
            setIsPlaying(true);
            logTrackToHistory({
              ...track,
              duration: realDur > 0 ? realDur : track.duration,
            });
          }
        },
        onPlay: () => {
          setIsLoading(false);
          setIsPlaying(true);
        },
        onPause: () => setIsPlaying(false),
        onError: () => {
          setIsLoading(false);
        },
        onEnd: () => {
          // If sleep timer is set to stop when current track ends, halt playback completely
          if (
            sleepTimerRef.current.isActive &&
            sleepTimerRef.current.mode === "end_of_track"
          ) {
            engine.pause();
            setIsPlaying(false);
            setSleepTimer({ isActive: false, remainingSeconds: 0, totalSeconds: 0 });
            return;
          }

          // Read repeat through a ref: this callback is registered once per
          // load and would otherwise close over the stale toggle value.
          if (repeatRef.current) {
            engine.seek(0);
            engine.play();
          } else {
            skipNextRef.current();
          }
        },
      });
    },
    [engine, logTrackToHistory]
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

        if (prev.mode === "end_of_track") {
          // If paused, keep countdown frozen until playback resumes
          if (!isPlayingRef.current) {
            return prev;
          }

          const liveDur = engine.getDuration() || durationRef.current || 0;
          const liveSeek = engine.getSeek();
          let remaining = prev.remainingSeconds - 1;
          if (liveDur > 0 && typeof liveSeek === "number" && !isNaN(liveSeek) && liveSeek >= 0) {
            remaining = Math.max(0, Math.round(liveDur - liveSeek));
          }

          if (remaining <= 1) {
            engine.fadeOut(1200, () => {
              setIsPlaying(false);
            });
            return { isActive: false, remainingSeconds: 0, totalSeconds: 0 };
          }
          return { ...prev, remainingSeconds: remaining };
        }

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
  const handleSetSleepTimer = (
    value: number,
    mode: "duration" | "end_of_track" = "duration"
  ) => {
    const totalSecs =
      mode === "end_of_track"
        ? Math.max(1, value)
        : Math.max(1, value * 60);

    setSleepTimer({
      isActive: true,
      remainingSeconds: totalSecs,
      totalSeconds: totalSecs,
      mode,
    });
  };

  const handleCancelSleepTimer = () => {
    setSleepTimer({ isActive: false, remainingSeconds: 0, totalSeconds: 0 });
  };

  // Play / Pause toggle
  const handleTogglePlay = () => {
    if (!currentTrack || isLoading) return;
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
  const handleSkipNext = useCallback(() => {
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(nextIndex);
    loadAndPlayTrack(playlist[nextIndex], true);
  }, [currentTrackIndex, playlist, loadAndPlayTrack]);

  // Keep the MediaSession handler pointing at the latest closure —
  // assigned in an effect, never during render.
  useEffect(() => {
    skipNextRef.current = handleSkipNext;
  }, [handleSkipNext]);

  const handleSkipPrevious = useCallback(() => {
    if (currentTime > 3) {
      engine.seek(0);
      setCurrentTime(0);
    } else {
      const prevIndex =
        (currentTrackIndex - 1 + playlist.length) % playlist.length;
      setCurrentTrackIndex(prevIndex);
      loadAndPlayTrack(playlist[prevIndex], true);
    }
  }, [currentTime, engine, currentTrackIndex, playlist, loadAndPlayTrack]);

  // Clamped absolute seek shared by the ±10s buttons, slider keys, waveform, and MediaSession.
  const seekToTime = useCallback(
    (targetSeconds: number) => {
      if (!currentTrack) return;
      const max = engine.getDuration() || duration || 0;
      const target = Math.min(Math.max(0, targetSeconds), max);
      setCurrentTime(Math.floor(target));
      engine.seek(target);
      if (sleepTimerRef.current.isActive && sleepTimerRef.current.mode === "end_of_track") {
        const remaining = Math.max(0, Math.round(max - target));
        setSleepTimer((prev) => ({
          ...prev,
          remainingSeconds: remaining,
        }));
      }
    },
    [engine, duration, currentTrack]
  );

  // Relative seek from the live engine position (fresher than state).
  const handleSeekBy = useCallback(
    (deltaSeconds: number) => {
      seekToTime(engine.getSeek() + deltaSeconds);
    },
    [engine, seekToTime]
  );

  // Single writer so playlist edits always persist together.
  const updatePlaylist = (next: Track[]) => {
    setPlaylist(next);
    setItem(STORAGE_PLAYLIST_KEY, next);
  };

  const handleSelectTrack = (track: Track) => {
    const idx = playlist.findIndex((t) => t.id === track.id);
    if (idx !== -1) {
      setCurrentTrackIndex(idx);
    } else {
      updatePlaylist([track, ...playlist]);
      setCurrentTrackIndex(0);
    }
    loadAndPlayTrack(track, true);
  };

  const handleAddCustomTrack = (audioUrl: string, title?: string) => {
    const finalTitle = title?.trim() || generateRandomTrackName();
    const newTrack: Track = {
      id: `custom-${Date.now()}`,
      title: finalTitle,
      artist: "Online Stream",
      audioUrl,
      duration: 0,
    };
    setPlaylist((prev) => {
      const next = [newTrack, ...prev];
      setItem(STORAGE_PLAYLIST_KEY, next);
      return next;
    });
    setCurrentTrackIndex(0);
    loadAndPlayTrack(newTrack, true);

    // Asynchronously probe metadata duration so playlist immediately shows the real length
    fetchAudioDuration(audioUrl).then((realDuration) => {
      if (realDuration > 0) {
        setPlaylist((prev) => {
          const updated = prev.map((t) =>
            t.id === newTrack.id ? { ...t, duration: realDuration } : t
          );
          setItem(STORAGE_PLAYLIST_KEY, updated);
          return updated;
        });
      }
    });
  };

  // Delete a track (two-tap confirm lives in the row). Deleting the
  // current track moves to the nearest remaining one, keeping play state.
  const handleDeleteTrack = (id: string) => {
    const idx = playlist.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const next = playlist.filter((t) => t.id !== id);
    updatePlaylist(next);
    if (id === currentTrack?.id) {
      if (next.length === 0) {
        engine.pause();
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(30);
        setCurrentTrackIndex(0);
      } else {
        const clamped = Math.min(idx, next.length - 1);
        setCurrentTrackIndex(clamped);
        loadAndPlayTrack(next[clamped], isPlaying);
      }
    } else if (idx < currentTrackIndex) {
      setCurrentTrackIndex(currentTrackIndex - 1);
    }
  };

  // Restore the curated playlist (used by the empty-playlist state).
  const handleResetPlaylist = () => {
    updatePlaylist(DEFAULT_TRACKS);
    setCurrentTrackIndex(0);
  };

  // Seek via waveform click
  const handleWaveformSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentTrack) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = clickPercent * duration;
    seekToTime(targetSeconds);
  };

  // Dynamic document title when audio is playing in foreground or background
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPlaying) {
      document.title = `▶ ${displayTrack.title} · ${displayTrack.artist} | Playground`;
    } else {
      document.title = "Playground";
    }
    return () => {
      document.title = "Playground";
    };
  }, [isPlaying, displayTrack.title, displayTrack.artist]);

  // MediaSession Metadata sync (locks screen, taskbar, notifications, Wearables/AirPods)
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    try {
      const gradientCoverDataUrl = getTrackGradientDataUrl(displayTrack.id);

      navigator.mediaSession.metadata = new MediaMetadata({
        title: displayTrack.title,
        artist: displayTrack.artist,
        album: "Playground Audio",
        artwork: [
          { src: gradientCoverDataUrl, sizes: "512x512", type: "image/svg+xml" },
        ],
      });
    } catch (err) {
      console.debug("[MediaSession] Metadata update error:", err);
    }
  }, [displayTrack]);

  // MediaSession Playback state & position state sync for background scrubber
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

    if ("setPositionState" in navigator.mediaSession && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: 1,
          position: Math.min(Math.max(0, currentTime), duration),
        });
      } catch {
        // Ignored on edge cases where audio node isn't ready
      }
    }
  }, [isPlaying, currentTime, duration]);

  // Action handlers ref to avoid constantly rebinding MediaSession listeners
  const actionHandlersRef = useRef({
    play: handleTogglePlay,
    pause: handleTogglePlay,
    skipNext: handleSkipNext,
    skipPrevious: handleSkipPrevious,
    seekTo: seekToTime,
    seekBy: handleSeekBy,
  });

  useEffect(() => {
    actionHandlersRef.current = {
      play: () => {
        if (!isPlaying) {
          engine.play();
          setIsPlaying(true);
          logTrackToHistory(currentTrack);
        }
      },
      pause: () => {
        if (isPlaying) {
          engine.pause();
          setIsPlaying(false);
        }
      },
      skipNext: handleSkipNext,
      skipPrevious: handleSkipPrevious,
      seekTo: seekToTime,
      seekBy: handleSeekBy,
    };
  });

  // Register MediaSession Action Handlers for background controls and hardware media keys
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    const actionMap: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => actionHandlersRef.current.play()],
      ["pause", () => actionHandlersRef.current.pause()],
      ["previoustrack", () => actionHandlersRef.current.skipPrevious()],
      ["nexttrack", () => actionHandlersRef.current.skipNext()],
      [
        "seekto",
        (details) => {
          if (typeof details.seekTime === "number") {
            actionHandlersRef.current.seekTo(details.seekTime);
          }
        },
      ],
      [
        "seekbackward",
        (details) => {
          actionHandlersRef.current.seekBy(-(details.seekOffset || 10));
        },
      ],
      [
        "seekforward",
        (details) => {
          actionHandlersRef.current.seekBy(details.seekOffset || 10);
        },
      ],
      ["stop", () => actionHandlersRef.current.pause()],
    ];

    for (const [action, handler] of actionMap) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // action not supported in current browser
      }
    }

    return () => {
      for (const [action] of actionMap) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Share link handler
  const handleShare = () => {
    if (!currentTrack) return;
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
            aria-label={`Expand player for ${displayTrack.title}`}
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
                      isPlaying && !isLoading && !shouldReduceMotion ? "running" : "paused",
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
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xs text-white">
                    <Loader2 className="size-4 animate-spin" />
                  </div>
                )}
              </motion.div>

              {/* Mini metadata */}
              <div className="flex min-w-0 flex-col pr-2">
                <motion.span
                  layoutId="player-metadata-title"
                  transition={springTransition}
                  className="truncate text-sm leading-none font-medium tracking-[-0.05px] text-ink"
                >
                  {sanitizeTrackTitle(displayTrack.title, 22)}
                </motion.span>
                <motion.span
                  layoutId="player-metadata-artist"
                  transition={springTransition}
                  className="mt-1 truncate text-xs leading-none text-ink-tertiary"
                >
                  {sanitizeArtist(displayTrack.artist, 22)}
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
                aria-label={isLoading ? "Loading track" : isPlaying ? "Pause" : "Play"}
                disabled={!hasTrack || isLoading}
                style={{ backgroundColor: trackColor }}
                className="flex size-8 cursor-pointer items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-75 focus-visible:outline-2 focus-visible:outline-primary-focus"
              >
                {isLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : isPlaying ? (
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
                      title={
                        sleepTimer.isActive
                          ? sleepTimer.mode === "end_of_track"
                            ? `Sleep timer: Stop at end of track (${formatTime(sleepTimer.remainingSeconds)} left)`
                            : `Sleep timer: ${formatTime(sleepTimer.remainingSeconds)} left`
                          : "Set sleep timer"
                      }
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
                      animated={isPlaying && !isLoading && !shouldReduceMotion}
                      role="img"
                      aria-label={`${displayTrack.title} artwork`}
                    />
                    <AnimatePresence>
                      {isLoading && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ duration: 0.2 }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                          <div className="flex size-14 items-center justify-center rounded-full border border-white/20 bg-black/45 backdrop-blur-md shadow-lg text-white">
                            <Loader2 className="size-6 animate-spin" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Track Metadata: Sanitized & Restricted Length */}
                  <motion.h2
                    layoutId="player-metadata-title"
                    transition={springTransition}
                    className="w-full truncate px-3 text-center text-[18px] font-semibold tracking-[-0.2px] text-ink"
                    title={displayTrack.title}
                  >
                    {sanitizeTrackTitle(displayTrack.title, 26)}
                  </motion.h2>
                  <motion.p
                    layoutId="player-metadata-artist"
                    transition={springTransition}
                    className="mt-0.5 w-full truncate px-3 text-center text-sm text-ink-subtle"
                    title={displayTrack.artist}
                  >
                    {sanitizeArtist(displayTrack.artist, 28)}
                  </motion.p>
                  {!hasTrack && (
                    <button
                      type="button"
                      onClick={handleOpenPlaylist}
                      className="mt-3 rounded-md border border-hairline bg-surface-1 px-3 py-1.5 text-xs font-medium text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-focus"
                    >
                      Open playlist
                    </button>
                  )}

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
                      aria-disabled={!hasTrack}
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

                    {/* Centered Timestamp 00:12 / 03:45 */}
                    <div className="flex justify-center font-mono text-xs font-normal text-ink-tertiary tabular-nums">
                      {formatTime(currentTime)} / {formatTime(duration, "--:--")}
                    </div>

                    {/* Bottom Controls Row: Repeat, SkipBack, Play/Pause, SkipForward, Share */}
                    <div className="mt-0.5 flex items-center justify-between px-1">
                      {/* Repeat Toggle */}
                      <IconButton
                        onClick={() => setIsRepeating((prev) => !prev)}
                        aria-label={isRepeating ? "Disable repeat" : "Enable repeat"}
                        aria-pressed={isRepeating}
                        tone={isRepeating ? "active" : "default"}
                        disabled={!hasTrack}
                      >
                        <Repeat className="size-4" strokeWidth={2.2} />
                      </IconButton>

                      {/* Center Controls: Prev, -10s, Play/Pause, +10s, Next */}
                      <div className="flex items-center gap-2">
                        <IconButton
                          onClick={handleSkipPrevious}
                          aria-label="Previous track"
                          disabled={!hasTrack}
                        >
                          <SkipBack className="size-4 fill-current" strokeWidth={0} />
                        </IconButton>

                        <SeekButton direction={-10} onSeek={handleSeekBy} disabled={!hasTrack} />

                        <motion.button
                          type="button"
                          layoutId="player-play-pause-circle"
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          onClick={handleTogglePlay}
                          aria-label={isLoading ? "Loading track" : isPlaying ? "Pause" : "Play"}
                          disabled={!hasTrack || isLoading}
                          style={{ backgroundColor: trackColor }}
                          className="flex size-10 cursor-pointer items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-75 focus-visible:outline-2 focus-visible:outline-primary-focus"
                        >
                          {isLoading ? (
                            <Loader2 className="size-5 animate-spin" />
                          ) : isPlaying ? (
                            <Pause className="size-5 fill-current" strokeWidth={0} />
                          ) : (
                            <Play
                              className="size-5 fill-current ml-0.5"
                              strokeWidth={0}
                            />
                          )}
                        </motion.button>

                        <SeekButton direction={10} onSeek={handleSeekBy} disabled={!hasTrack} />

                        <IconButton
                          onClick={handleSkipNext}
                          aria-label="Next track"
                          disabled={!hasTrack}
                        >
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
                          disabled={!hasTrack}
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
                    currentTrack={displayTrack}
                    isPlaying={isPlaying}
                    isLoading={isLoading}
                    duration={duration}
                    playlist={playlist}
                    history={history}
                    onSelectTrack={handleSelectTrack}
                    onDeleteTrack={handleDeleteTrack}
                    onResetPlaylist={handleResetPlaylist}
                    onClearHistory={() => {
                      setHistory([]);
                      setItem(STORAGE_HISTORY_KEY, []);
                    }}
                    onAddCustomTrack={handleAddCustomTrack}
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
        remainingTrackSeconds={Math.max(
          0,
          Math.round(
            (engine.getDuration() || duration || 0) -
              (engine.getSeek() || currentTime || 0)
          )
        )}
        onSetTimer={handleSetSleepTimer}
        onCancelTimer={handleCancelSleepTimer}
        accentColor={trackColor}
      />
    </div>
  );
}
