## Why

Reviewers comparing two renditions of the same content (a 16:9 and a 9:16 video) have no way to watch them together, so mismatches are hard to spot and harder to report. A single synced page with timestamped findings lets a reviewer mark exactly where the videos diverge and hand that off as data.

## What Changes

- New standalone HTML + JS page (no backend) served over HTTP, with videos in a `media/` folder next to the page.
- Two path inputs (relative, same-origin only) plus a Load button; the page detects which video is portrait/landscape and lays them out side by side. Recent pairs are remembered, and `?a=…&b=…` deep links open a pair.
- One play/pause control and one progress bar driving both videos on a single shared timeline, with ready-gating, buffering sync and master/follower drift correction. Audio plays from one video only.
- Findings: a Start/Stop toggle records a time range (Start and Stop record the exact playhead time, and also play and pause the videos; clicking a finding replays from 2 seconds before its start), with optional note, delete, editable start and end times (frame and second nudges, arrow keys, bar dragging, with the playhead kept in sync), frame numbers, overlap allowed, auto-close at video end, free navigation while a finding is open, and rules for pair switching. The newest finding is listed first.
- Inputs live in a collapsible panel that hides after a successful load; findings sit beside the players; length mismatches between the videos are called out; light, dark and auto themes.
- Clicking a finding seeks both players to its start; ranges are shown on the progress bar.
- Findings persist in localStorage per pair and export as JSON (current pair, plus Export all).

## Capabilities

### New Capabilities
- `video-pair-loading`: Path inputs, validation and errors, orientation detection and layout, recent pairs, deep links.
- `synced-playback`: Single play control and progress bar over two videos, readiness gating, buffering sync, drift correction, single audio source.
- `findings`: Recording, editing, persisting, navigating and exporting timestamp ranges.
- `review-ui`: Framed video panes, a findings sidebar beside the players, light/dark themes, and keyboard play/pause.

### Modified Capabilities
<!-- None: no existing specs. -->

## Impact

- New files only: an HTML page, JS (and optional CSS), and a `media/` folder convention.
- No backend or dependencies. Requires serving over HTTP (not `file://`) for same-origin loading and localStorage.
- Known limitations: localStorage is per browser, so reviewers do not share findings (collect via export); renaming a file orphans its saved findings; seek accuracy depends on video keyframe spacing.
