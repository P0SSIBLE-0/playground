import { SongPlayer } from "./SongPlayer";

/**
 * Song Player mini-app — owns the viewport.
 * `MiniAppPage` renders this with no title/back chrome,
 * so there is no panel or caption here: just the player,
 * centered on a blank canvas under the site header.
 */
export default function SongPlayerApp() {
  return (
    <div className="flex min-h-[calc(100dvh-14rem)] items-center justify-center">
      <SongPlayer />
    </div>
  );
}
