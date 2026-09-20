export interface Track {
  id: string;
  title: string;
  artist: string;
  cover?: string;
  audioUrl: string;
  duration?: number;
}

export interface HistoryItem extends Track {
  playedAt: number;
}

export interface SleepTimerState {
  isActive: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  mode?: "duration" | "end_of_track";
}

export type PlayerScreen = "player" | "playlist";
