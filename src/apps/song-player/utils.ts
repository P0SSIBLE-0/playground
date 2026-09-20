/**
 * Curated adjectives & musical nouns for generating creative track titles
 * when the user doesn't provide a custom name.
 */
const TITLE_ADJECTIVES = [
  "Cosmic",
  "Velvet",
  "Neon",
  "Midnight",
  "Ethereal",
  "Electric",
  "Golden",
  "Solar",
  "Lunar",
  "Astral",
  "Vibrant",
  "Echoing",
  "Chill",
  "Infinite",
  "Dreamy",
  "Mystic",
  "Radiant",
  "Serene",
  "Silken",
  "Crystal",
  "Aurora",
  "Prismatic",
  "Starlight",
  "Lucid",
];

const TITLE_NOUNS = [
  "Groove",
  "Pulse",
  "Voyage",
  "Echo",
  "Horizon",
  "Drift",
  "Symphony",
  "Melody",
  "Odyssey",
  "Wave",
  "Flow",
  "Nexus",
  "Current",
  "Harmony",
  "Rhapsody",
  "Frequency",
  "Reverie",
  "Mirage",
  "Breeze",
  "Cascade",
  "Orbit",
  "Tide",
  "Lullaby",
];

/**
 * Generates an inspiring random name for tracks when the user doesn't specify one.
 */
export function generateRandomTrackName(): string {
  const adj = TITLE_ADJECTIVES[Math.floor(Math.random() * TITLE_ADJECTIVES.length)];
  const noun = TITLE_NOUNS[Math.floor(Math.random() * TITLE_NOUNS.length)];
  return `${adj} ${noun}`;
}

/**
 * Modern curated gradient palettes for track covers.
 */
export const TRACK_GRADIENTS = [
  {
    from: "#6366f1",
    via: "#8b5cf6",
    to: "#ec4899",
    css: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
  },
  {
    from: "#06b6d4",
    via: "#0ea5e9",
    to: "#3b82f6",
    css: "linear-gradient(135deg, #06b6d4 0%, #0ea5e9 50%, #3b82f6 100%)",
  },
  {
    from: "#f59e0b",
    via: "#f97316",
    to: "#e11d48",
    css: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #e11d48 100%)",
  },
  {
    from: "#10b981",
    via: "#059669",
    to: "#0284c7",
    css: "linear-gradient(135deg, #10b981 0%, #059669 50%, #0284c7 100%)",
  },
  {
    from: "#8b5cf6",
    via: "#d946ef",
    to: "#f43f5e",
    css: "linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #f43f5e 100%)",
  },
  {
    from: "#3b82f6",
    via: "#6366f1",
    to: "#a855f7",
    css: "linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #a855f7 100%)",
  },
  {
    from: "#14b8a6",
    via: "#06b6d4",
    to: "#6366f1",
    css: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 50%, #6366f1 100%)",
  },
  {
    from: "#ec4899",
    via: "#f43f5e",
    to: "#f97316",
    css: "linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #f97316 100%)",
  },
];

/**
 * Returns a deterministic gradient palette object for a track.
 */
export function getTrackGradientPalette(trackId: string) {
  let hash = 0;
  for (let i = 0; i < trackId.length; i++) {
    hash = (hash * 31 + trackId.charCodeAt(i)) >>> 0;
  }
  return TRACK_GRADIENTS[hash % TRACK_GRADIENTS.length];
}

/**
 * Returns a rich CSS linear-gradient string for a track cover.
 */
export function getTrackGradient(trackId: string): string {
  return getTrackGradientPalette(trackId).css;
}

/**
 * Generates a circular gradient data URL for system MediaSession lock-screen / notification center display.
 */
export function getTrackGradientDataUrl(trackId: string): string {
  const palette = getTrackGradientPalette(trackId);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${palette.from}"/>
        <stop offset="45%" stop-color="${palette.via}"/>
        <stop offset="100%" stop-color="${palette.to}"/>
      </linearGradient>
    </defs>
    <circle cx="256" cy="256" r="256" fill="url(#g)"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}


/**
 * Sanitizes and restricts track title length so it never disrupts the layout.
 * Removes HTML tags, audio extensions (.mp3, .wav), URL query params, and clamps length.
 */
export function sanitizeTrackTitle(title: string, maxLength = 26): string {
  if (!title) return "Untitled Track";

  let clean = title
    // Strip HTML tags
    .replace(/<[^>]*>?/gm, "")
    // Strip common audio extensions
    .replace(/\.(mp3|wav|ogg|flac|m4a|aac|webm)$/i, "")
    // Replace multiple spaces with a single space
    .replace(/\s+/g, " ")
    .trim();

  // If title looks like a URL, extract filename
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    try {
      const url = new URL(clean);
      const pathname = url.pathname;
      const lastPart = pathname.split("/").filter(Boolean).pop() || "Audio Stream";
      clean = decodeURIComponent(lastPart).replace(/\.(mp3|wav|ogg|flac|m4a|aac|webm)$/i, "");
    } catch {
      clean = "Online Audio Track";
    }
  }

  if (clean.length > maxLength) {
    return clean.slice(0, maxLength - 1).trimEnd() + "…";
  }

  return clean || "Untitled Track";
}

/**
 * Sanitizes artist name.
 */
export function sanitizeArtist(artist?: string, maxLength = 28): string {
  if (!artist || !artist.trim()) return "Unknown Artist";
  const clean = artist.replace(/<[^>]*>?/gm, "").trim();
  if (clean.length > maxLength) {
    return clean.slice(0, maxLength - 1).trimEnd() + "…";
  }
  return clean;
}

/**
 * Curated orb hues — one stable color per track, derived from the track id
 * so it never changes between renders. Lavender leads (brand accent).
 */
const TRACK_PALETTE = [
  "#5e6ad2", // lavender (brand)
  "#1A73F2", // blue
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#0d9488", // teal
  "#e11d48", // rose
  "#ea580c", // orange
  "#d97706", // amber
] as const;

export function getTrackColor(trackId: string): string {
  let hash = 0;
  for (let i = 0; i < trackId.length; i++) {
    hash = (hash * 31 + trackId.charCodeAt(i)) >>> 0;
  }
  return TRACK_PALETTE[hash % TRACK_PALETTE.length];
}

/**
 * Formats time in seconds to mm:ss format.
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

/**
 * Formats timestamp to human readable relative time.
 */
export function formatRelativeTime(timestamp: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
