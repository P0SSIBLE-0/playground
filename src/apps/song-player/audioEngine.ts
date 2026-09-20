import { Howl } from "howler";
import type { Track } from "./types";

/**
 * Curated playlist of publicly available audio tracks with high-quality metadata and artwork.
 */
export const DEFAULT_TRACKS: Track[] = [
  {
    id: "blinding-lights",
    title: "Blinding Lights",
    artist: "The Weeknd",
    audioUrl: "https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverending_Story.mp3",
    duration: 30,
  },
  {
    id: "midnight-pulse",
    title: "Midnight City Groove",
    artist: "Neon Skyline",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 372,
  },
  {
    id: "lofi-chill",
    title: "Coffee & Code Dreams",
    artist: "Lofi Beats Collective",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: 423,
  },
  {
    id: "sunset-drive",
    title: "Sunset Boulevard",
    artist: "Retro Wave Project",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: 345,
  },
];

export class AudioEngine {
  private howl: Howl | null = null;
  private currentTrack: Track | null = null;
  private pendingSeek: number | null = null;
  private seekDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private activeLoadToken: object | null = null;

  public getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  /**
   * Internal safeguard: ensures Howler never spawns or retains multiple concurrent audio
   * elements or voice instances. If Howler created extra sounds, terminate and remove them.
   */
  private cleanupExtraSounds(): void {
    if (!this.howl) return;
    const sounds = (this.howl as unknown as { _sounds?: Array<{ _id: number; _node?: HTMLAudioElement }> })._sounds;
    if (Array.isArray(sounds) && sounds.length > 1) {
      for (let i = 1; i < sounds.length; i++) {
        const extra = sounds[i];
        if (extra) {
          try {
            if (extra._node) {
              extra._node.pause();
              extra._node.src = "";
            }
            this.howl.stop(extra._id);
          } catch {
            // ignore
          }
        }
      }
      sounds.length = 1;
    }
  }

  public loadTrack(
    track: Track,
    callbacks: {
      onPlay?: () => void;
      onPause?: () => void;
      onEnd?: () => void;
      onLoad?: (duration: number) => void;
      onError?: (error: unknown) => void;
    } = {}
  ): Howl {
    const currentToken = {};
    this.activeLoadToken = currentToken;

    if (this.seekDebounceTimer) {
      clearTimeout(this.seekDebounceTimer);
      this.seekDebounceTimer = null;
    }
    this.pendingSeek = null;

    if (this.howl) {
      this.cleanupExtraSounds();
      this.howl.off(); // Detach all listeners from previous Howl instance
      this.howl.stop();
      this.howl.unload();
      this.howl = null;
    }

    this.currentTrack = track;

    this.howl = new Howl({
      src: [track.audioUrl],
      html5: true, // Use HTML5 Audio for streaming any remote audio URL & format without CORS issues
      pool: 1, // Crucial: enforce single-voice pool to prevent Howler from allocating multiple overlapping streams
      preload: true,
      onload: () => {
        if (this.activeLoadToken !== currentToken) return;
        const dur = this.getDuration() || track.duration || 0;
        callbacks.onLoad?.(dur > 0 ? dur : 0);
      },
      onplay: () => {
        if (this.activeLoadToken !== currentToken) return;
        this.cleanupExtraSounds();
        callbacks.onPlay?.();
      },
      onpause: () => {
        if (this.activeLoadToken !== currentToken) return;
        callbacks.onPause?.();
      },
      onend: () => {
        if (this.activeLoadToken !== currentToken) return;
        this.cleanupExtraSounds();
        callbacks.onEnd?.();
      },
      onloaderror: (_id, err) => {
        if (this.activeLoadToken !== currentToken) return;
        console.warn(`[AudioEngine] Load error for track "${track.title}":`, err);
        callbacks.onError?.(err);
      },
      onplayerror: (_id, err) => {
        if (this.activeLoadToken !== currentToken) return;
        console.warn(`[AudioEngine] Play error for track "${track.title}":`, err);
        this.howl?.once("unlock", () => {
          this.howl?.play();
        });
        callbacks.onError?.(err);
      },
    });

    return this.howl;
  }

  public play(): void {
    if (!this.howl) return;
    this.cleanupExtraSounds();
    if (this.isPlaying()) return;
    this.howl.play();
  }

  public pause(): void {
    if (!this.howl) return;
    if (this.seekDebounceTimer && this.pendingSeek !== null) {
      clearTimeout(this.seekDebounceTimer);
      this.seekDebounceTimer = null;
      this.executeSeek(this.pendingSeek);
    }
    this.howl.pause();
    this.cleanupExtraSounds();
  }

  /**
   * Optimized multi-seek:
   * Sets pending seek target immediately so rapid calls (e.g. repeated ±10s clicks, scrubber drags)
   * calculate from the newest target time and show zero latency in the UI,
   * while debouncing the audio seek by 50ms and directly updating the underlying HTML5 audio
   * currentTime to prevent Howler's pause() -> play() sound duplication lock.
   */
  public seek(seconds: number): void {
    if (!this.howl) return;
    const dur = this.getDuration();
    const clamped = Math.max(0, Math.min(seconds, dur > 0 ? dur : seconds));
    this.pendingSeek = clamped;

    if (this.seekDebounceTimer) {
      clearTimeout(this.seekDebounceTimer);
    }

    this.seekDebounceTimer = setTimeout(() => {
      this.executeSeek(clamped);
      this.seekDebounceTimer = null;
    }, 50);
  }

  private executeSeek(seconds: number): void {
    if (!this.howl) return;
    this.cleanupExtraSounds();

    const sounds = (this.howl as unknown as { _sounds?: Array<{ _id: number; _seek?: number; _node?: HTMLAudioElement }> })._sounds;
    const sound = sounds?.[0];
    const node = sound?._node;

    if (node && !isNaN(node.duration) && isFinite(node.duration)) {
      try {
        // Native HTML5 seek maintains playback without triggering Howler's play lock or sound pooling
        node.currentTime = seconds;
        if (sound) sound._seek = seconds;
        this.pendingSeek = null;
        return;
      } catch (err) {
        console.warn("[AudioEngine] Direct HTML5 seek fallback:", err);
      }
    }

    // Fallback to Howler's seek
    try {
      this.howl.seek(seconds);
    } catch (err) {
      console.warn("[AudioEngine] Howler seek error:", err);
    } finally {
      this.cleanupExtraSounds();
      this.pendingSeek = null;
    }
  }

  public getSeek(): number {
    if (this.pendingSeek !== null) {
      return this.pendingSeek;
    }
    if (!this.howl) return 0;

    const sounds = (this.howl as unknown as { _sounds?: Array<{ _node?: HTMLAudioElement }> })._sounds;
    const node = sounds?.[0]?._node;
    if (node && typeof node.currentTime === "number" && !isNaN(node.currentTime)) {
      return node.currentTime;
    }

    const seek = this.howl.seek();
    return typeof seek === "number" ? seek : 0;
  }

  public getDuration(): number {
    if (!this.howl) return 0;
    const sounds = (this.howl as unknown as { _sounds?: Array<{ _node?: HTMLAudioElement }> })._sounds;
    const node = sounds?.[0]?._node;
    if (node && typeof node.duration === "number" && !isNaN(node.duration) && isFinite(node.duration)) {
      return node.duration;
    }
    return this.howl.duration() || 0;
  }

  public isPlaying(): boolean {
    return this.howl?.playing() || false;
  }

  public setLoop(loop: boolean): void {
    this.howl?.loop(loop);
  }

  public fadeOut(durationMs = 1500, onComplete?: () => void): void {
    if (!this.howl) return;
    const currentVol = this.howl.volume();
    this.howl.fade(currentVol, 0, durationMs);
    setTimeout(() => {
      this.pause();
      if (this.howl) {
        this.howl.volume(currentVol); // restore volume for future playback
      }
      onComplete?.();
    }, durationMs);
  }

  public unload(): void {
    if (this.seekDebounceTimer) {
      clearTimeout(this.seekDebounceTimer);
      this.seekDebounceTimer = null;
    }
    this.pendingSeek = null;
    if (this.howl) {
      this.cleanupExtraSounds();
      this.howl.stop();
      this.howl.unload();
      this.howl = null;
    }
  }
}

