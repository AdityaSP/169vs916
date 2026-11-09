## 1. Project Skeleton

- [x] 1.1 Create `index.html`, `app.js`, `style.css` and an empty `media/` folder
- [x] 1.2 Build the page layout: path inputs and Load, side-by-side video area, play button, progress bar, findings panel
- [x] 1.3 Show a clear message when the page is opened via `file:` instead of HTTP

## 2. Video Pair Loading

- [x] 2.1 Resolve typed paths against the page URL and reject cross-origin results with an inline error
- [x] 2.2 Load both videos and report load errors (404, unsupported codec) next to the failing input
- [x] 2.3 Detect orientation from `videoWidth`/`videoHeight` and place landscape left, portrait right; warn on same orientation
- [x] 2.4 Store recent pairs in localStorage (capped) and render them as one-click chips
- [x] 2.5 Load a pair from `?a=…&b=…` on startup
- [x] 2.6 On pair switch, pause playback and discard any open finding start

## 3. Synced Playback

- [x] 3.1 Remove native controls; add single play/pause that is disabled until both videos are `canplay`
- [x] 3.2 Implement shared timeline using the landscape video as master; use the shorter duration and warn on mismatch
- [x] 3.3 Implement the custom progress bar with time display; scrubbing seeks both videos
- [x] 3.4 Coordinate buffering: pause both on `waiting`, resume both when ready
- [x] 3.5 Add the ~200 ms drift check with 0.15 s resync threshold while playing
- [x] 3.6 Play audio from one video only (landscape by default) with a control to switch
- [x] 3.7 Pause both at the end of the shared timeline
- [x] 3.8 Add a speed control applied to both videos and kept across seeks and pair loads

## 4. Findings

- [x] 4.1 Implement the Start/Stop toggle recording the exact playhead time; clicking a finding seeks to 2 s before its start (clamped to 0)
- [x] 4.2 Auto-close an open finding at timeline end
- [x] 4.3 Keep an open start fixed during navigation; reject Stop at or before the start
- [x] 4.4 Render the sorted findings list with click-to-seek, delete, and optional note editing
- [x] 4.5 Draw finding ranges on the progress bar (overlaps allowed)

## 5. Persistence and Export

- [x] 5.1 Save and restore findings in localStorage keyed by the pair's two paths, with try/catch and in-memory fallback
- [x] 5.2 Export the current pair as JSON (`pair`, `videos`, `findings` with `start`, `end`, `note?` in seconds)
- [x] 5.3 Add Export all covering every saved pair

## 6. Verification

- [x] 6.1 Serve the folder over HTTP and test with a real 16:9 and 9:16 pair, including reversed input order
- [x] 6.2 Verify sync at start, after seeks, after buffering and over a long playback; check seek accuracy with the real encodes (verified with synthetic 1 s-keyframe H.264 clips; re-check with your real files)
- [x] 6.3 Verify each findings scenario in the specs (back-up, overlap, auto-close, free navigation, Stop-before-start, pair switch, delete, persistence after reload)
- [x] 6.4 Verify error cases: missing file, cross-origin path, blocked localStorage, mismatched durations

## 7. UI Overhaul

- [x] 7.1 Frame each video in a labelled pane (tag, orientation and aspect, file name, resolution, length, audio button) with an empty-state placeholder
- [x] 7.2 Point out length mismatches with an alert, per-pane length markers and a timeline note
- [x] 7.3 Add light, dark and auto themes with a top-bar toggle, persisted and applied before first paint
- [x] 7.4 Move the path inputs into a collapsible panel that closes after a successful load and reopens on error
- [x] 7.5 Put the findings in a sidebar beside the players, newest first, numbered by creation order, with a highlight on new entries
- [x] 7.6 Make the layout responsive (stack below 1100 px, no horizontal scroll on phones) and add Space to play/pause
- [x] 7.7 Verify the UI in the browser (layout, mismatch markers, ordering, themes, mobile) and fix issues found
- [x] 7.8 Make Start begin playback and Stop pause it (split play/pause helpers; rejected Stop and Start-at-end do not change playback)
- [x] 7.9 Show frame numbers per pane and per finding (MP4 header fps with a playback-estimate fallback)
- [x] 7.10 Edit a finding's start or end: click a time, nudge by frame or second, arrow keys, drag the bar, Set to playhead; playhead and videos stay in sync, clamped to one frame from the other endpoint
- [x] 7.11 Add frame rate and per-video frame numbers to the export, and store the frame rate with saved findings
- [x] 7.12 Add Import: load the pair from an exported file and merge its findings (dedupe), supporting single-pair and Export-all files with clear messages for bad files
