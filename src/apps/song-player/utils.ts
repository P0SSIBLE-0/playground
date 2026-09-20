/**
 * Reliable public fallback artwork images.
 */
export const FALLBACK_ARTWORKS = [
  "https://images.unsplash.com/photo-1601042879364-f3947d3f9c16?q=80&w=400&auto=format&fit=crop", // Neon red jacket / Blinding Lights aesthetic
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop", // Live concert / violet lights
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop", // DJ vinyl / music club
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop", // Acoustic studio vibe
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=400&auto=format&fit=crop", // Retro singer
];

/**
 * Returns a valid cover image URL or a verified public fallback artwork.
 */
export function getCoverArt(coverUrl?: string, fallbackIndex = 0): string {
  if (coverUrl && coverUrl.trim().length > 0 && !coverUrl.includes("undefined")) {
    return coverUrl.trim();
  }
  const index = Math.abs(fallbackIndex) % FALLBACK_ARTWORKS.length;
  return FALLBACK_ARTWORKS[index];
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
