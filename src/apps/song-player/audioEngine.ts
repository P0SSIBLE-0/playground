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
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: 423,
  },
  {
    id: "sunset-drive",
    title: "Sunset Boulevard",
    artist: "Retro Wave Project",
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: 345,
  },
];

export class AudioEngine {
  private howl: Howl | null = null;
  private currentTrack: Track | null = null;

  public getCurrentTrack(): Track | null {
    return this.currentTrack;
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
    if (this.howl) {
      this.howl.stop();
      this.howl.unload();
      this.howl = null;
    }

    this.currentTrack = track;

    this.howl = new Howl({
      src: [track.audioUrl],
      html5: true, // Use HTML5 Audio for streaming any remote audio URL & format without CORS issues
      preload: true,
      onload: () => {
        const dur = this.howl?.duration() || track.duration || 30;
        callbacks.onLoad?.(dur);
      },
      onplay: () => {
        callbacks.onPlay?.();
      },
      onpause: () => {
        callbacks.onPause?.();
      },
      onend: () => {
        callbacks.onEnd?.();
      },
      onloaderror: (_id, err) => {
        console.warn(`[AudioEngine] Load error for track "${track.title}":`, err);
        callbacks.onError?.(err);
      },
      onplayerror: (_id, err) => {
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
    this.howl?.play();
  }

  public pause(): void {
    this.howl?.pause();
  }

  public seek(seconds: number): void {
    if (this.howl) {
      this.howl.seek(seconds);
    }
  }

  public getSeek(): number {
    if (!this.howl) return 0;
    const seek = this.howl.seek();
    return typeof seek === "number" ? seek : 0;
  }

  public getDuration(): number {
    return this.howl?.duration() || 0;
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
    if (this.howl) {
      this.howl.stop();
      this.howl.unload();
      this.howl = null;
    }
  }
}
