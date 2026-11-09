## Context

Reviewers need to compare a 16:9 and a 9:16 rendition of the same content and record where they diverge. There is no existing code. The videos live on the same server as the page. Constraints decided during exploration: standalone HTML + JS, no backend, a `media/` folder next to the page, same-origin paths only, localStorage for persistence, JSON export for hand-off.

## Goals / Non-Goals

**Goals:**
- One play/pause control and one progress bar over two side-by-side videos on a single shared timeline.
- Tight sync at start, after seeks, and through buffering; slow drift is corrected.
- Record, review, jump to, delete and export timestamp-range findings.
- Load any pair by typing two relative paths; support multiple pairs over time.

**Non-Goals:**
- Any backend, shared/multi-reviewer storage, or authentication.
- Directory listing, manifests, or file pickers.
- Per-video time offsets or differing timelines.
- Frame-accurate guarantees beyond what the browser and video encoding allow.
- Cross-origin video URLs.

## Decisions

**Files and structure.** `index.html`, `app.js`, `style.css`, with videos under `media/`. Plain ES modules-free JS in one file is enough; no build step or dependencies. Alternative (framework) rejected as unnecessary for one screen.

**Path input, not manifest.** Two text inputs plus Load. Paths are resolved with `new URL(path, location.href)` and rejected if `origin !== location.origin`. Alternatives considered: `pairs.json` manifest, directory-listing scrape, file picker. Rejected because the manifest needs upkeep, scraping depends on server config, and a file picker bypasses the server files and blob URLs cannot be reopened.

**Orientation detection.** After `loadedmetadata`, compare `videoWidth` and `videoHeight`; the landscape video goes left, portrait right, regardless of input order. If both have the same orientation, keep input order and show a warning.

**Shared timeline with a master clock.** The landscape video is the master. The bar's range is the master's duration (`duration` of the shorter if they differ, noted as a limitation in the spec). All displayed time, findings and seeks use master time. A follower is the other video. Alternative (virtual clock via `requestAnimationFrame`) rejected as more complex and prone to diverge from actual decoding.

**Sync mechanics.**
- Play is allowed only when both videos reach `canplay`; the button is disabled until then.
- Play calls `play()` on both and awaits both promises.
- On `waiting` from either video, pause both; resume both once both are `canplay`.
- Seeking sets `currentTime` on both and waits for both `seeked` before resuming if it was playing.
- While playing, a ~200 ms interval compares follower time to master time; if drift exceeds 0.15 s, set follower `currentTime` to master's. Playback-rate nudging was considered but a hard resync is simpler and sufficient for review use.
- Audio: master unmuted, follower muted. A control may swap which is unmuted.

**Speed.** A `<select>` sets `playbackRate` and `defaultPlaybackRate` on both videos (the default survives `load()`, so a new pair keeps the rate). The 2 s replay lead-in is in media time, not scaled by speed. Drift correction is unchanged since both clocks run at the same rate.

**Layout.** A two-column grid: players and transport on the left, a sticky findings sidebar (400 px, internally scrolling list) on the right, stacking below 1100 px. Panes are flex items sized in proportion to each video's aspect ratio (`--ar`), so both videos render at the same height. A container query turns the audio button into an icon in narrow panes.

**Collapsible inputs.** The path form lives in a panel toggled by a top-bar button that shows the loaded file names. It collapses on a successful load and reopens on any load error, so errors are never hidden. Alternative (a modal or always-visible form) rejected: the form is used rarely once a pair is loaded and costs vertical space the video needs.

**Start/Stop and playback.** Playback is split into `startPlayback()` and `pausePlayback()` (the play button and Space use a toggle over the two). Start records the playhead first, then calls `startPlayback()` unless already playing or at the end of the timeline; Stop records the end and then calls `pausePlayback()`. The recorded values are never adjusted. The 2 s lead-in exists only when a finding is clicked in the list, where playback seeks to `start - 2 s` (clamped to 0).

**Frame numbers.** Browsers do not expose a video's frame rate, so it is found by (1) parsing the MP4 `moov` box (`mdhd` timescale and `stts` sample table of the video track) through small Range requests, with a 2 MB cap when the server ignores Range, and otherwise (2) estimating it from the spacing of frames reported by `requestVideoFrameCallback`, snapped to common rates (24, 25, 29.97, 30, 50, 59.94, 60 and so on). Frame number = `floor(time x fps + 0.001)`, counted from 0; while playing, the presented frame's own `mediaTime` is used. The rate is per video, so each pane shows its own number. A variable-frame-rate video gets an average rate, so its frame numbers are approximate.

**Finding editor.** Editing state is `{ id, which }`. The invariant is that the edited value and the playhead always agree: every user seek (`userSeek`), live bar drag, nudge and "Set to playhead" passes through `applyEditValue`, which clamps to keep one frame between start and end and returns the value the player must seek to. Playback is the only thing that moves the playhead without moving the value. Frame nudges land at `(frame + 0.02) / fps`, just inside the target frame, so rounding can never display the neighbouring frame. The list row's number badge still replays with the 2 s lead-in; the time buttons edit.

**Export and import.** The export record is `{ pair, videos, fps?, findings: [{ start, end, note?, frames? }] }`; `fps` and `frames` are added only when a frame rate is known, so older consumers are unaffected. The frame rate is stored with each pair's findings in localStorage so "Export all" can add frame numbers for pairs that are not loaded. Import reads the same shape (one record, or a list for Export all), validates it (record shape, finite times with `end > start`, same-origin paths), merges into the pair's stored findings with a duplicate check on start, end and note, then loads the first pair, which reads the merged findings from storage. Merging was chosen over replacing so an import can never silently discard findings made since the export. Times in seconds are authoritative on import; frame numbers are informational and are recomputed from the video's own frame rate.

**Findings list order.** Findings are stored in creation order and rendered newest first, numbered by creation index. A new entry gets a short highlight animation (disabled under `prefers-reduced-motion`). Export orders by start time instead, which is more useful to a consumer.

**Length mismatch.** Surfaced as an alert, per-pane length markers and a timeline note, using a 0.1 s tolerance so ordinary frame-level differences do not warn.

**Theme.** CSS custom properties with a light set, a dark set under `prefers-color-scheme` (unless forced light), and explicit `data-theme` overrides. The saved choice is applied by a small inline script in `<head>` before first paint. A global `[hidden]` rule keeps component `display` rules from overriding the `hidden` attribute.

**Progress bar.** A custom `<input type="range">` (fine step) with `controls` removed from both videos. A marker layer under or over the bar draws finding ranges as positioned segments.

**Findings model.** `{ id, start, end, note? }` in seconds on the shared timeline. State machine: `idle` ↔ `open(start)`.
- Start: `start = max(0, current − 2)`.
- Stop: `end = current`; if `end < start`, treated as invalid and the open start is discarded.
- Navigation (seek, scrub, jump) never changes an open start. Stop at or before the start is rejected and the finding stays open (no swap, no auto-reset).
- Video end while open: auto-close at the end of the timeline.
- Loading another pair while open: discard the open start.
- Overlap allowed; list sorted by start; delete per item; clicking an item seeks both to its start.

**Persistence.** localStorage key `findings:<pairKey>` where `pairKey` is `<pathA>|<pathB>` (normalized as typed after resolution). A separate `recents` key holds recent pairs (capped, e.g. 10). All storage access is wrapped in try/catch with in-memory fallback.

**Export.** JSON via Blob + download link. Current pair: `{ "pair": {a, b}, "videos": [...], "findings": [{start, end, note?}] }`. "Export all" produces an array of those over all `findings:*` keys. Times are numeric seconds.

**Deep links.** `?a=<path>&b=<path>` loads the pair on startup, subject to the same same-origin check.

## Risks / Trade-offs

- [Sync drift or jitter between decoders] → readiness gating, buffering coordination, and periodic resync; accept small residual offset (<~0.15 s).
- [Seeks land on keyframes, so frame accuracy varies] → document, test with real files, recommend denser keyframes at encode time.
- [Different durations] → bar uses the shorter duration; surfaced as a visible warning when they differ by more than a small tolerance.
- [localStorage is per browser and may be cleared or blocked] → try/catch with in-memory fallback, and encourage JSON export; known limitation that reviewers do not share findings.
- [Renaming files orphans findings] → exported JSON records the paths so findings can be tied back manually.
- [Autoplay restrictions] → playback only starts from a user click, with the follower muted.
- [Served via `file://` breaks same-origin and storage] → documented requirement to serve over HTTP; show a clear message if loaded from `file:`.
