# Dual Video Review

A single-page tool for comparing two renditions of the same content, a **landscape (16:9)** and a **portrait (9:16)** video, side by side, and logging exactly where they differ.

- Both videos play from **one play button** and **one progress bar**, kept in sync.
- Click **Start finding** / **Stop finding** when you spot a difference; the times (and frame numbers) are recorded.
- Edit the times frame by frame, add notes, and **export / import** the findings as JSON.

It is plain HTML, CSS and JavaScript. There is **no build step, no backend and no dependencies**: serve the folder with any web server and open `index.html`.

---

## Quick start

```bash
# 1. Put your videos next to the page
cp ~/clips/clipA_16x9.mp4 ~/clips/clipA_9x16.mp4 media/

# 2. Serve the folder over HTTP (opening index.html as a file:// URL will not work)
python3 -m http.server 8000        # simplest; see the note on Range requests below

# 3. Open it
open http://localhost:8000/
```

In the page, type the two paths (`media/clipA_16x9.mp4` and `media/clipA_9x16.mp4`) and click **Load videos**. The order does not matter: the landscape video is always shown on the left.

> **Range requests.** Seeking works best when the server supports HTTP `Range` requests. Python's built-in `http.server` does **not**, which can make seeking slow or imprecise on large files. For real use, prefer one that does, for example `npx http-server -p 8000`, `npx serve -l 8000`, or `caddy file-server --listen :8000`. See [Deployment](#deployment).

---

## Using the tool

### Loading videos

| | |
|---|---|
| **Paths** | Relative to the page, for example `media/clip.mp4`. Only files on the same server (same origin) are allowed. |
| **Order** | Enter A and B in either order; landscape goes left, portrait right. |
| **Recent** | Pairs you have loaded are remembered as one-click chips. |
| **Deep link** | `index.html?a=media/x.mp4&b=media/y.mp4` opens a pair directly. The address bar updates when you load a pair, so you can share the link. |
| **Hide the inputs** | After a successful load the inputs collapse to give the videos more room. Click the pair name in the top bar to reopen them. They reopen by themselves if a load fails. |

Each video sits in its own pane showing its orientation, file name, resolution, length and **current frame number**.

### Playback

- **One play button, one progress bar.** Click or drag the bar to seek both videos to the same time.
- **Space** plays or pauses (when you are not typing in a field).
- **Speed:** 0.25× to 2×, applied to both videos.
- **Audio** plays from one video at a time. Click the audio button on a pane to hear that video.
- The page waits until both videos can play, pauses both if either one buffers, and corrects small drift between them automatically.
- **Different lengths:** if the videos differ by more than 0.1 s, the page points it out with an alert, a "longer" / "shorter" marker on each pane and a note under the progress bar. The timeline stops at the **shorter** video, so the extra part of the longer one cannot be reviewed.

### Recording findings

1. Move to a spot where the videos differ.
2. Click **Start finding**. The start time is recorded **exactly at the playhead**, and the videos **play** if they were paused.
3. Click **Stop finding** where the difference ends. The end time is recorded exactly at the playhead and the videos **pause**.

You can jump around freely between Start and Stop; the recorded start never moves. Stop must be after the start; otherwise the finding stays open and a message tells you.

Things you can do with a finding in the sidebar:

| Action | How |
|---|---|
| **Replay it** | Click the finding's number badge or the empty area of the row. Both videos jump to **2 seconds before** its start so you see what led up to it. |
| **Edit start or end** | Click the start or end time. The videos jump to exactly that time and the playhead follows every change. |
| **Nudge** | `◀ 1 frame`, `1 frame ▶`, `−1 s`, `+1 s` buttons, or the **← / →** keys (**Shift** = 10 frames). |
| **Drag the playhead** | While editing, dragging or clicking the progress bar sets the edited time to the playhead. **Set to playhead** applies wherever you have navigated. |
| **Finish editing** | **Done** or **Esc**. The start can never pass the end (one frame minimum between them). |
| **Add a note** | Type in the note box under the finding. |
| **Delete** | Click ✕. |

Findings are listed **newest first**, numbered in the order you made them, and drawn as bands on the progress bar. Overlapping findings are allowed. If the videos end while a finding is open, it closes at the end of the timeline.

### Frame numbers

Each pane shows the frame on screen, for example `Frame 211 · 25 fps` (counting from **0**), and each finding shows its start and end frame in both videos.

Browsers do not expose a video's frame rate, so the page finds it in two ways:

1. **Exact:** it reads the MP4 file header (a few small `Range` requests; if the server ignores `Range` it reads only the first 2 MB).
2. **Estimated:** otherwise it measures frame spacing for a moment while the video plays and shows `~25 fps`. Until then the pane shows `Frame —`. This needs a browser with `requestVideoFrameCallback`.

Variable-frame-rate videos get an average rate, so their frame numbers are approximate.

### Export and import

**Export JSON** downloads the current pair's findings. **Export all** downloads every pair saved in this browser. **Import** accepts either file: it loads the pair named in the file and merges the findings.

```json
{
  "pair":   { "a": "media/clip_16x9.mp4", "b": "media/clip_9x16.mp4" },
  "videos": ["media/clip_16x9.mp4", "media/clip_9x16.mp4"],
  "fps":    { "a": 25, "b": 25 },
  "findings": [
    {
      "start": 3,
      "end": 4.52,
      "note": "colour mismatch",
      "frames": { "a": { "start": 75, "end": 113 }, "b": { "start": 75, "end": 113 } }
    }
  ]
}
```

- Times are **seconds** and are the source of truth. `fps` and `frames` are included only when the frame rate is known; frame numbers start at 0. `note` appears only when set. Findings are ordered by start time.
- **Export all** is a JSON array of these records, one per pair.
- **Import** merges into what is already saved for that pair and **does not add a finding twice** (same start, end and note), so importing the same file again is harmless. It reports how many findings were imported, already present or skipped. A file that is not valid JSON, or not an export from this tool, is rejected with a message and nothing changes.
- The videos must be reachable at the **same relative paths** as when you exported. If they are not, the findings are still saved and appear once the videos can be loaded.

### Themes

The **Auto / Light / Dark** button in the top bar switches theme. Auto follows your operating system. The choice is remembered.

---

## Where your data is stored

Findings, recent pairs and the theme are stored in your browser's **localStorage**, per browser and per site address. That means:

- Nothing is sent to a server, and **other people do not see your findings**. To share work, **Export** and send the file; the other person uses **Import**.
- Clearing the browser's site data deletes the findings. **Export regularly.**
- If localStorage is blocked (some private windows), the tool still works for the session but cannot save.
- Findings are keyed by the two video paths. Renaming a video file means its saved findings will not show up under the new name (an exported file still names the original paths).

---

## Deployment

The app is three static files, so anything that serves static files works:

```
index.html   app.js   style.css   media/…
```

Requirements:

1. **HTTP or HTTPS.** `file://` does not work (the page needs same-origin loading and localStorage).
2. **Videos on the same origin as the page** (same scheme, host and port), for example under `/media/`. Cross-origin video URLs are rejected on purpose.
3. **HTTP `Range` support** for smooth seeking and exact frame-rate detection. Nginx, Apache, Caddy and most CDNs and object stores have it by default; Python's `http.server` does not.
4. **Correct video MIME types** (`video/mp4`, and `video/quicktime` or `video/mp4` for `.mov`).

### Preparing videos

MP4 with H.264 video and AAC audio plays in every current browser. For best seeking and fastest start:

```bash
ffmpeg -i input.mov -c:v libx264 -pix_fmt yuv420p -g 25 -c:a aac -movflags +faststart output.mp4
```

- `-movflags +faststart` moves the index to the front of the file, so playback and frame-rate detection start immediately.
- `-g 25` (about one keyframe per second) makes seeking land close to the requested time. Sparse keyframes can make a seek land a little off.
- Keep the **frame rate and duration of the two renditions the same** where you can; the page copes with differences but warns about them.

### Nginx

```nginx
server {
    listen 80;
    server_name review.example.com;
    root /var/www/dual-video-review;     # index.html, app.js, style.css, media/

    location / {
        try_files $uri $uri/ =404;
        add_header Cache-Control "no-cache";   # always pick up new versions of the page
    }
    location /media/ {
        add_header Accept-Ranges bytes;
    }
}
```

### Docker (nginx)

```bash
docker run -d --name video-review -p 8080:80 \
  -v "$PWD":/usr/share/nginx/html:ro \
  nginx:alpine
```

This serves the project folder (including `media/`) at `http://localhost:8080/`. Put it behind your usual TLS terminator for HTTPS.

### Caddy

```
review.example.com {
    root * /var/www/dual-video-review
    file_server
}
```

### CDN or object storage

Serve the page **and** the videos from one hostname (for example a CloudFront distribution with one origin for the three files and another for `/media/*`, both under the same domain). Videos on a different domain than the page will be refused.

> The nginx, Docker and Caddy snippets above are standard configurations, but they have **not** been run for this project. The app itself has been tested with a Range-capable static server.

### Updating

There is no build. Replace the files and reload. If a browser keeps showing old behaviour after an update, do a hard refresh (Cmd/Ctrl + Shift + R); serving `index.html` with `Cache-Control: no-cache` (as above) avoids this.

### Security notes

- The page only reads files the server already serves; it uploads nothing.
- Paths must resolve to the same origin, so a crafted link cannot make the page load a video from another site.
- There is no authentication. If the videos are confidential, put the site behind your normal access control (VPN, basic auth, SSO proxy).

---

## Browser support

Developed and tested in **Chrome**. It uses standard web features (HTML `<video>`, CSS container queries, `localStorage`, `requestVideoFrameCallback` where available) and should work in current Safari and Firefox, but those are **not tested**. Video support depends on the browser's codecs, so stick to H.264 + AAC MP4 for portability.

---

## Project layout

```
index.html      page structure
app.js          all behaviour: loading, sync, findings, frame numbers, export/import
style.css       layout and light/dark themes
media/          put your videos here (contents are git-ignored)
r1.md           the original requirements note
openspec/       specifications and design (OpenSpec)
.claude/        OpenSpec slash commands for Claude Code
```

### Specifications

The behaviour is specified with OpenSpec in `openspec/changes/dual-video-review-tool/`:

- `proposal.md`: why and what
- `design.md`: how and why (sync strategy, frame-rate detection, editor, export/import)
- `specs/`: requirements and scenarios for `video-pair-loading`, `synced-playback`, `findings` and `review-ui`
- `tasks.md`: the implementation checklist (all done)

```bash
openspec list                      # active changes
openspec validate dual-video-review-tool
```

When you are finished with a change, archive it with `/opsx:archive` so the specs move into `openspec/specs/`.

---

## Known limitations

- Findings live in one browser; sharing is by export / import.
- The timeline uses the shorter video; any extra length in the longer one cannot be reviewed.
- Frame numbers for variable-frame-rate or non-MP4 videos are estimates.
- Seek accuracy depends on how the videos were encoded.
- Not tested in Safari or Firefox.
