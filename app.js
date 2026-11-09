'use strict';

/* ---------- element refs ---------- */
const $ = (id) => document.getElementById(id);
const form = $('loadForm'), inA = $('pathA'), inB = $('pathB'), errA = $('errA'), errB = $('errB');
const vidA = $('vidA'), vidB = $('vidB'), wrapA = $('wrapA'), wrapB = $('wrapB');
const roleA = $('roleA'), roleB = $('roleB'), nameA = $('nameA'), nameB = $('nameB');
const frmA = $('frmA'), frmB = $('frmB'), importBtn = $('importBtn'), importFile = $('importFile');
const resA = $('resA'), resB = $('resB'), durA = $('durA'), durB = $('durB'), audioA = $('audioA'), audioB = $('audioB');
const playBtn = $('playBtn'), bar = $('bar'), markersEl = $('markers'), timeLabel = $('timeLabel'), tlNote = $('tlNote');
const speedSel = $('speedSel'), markBtn = $('markBtn'), exportBtn = $('exportBtn'), exportAllBtn = $('exportAllBtn');
const listEl = $('list'), emptyEl = $('empty'), openInfo = $('openInfo'), countEl = $('count');
const loaderPanel = $('loaderPanel'), videosBtn = $('videosBtn'), pairLabel = $('pairLabel');
const themeBtn = $('themeBtn'), themeIcon = $('themeIcon'), themeLabel = $('themeLabel');

/* ---------- icons ---------- */
const ICON = {
  play: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
  on: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  off: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6M21 9l-5 6"/></svg>',
  sun: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  auto: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>'
};
const warnEl = $('warn'), statusEl = $('status'), recentsWrap = $('recentsWrap'), recentsEl = $('recents');

/* ---------- constants ---------- */
const PREROLL_SECONDS = 2;      // clicking a finding starts playback this long before its recorded start
const DRIFT_THRESHOLD = 0.15;   // seconds before follower is resynced
const DRIFT_INTERVAL = 200;     // ms between drift checks
const END_EPS = 0.05;           // stop this close to the end (a paused video snaps back to its last shown frame, so "at end" is tracked by the atEnd flag, not by time)
const DURATION_WARN = 0.1;      // seconds of length difference before it is pointed out
const MAX_RECENTS = 10;
const BUFFERING_MSG = 'Buffering…';
const FINDINGS_PREFIX = 'vr:findings:';
const RECENTS_KEY = 'vr:recents';

/* ---------- state ---------- */
let loaded = false;
let pair = null;            // { a, b, key } as typed + storage key
let left = null, right = null;   // video elements: left = master (landscape), right = follower
let dur = 0;
let wantPlay = false;       // user intent
let stalled = false;        // paused by buffering coordination
let seekPending = false;
let seekTok = 0;
let loadTok = 0;
let scrubbing = false;
let audioSide = 'L';
let findings = [];          // { id, start, end, note }
let openStart = null;       // start of unclosed finding, or null
let lastDrift = 0;
let atEnd = false;          // playback finished; timeline reads exactly `dur` until the next seek
let resyncing = false;      // true while our own follower correction seek is in flight
let resyncAt = 0;
let lastAddedId = null;     // newest finding id, highlighted once in the list

/* ---------- storage (localStorage with in-memory fallback) ---------- */
const mem = new Map();
function sGet(k) {
  try { const v = localStorage.getItem(k); if (v !== null) return v; } catch (e) { /* blocked */ }
  return mem.has(k) ? mem.get(k) : null;
}
function sSet(k, v) {
  try { localStorage.setItem(k, v); mem.delete(k); } catch (e) { mem.set(k, v); }
}
function sDel(k) {
  try { localStorage.removeItem(k); } catch (e) { /* blocked */ }
  mem.delete(k);
}
function sKeys(prefix) {
  const keys = new Set();
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(prefix)) keys.add(k); } } catch (e) { /* blocked */ }
  for (const k of mem.keys()) if (k.startsWith(prefix)) keys.add(k);
  return [...keys];
}
function sGetJSON(k, fallback) {
  const raw = sGet(k);
  if (raw === null) return fallback;
  try { return JSON.parse(raw); } catch (e) { return fallback; }
}

/* ---------- helpers ---------- */
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const round3 = (x) => Math.round(x * 1000) / 1000;
function fmt(t) {
  if (!isFinite(t) || t < 0) t = 0;
  const tenths = Math.round(t * 10);
  const m = Math.floor(tenths / 600);
  const s = (tenths % 600) / 10;
  return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
}
const baseName = (p) => p.split('?')[0].split('/').filter(Boolean).pop() || p;
function setStatus(msg) { statusEl.textContent = msg; }
// Each warning is a string, or { text, cls } for extra styling.
function setWarnings(list) {
  warnEl.textContent = '';
  for (const w of list) {
    const d = document.createElement('div');
    d.textContent = typeof w === 'string' ? w : w.text;
    if (w.cls) d.className = w.cls;
    warnEl.append(d);
  }
}
function aspectLabel(w, h) {
  const r = w / h;
  const known = [[16 / 9, '16:9'], [9 / 16, '9:16'], [4 / 3, '4:3'], [3 / 4, '3:4'], [1, '1:1'], [21 / 9, '21:9'], [4 / 5, '4:5'], [5 / 4, '5:4']];
  for (const [v, l] of known) if (Math.abs(r - v) < 0.02) return l;
  return w + '×' + h;
}
function resolvePath(p) {
  const url = new URL(p, location.href);
  return url;
}
function pairKey(a, b) {
  const norm = (p) => { const u = resolvePath(p); return u.pathname + u.search; };
  return FINDINGS_PREFIX + [norm(a), norm(b)].sort().join('|');
}
const bothReady = () => loaded && vidA.readyState >= 3 && vidB.readyState >= 3;
const currentTime = () => (loaded ? (atEnd ? dur : clamp(left.currentTime, 0, dur)) : 0);

/* ---------- UI refresh ---------- */
function updatePlayBtn() {
  playBtn.innerHTML = wantPlay ? ICON.pause : ICON.play;
  playBtn.setAttribute('aria-label', wantPlay ? 'Pause' : 'Play');
  playBtn.title = wantPlay ? 'Pause (Space)' : 'Play (Space)';
  // Pause must always be possible; Play needs both videos ready.
  playBtn.disabled = !loaded || (!wantPlay && !bothReady());
  // Clear a stale "Buffering…" message once both videos are ready again.
  if (!stalled && bothReady() && statusEl.textContent === BUFFERING_MSG) setStatus('');
}
function updateTimeLabel(t) { timeLabel.textContent = fmt(t) + ' / ' + fmt(dur); }
function updateControls() {
  updatePlayBtn();
  bar.disabled = !loaded;
  markBtn.disabled = !loaded;
  exportBtn.disabled = !loaded;
  markBtn.classList.toggle('open', openStart !== null);
  markBtn.innerHTML = openStart !== null ? '&#9632; Stop finding' : '&#9679; Start finding';
  openInfo.textContent = openStart !== null
    ? 'Recording a finding from ' + fmt(openStart) + '. Move to where it ends, then click Stop finding.'
    : '';
  countEl.textContent = findings.length;
  updateAudioUI();
}

/* ---------- storage of findings & recents ---------- */
function saveFindings() {
  if (!pair) return;
  if (!findings.length) { sDel(pair.key); return; }
  sSet(pair.key, JSON.stringify({ a: pair.a, b: pair.b, findings, fps: currentFps() }));   // fps lets "Export all" include frame numbers
}
function currentFps() {
  const g = (el) => { const i = fpsInfo.get(el); return i ? i.fps : null; };
  return { a: g(vidA), b: g(vidB) };
}
function loadFindings() {
  const rec = sGetJSON(pair.key, null);
  findings = rec && Array.isArray(rec.findings) ? rec.findings.filter((f) => isFinite(f.start) && isFinite(f.end)) : [];
}
function getRecents() {
  const r = sGetJSON(RECENTS_KEY, []);
  return Array.isArray(r) ? r.filter((x) => x && x.a && x.b) : [];
}
function addRecent(a, b) {
  const key = pairKey(a, b);
  const list = getRecents().filter((r) => pairKey(r.a, r.b) !== key);
  list.unshift({ a, b });
  sSet(RECENTS_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)));
  renderRecents();
}
function renderRecents() {
  const list = getRecents();
  recentsEl.textContent = '';
  recentsWrap.hidden = list.length === 0;
  for (const r of list) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = baseName(r.a) + ' + ' + baseName(r.b);
    b.title = r.a + '  |  ' + r.b;
    b.addEventListener('click', () => { inA.value = r.a; inB.value = r.b; loadPair(r.a, r.b); });
    recentsEl.append(b);
  }
}

/* ---------- collapsible video inputs ---------- */
function setLoaderOpen(open) {
  loaderPanel.hidden = !open;
  videosBtn.setAttribute('aria-expanded', String(open));
}
function updatePairLabel() {
  pairLabel.textContent = pair ? baseName(pair.a) + ' + ' + baseName(pair.b) : 'Choose videos';
  pairLabel.title = pair ? pair.a + '  |  ' + pair.b : '';
}
videosBtn.addEventListener('click', () => setLoaderOpen(loaderPanel.hidden));

/* ---------- frame numbers ----------
   Browsers do not expose a video's frame rate, so it is found in two ways:
   1. exact: read it from the MP4 header (small Range requests; if the server ignores Range,
      only the first 2 MB is read), and
   2. estimated: from the spacing of presented frames while the video plays.
   Frame numbers start at 0: frame = floor(time x fps). */
const fpsInfo = new Map();        // video element -> { fps, estimated? }
const mediaTimes = new Map();     // video element -> media time of the last presented frame
const frameSamples = new Map();   // video element -> { deltas: [], n, t } for fps estimation
const COMMON_FPS = [24000 / 1001, 24, 25, 30000 / 1001, 30, 48, 50, 60000 / 1001, 60, 120];
const HAS_RVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
const frameEls = [[vidA, frmA, 'A'], [vidB, frmB, 'B']];
const snapFps = (f) => { for (const c of COMMON_FPS) if (Math.abs(f - c) / c < 0.005) return c; return Math.round(f * 100) / 100; };
const fmtFps = (info) => (info.estimated ? '~' : '') + Number(info.fps.toFixed(2)) + ' fps';
function frameAtTime(el, t) {
  const info = fpsInfo.get(el);
  return info ? Math.max(0, Math.floor(t * info.fps + 0.001)) : null;
}
function updateFrameChips() {
  for (const [el, chip] of frameEls) {
    const info = fpsInfo.get(el);
    let txt = 'Frame —';
    if (loaded && info) {
      // while playing, the presented frame's own timestamp is the most accurate; otherwise currentTime
      const t = (!el.paused && mediaTimes.has(el)) ? mediaTimes.get(el) : el.currentTime;
      txt = 'Frame ' + frameAtTime(el, t) + ' · ' + fmtFps(info);
    }
    if (chip.textContent !== txt) chip.textContent = txt;
    chip.title = loaded && !info ? 'Frame rate not detected yet; it is estimated after a moment of playback' : 'Frame number of the picture on screen (starts at 0)';
  }
}
function framesText(f) {
  const parts = [];
  for (const [el, , who] of frameEls) {
    if (!fpsInfo.has(el)) continue;
    parts.push(who + ' ' + frameAtTime(el, f.start) + ' → ' + frameAtTime(el, f.end));
  }
  return parts.length ? 'frames ' + parts.join(' · ') : '';
}

// --- exact fps from the MP4 header ---
const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const fourcc = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
function makeReader(url) {
  let head = null;   // set when the server ignores Range: we keep only the first 2 MB
  return async function get(start, len) {
    if (head) return start + len <= head.length ? head.subarray(start, start + len) : null;
    const r = await fetch(url, { headers: { Range: 'bytes=' + start + '-' + (start + len - 1) } });
    if (r.status === 206) return new Uint8Array(await r.arrayBuffer());
    if (r.status !== 200 || start !== 0) return null;
    const reader = r.body.getReader(), parts = [], cap = 2 * 1024 * 1024;
    let got = 0;
    while (got < cap) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length; }
    reader.cancel().catch(() => {});
    head = new Uint8Array(got);
    let o = 0; for (const p of parts) { head.set(p, o); o += p.length; }
    return len <= head.length ? head.subarray(0, len) : null;
  };
}
function* boxes(buf, start, end) {
  let p = start;
  while (p + 8 <= end) {
    let size = u32(buf, p), hdr = 8;
    const type = fourcc(buf, p + 4);
    if (size === 1) { size = u32(buf, p + 8) * 4294967296 + u32(buf, p + 12); hdr = 16; }
    else if (size === 0) size = end - p;
    if (size < hdr || p + size > end) return;
    yield { type, start: p + hdr, end: p + size };
    p += size;
  }
}
function findBox(buf, start, end, path) {
  for (const b of boxes(buf, start, end)) {
    if (b.type !== path[0]) continue;
    if (path.length === 1) return b;
    const r = findBox(buf, b.start, b.end, path.slice(1));
    if (r) return r;
  }
  return null;
}
function parseMoovFps(buf) {
  for (const trak of boxes(buf, 0, buf.length)) {
    if (trak.type !== 'trak') continue;
    const hdlr = findBox(buf, trak.start, trak.end, ['mdia', 'hdlr']);
    if (!hdlr || fourcc(buf, hdlr.start + 8) !== 'vide') continue;
    const mdhd = findBox(buf, trak.start, trak.end, ['mdia', 'mdhd']);
    const stts = findBox(buf, trak.start, trak.end, ['mdia', 'minf', 'stbl', 'stts']);
    if (!mdhd || !stts) return null;
    const timescale = u32(buf, mdhd.start + (buf[mdhd.start] === 1 ? 20 : 12));
    const n = Math.min(u32(buf, stts.start + 4), (stts.end - stts.start - 8) >> 3);
    let frames = 0, units = 0;
    for (let i = 0; i < n; i++) { const c = u32(buf, stts.start + 8 + i * 8), d = u32(buf, stts.start + 12 + i * 8); frames += c; units += c * d; }
    return frames && units && timescale ? { fps: frames * timescale / units, frames } : null;
  }
  return null;
}
async function mp4Fps(url) {
  try {
    const get = makeReader(url);
    let pos = 0;
    for (let i = 0; i < 40; i++) {            // walk the top-level boxes until 'moov'
      const h = await get(pos, 16);
      if (!h || h.length < 8) return null;
      let size = u32(h, 0), hdr = 8;
      const type = fourcc(h, 4);
      if (size === 1 && h.length >= 16) { size = u32(h, 8) * 4294967296 + u32(h, 12); hdr = 16; }
      if (size < hdr) return null;
      if (type === 'moov') {
        if (size > 64 * 1024 * 1024) return null;
        const body = await get(pos + hdr, size - hdr);
        return body && body.length >= size - hdr ? parseMoovFps(body) : null;
      }
      pos += size;
    }
  } catch (e) { /* not an MP4, or not readable: fall back to estimating */ }
  return null;
}

// --- estimated fps: spacing of presented frames while playing ---
function watchFrames(el) {
  if (!HAS_RVFC) return;
  const cb = (now, meta) => {
    mediaTimes.set(el, meta.mediaTime);
    if (!fpsInfo.has(el)) {
      const s = frameSamples.get(el) || { deltas: [], n: -1, t: 0 };
      // callbacks can be batched, so up to 4 frames may have passed since the last one: use time per frame
      const k = meta.presentedFrames - s.n;
      if (k >= 1 && k <= 4 && meta.mediaTime > s.t) s.deltas.push((meta.mediaTime - s.t) / k);
      s.n = meta.presentedFrames; s.t = meta.mediaTime;
      frameSamples.set(el, s);
      if (s.deltas.length >= 16) {
        const d = s.deltas.slice().sort((a, b) => a - b);
        fpsInfo.set(el, { fps: snapFps(1 / d[d.length >> 1]), estimated: true });
        frameSamples.delete(el);
        if (findings.length) saveFindings();
        renderList();
      }
    }
    el.requestVideoFrameCallback(cb);
  };
  el.requestVideoFrameCallback(cb);
}
watchFrames(vidA); watchFrames(vidB);
function detectFps(el, url, tok) {
  mp4Fps(url).then((r) => {
    if (tok !== loadTok || !r) return;
    fpsInfo.set(el, { fps: r.fps, frames: r.frames });
    frameSamples.delete(el);
    if (findings.length) saveFindings();   // keep the stored frame rate current
    renderList();
  });
}

/* ---------- findings rendering ---------- */
// Findings are stored in creation order; the list shows the newest first.
function sortedFindings() { return [...findings].sort((x, y) => x.start - y.start || x.end - y.end); }
function newestFirst() { return [...findings].reverse(); }
function renderMarkers() {
  markersEl.textContent = '';
  if (!loaded || dur <= 0) return;
  for (const f of findings) {
    const isEd = editing && editing.id === f.id;
    const s = document.createElement('div');
    s.className = isEd ? 'seg editing' : 'seg';
    s.style.left = (clamp(f.start / dur, 0, 1) * 100) + '%';
    s.style.width = (clamp((f.end - f.start) / dur, 0, 1) * 100) + '%';
    markersEl.append(s);
    if (isEd) {   // handle at the endpoint being edited
      const m = document.createElement('div');
      m.className = 'editmark';
      m.style.left = (clamp(f[editing.which] / dur, 0, 1) * 100) + '%';
      markersEl.append(m);
    }
  }
  if (openStart !== null) {
    const o = document.createElement('div');
    o.className = 'openmark';
    o.style.left = (clamp(openStart / dur, 0, 1) * 100) + '%';
    markersEl.append(o);
  }
}
function renderList() {
  listEl.textContent = '';
  const items = newestFirst();
  emptyEl.hidden = items.length > 0;
  items.forEach((f) => {
    const li = document.createElement('li');
    li.dataset.id = f.id;
    if (f.id === lastAddedId) li.className = 'new';
    const idx = document.createElement('span'); idx.className = 'idx'; idx.textContent = '#' + (findings.indexOf(f) + 1);
    const isEditing = editing && editing.id === f.id;
    if (isEditing) li.classList.add('editing');
    const range = document.createElement('span'); range.className = 'range';
    const tStart = document.createElement('button'); tStart.type = 'button'; tStart.className = 'time-btn t-start'; tStart.dataset.which = 'start';
    tStart.textContent = fmt2(f.start); tStart.title = 'Click to edit the start time';
    const tEnd = document.createElement('button'); tEnd.type = 'button'; tEnd.className = 'time-btn t-end'; tEnd.dataset.which = 'end';
    tEnd.textContent = fmt2(f.end); tEnd.title = 'Click to edit the end time';
    if (isEditing) (editing.which === 'start' ? tStart : tEnd).classList.add('active');
    const arrow = document.createElement('span'); arrow.className = 'arrow'; arrow.textContent = '→';
    const len = document.createElement('small'); len.className = 'len'; len.textContent = (f.end - f.start).toFixed(2) + ' s';
    range.append(tStart, arrow, tEnd, len);
    const note = document.createElement('input'); note.type = 'text'; note.className = 'note'; note.placeholder = 'note (optional)'; note.value = f.note || '';
    const del = document.createElement('button'); del.type = 'button'; del.className = 'del'; del.title = 'Delete finding'; del.setAttribute('aria-label', 'Delete finding'); del.textContent = '✕';
    li.append(idx, range, del);
    if (isEditing) li.append(buildEditor());
    const fr = framesText(f);
    if (fr) { const fe = document.createElement('span'); fe.className = 'frames'; fe.textContent = fr; li.append(fe); }
    li.append(note);
    listEl.append(li);
  });
  listEl.scrollTop = 0;
}
function renderFindings() { renderList(); renderMarkers(); updateControls(); }

/* ---------- editing a finding's start or end ----------
   Click a start/end time to edit it. The videos jump to exactly that time and the playhead and the
   value stay in sync: nudging, dragging the progress bar, the arrow keys and "Set to playhead" all
   move the playhead and the value together. Playback itself never changes the value. */
let editing = null;   // { id, which: 'start' | 'end' }
const round4 = (x) => Math.round(x * 10000) / 10000;
function fmt2(t) {    // hundredths of a second, for precise editing
  if (!isFinite(t) || t < 0) t = 0;
  const cs = Math.round(t * 100);
  const m = Math.floor(cs / 6000), s = (cs % 6000) / 100;
  return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
}
const findingById = (id) => findings.find((x) => String(x.id) === String(id));
const editTarget = () => (editing ? findingById(editing.id) : null);
function stepInfo() {   // one "frame" for nudging: the master's frame rate, else 25 fps
  const i = (left && fpsInfo.get(left)) || (right && fpsInfo.get(right));
  const fps = i ? i.fps : 25;
  return { fps, frame: 1 / fps, known: !!i };
}
function clampEdit(f, which, t) {
  const gap = stepInfo().frame;   // keep at least one frame between start and end
  t = clamp(t, 0, dur);
  if (which === 'start') t = Math.min(t, Math.max(0, f.end - gap));
  else t = Math.max(t, Math.min(dur, f.start + gap));
  return round4(t);
}
function updateRow(f) {
  const li = listEl.querySelector('li[data-id="' + f.id + '"]');
  if (!li) return;
  li.querySelector('.time-btn.t-start').textContent = fmt2(f.start);
  li.querySelector('.time-btn.t-end').textContent = fmt2(f.end);
  li.querySelector('.len').textContent = (f.end - f.start).toFixed(2) + ' s';
  const fr = framesText(f);
  let fe = li.querySelector('.frames');
  if (fe) fe.textContent = fr;
  else if (fr) { fe = document.createElement('span'); fe.className = 'frames'; fe.textContent = fr; li.insertBefore(fe, li.querySelector('.note')); }
}
// Set the edited endpoint to t (clamped). Returns the value actually used.
function applyEditValue(t, commit) {
  const f = editTarget();
  if (!f) return t;
  const v = clampEdit(f, editing.which, t);
  f[editing.which] = v;
  updateRow(f);
  renderMarkers();
  if (commit) saveFindings();
  return v;
}
function buildEditor() {
  const d = document.createElement('div');
  d.className = 'editor';
  const label = document.createElement('div');
  label.className = 'editor-label';
  label.textContent = 'Editing the ' + editing.which + '. The videos and playhead follow every change. Drag the progress bar, press ← / → (Shift = 10 frames), or use:';
  const row = document.createElement('div');
  row.className = 'editor-btns';
  const { frame, fps, known } = stepInfo();
  const mk = (txt, data, title) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn small'; b.textContent = txt;
    Object.assign(b.dataset, data);
    if (title) b.title = title;
    return b;
  };
  const ft = '1 frame = ' + frame.toFixed(3) + ' s (' + (known ? '' : 'assumed ') + Number(fps.toFixed(2)) + ' fps)';
  row.append(
    mk('− 1 s', { act: 'nudge', sec: '-1' }),
    mk('◀ 1 frame', { act: 'nudge', frames: '-1' }, ft),
    mk('1 frame ▶', { act: 'nudge', frames: '1' }, ft),
    mk('+ 1 s', { act: 'nudge', sec: '1' }),
    mk('Set to playhead', { act: 'setplay' }, 'Use the current playhead position'),
    mk('Done', { act: 'done' }, 'Finish editing (Esc)')
  );
  d.append(label, row);
  return d;
}
function startEdit(id, which) {
  const f = findingById(id);
  if (!f) return;
  pausePlayback();
  editing = { id, which };
  renderFindings();
  seekBoth(f[which]);   // show exactly the frame being edited
}
function endEdit() {
  if (!editing) return;
  editing = null;
  renderFindings();
}
function nudge({ frames = 0, seconds = 0 }) {
  const f = editTarget();
  if (!f) return;
  pausePlayback();
  const cur = f[editing.which];
  let t;
  if (frames) {
    const { fps } = stepInfo();
    const k = Math.max(0, Math.floor(cur * fps + 0.001) + frames);
    t = (k + 0.02) / fps;   // just inside the target frame, so rounding can never land on the neighbour
  } else t = cur + seconds;
  return seekBoth(applyEditValue(t, true));
}
function setToPlayhead() {
  if (!editTarget()) return;
  pausePlayback();
  const now = currentTime();
  const v = applyEditValue(now, true);
  if (Math.abs(v - now) > 0.001) seekBoth(v);
}

listEl.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const f = findingById(li.dataset.id);
  if (!f) return;
  if (e.target.closest('.del')) {
    if (editing && editing.id === f.id) editing = null;
    findings = findings.filter((x) => x !== f);
    saveFindings(); renderFindings();
    return;
  }
  const act = e.target.closest('[data-act]');
  if (act) {
    const a = act.dataset.act;
    if (a === 'nudge') nudge({ frames: +act.dataset.frames || 0, seconds: +act.dataset.sec || 0 });
    else if (a === 'setplay') setToPlayhead();
    else if (a === 'done') endEdit();
    return;
  }
  const tb = e.target.closest('.time-btn');
  if (tb) { startEdit(f.id, tb.dataset.which); return; }
  if (e.target.closest('.note, .editor')) return;
  seekBoth(Math.max(0, f.start - PREROLL_SECONDS));   // replay with a lead-in so the reviewer sees what led up to it
});
listEl.addEventListener('change', (e) => {
  if (!e.target.classList.contains('note')) return;
  const li = e.target.closest('li');
  const f = findings.find((x) => String(x.id) === li.dataset.id);
  if (f) { f.note = e.target.value.trim(); saveFindings(); }
});

/* ---------- findings logic ---------- */
function addFinding(start, end) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  findings.push({ id, start: round3(start), end: round3(end), note: '' });
  lastAddedId = id;
  setTimeout(() => { if (lastAddedId === id) lastAddedId = null; }, 2000);   // highlight only briefly
  saveFindings();
}
function closeOpen(end) {
  if (openStart === null) return;
  if (end > openStart) addFinding(openStart, end);
  openStart = null;
  renderFindings();
}
markBtn.addEventListener('click', () => {
  if (!loaded) return;
  const t = currentTime();
  if (openStart === null) {
    openStart = round3(t);   // exactly where the playhead is; the lead-in is only applied when replaying
    setStatus('');
    renderFindings();
    if (!atEnd) startPlayback();           // Start also plays, if the videos are not already playing
  } else if (t <= openStart) {
    // Stop is before the start: keep the finding open (and keep playing) so the user can move on and try again.
    setStatus('Stop must be after the start (' + fmt(openStart) + '). Move forward and click Stop again.');
  } else {
    closeOpen(t);
    setStatus('');
    renderFindings();
    pausePlayback();                       // Stop also pauses, if the videos are playing
  }
});

/* ---------- playback ---------- */
function pauseEls() { vidA.pause(); vidB.pause(); }
function playEls() {
  Promise.all([left.play(), right.play()]).catch((err) => {
    if (err && err.name === 'AbortError') return;
    wantPlay = false;
    setStatus('Playback failed: ' + (err && err.message ? err.message : err));
    updatePlayBtn();
  });
}
function waitSeeked(el) {
  return new Promise((res) => {
    if (!el.seeking) return res();
    let to;
    const done = () => { clearTimeout(to); el.removeEventListener('seeked', done); res(); };
    to = setTimeout(done, 4000);
    el.addEventListener('seeked', done);
  });
}
async function seekBoth(t) {
  if (!loaded) return;
  const tok = ++seekTok;
  seekPending = true;
  atEnd = false;
  t = clamp(t, 0, dur);
  const resume = wantPlay;
  pauseEls();
  left.currentTime = t;
  right.currentTime = t;
  await Promise.all([waitSeeked(left), waitSeeked(right)]);
  if (tok !== seekTok) return;
  seekPending = false;
  if (resume && wantPlay) {
    if (bothReady()) { stalled = false; playEls(); }
    else { stalled = true; setStatus('Buffering…'); }
  }
  updateTimeLabel(currentTime());
}
// A seek initiated by the user. Navigation never changes an open finding's start.
function userSeek(t) {
  t = clamp(t, 0, dur);
  if (editing) t = applyEditValue(t, true);   // while editing, the value follows the playhead
  return seekBoth(t);
}
// Move the follower onto the master's time. Flagged so the resulting 'waiting'
// event is not mistaken for genuine buffering.
function resyncFollower() {
  resyncing = true;
  resyncAt = performance.now();
  right.currentTime = left.currentTime;
}
function pausePlayback() {
  if (!wantPlay) return;
  wantPlay = false; stalled = false;
  pauseEls();
  setStatus('');
  updatePlayBtn();
}
function startPlayback() {
  if (wantPlay || !bothReady()) return;
  let t = currentTime();
  if (t >= dur - END_EPS) t = 0;
  wantPlay = true;
  setStatus('');
  updatePlayBtn();
  seekBoth(t);   // aligns both videos, then plays them together
}
function togglePlay() {
  if (wantPlay) pausePlayback(); else startPlayback();
}
function onEnd() {
  if (!loaded || !wantPlay) return;
  wantPlay = false; stalled = false;
  atEnd = true;
  pauseEls();
  bar.value = dur;
  updateTimeLabel(dur);
  closeOpen(dur);
  updatePlayBtn();
}
playBtn.addEventListener('click', togglePlay);

for (const el of [vidA, vidB]) {
  el.addEventListener('waiting', () => {
    if (loaded && wantPlay && !stalled && !seekPending && !resyncing) {
      stalled = true;
      pauseEls();
      setStatus('Buffering…');
    }
    updatePlayBtn();
  });
  el.addEventListener('canplay', () => {
    if (loaded && stalled && !seekPending && bothReady()) {
      stalled = false;
      setStatus('');
      if (wantPlay) {
        if (Math.abs(right.currentTime - left.currentTime) > DRIFT_THRESHOLD) resyncFollower();
        playEls();
      }
    }
    updatePlayBtn();
  });
  el.addEventListener('seeked', () => { resyncing = false; updatePlayBtn(); });
  el.addEventListener('playing', updatePlayBtn);
  el.addEventListener('ended', () => { if (!seekPending) onEnd(); });
  el.addEventListener('loadeddata', updatePlayBtn);
  el.addEventListener('canplaythrough', updatePlayBtn);
  el.addEventListener('error', () => {
    if (!loaded) return;   // load-time errors are reported by loadPair
    wantPlay = false; pauseEls();
    (el === vidA ? errA : errB).textContent = 'Playback error: the file stopped working.';
    updatePlayBtn();
  });
}

/* ---------- progress bar ---------- */
let pointerActive = false;
function commitScrub() {
  scrubbing = false;
  userSeek(+bar.value);
}
bar.addEventListener('pointerdown', () => {
  if (!loaded) return;
  pointerActive = true; scrubbing = true;
  if (wantPlay) pauseEls();
});
window.addEventListener('pointerup', () => { if (pointerActive) { pointerActive = false; commitScrub(); } });
window.addEventListener('pointercancel', () => { if (pointerActive) { pointerActive = false; commitScrub(); } });
bar.addEventListener('input', () => {
  const t = +bar.value;
  updateTimeLabel(t);
  if (!loaded) return;
  if (pointerActive) {   // live preview while dragging; an edited value follows (and may clamp) live
    atEnd = false;
    const v = editing ? applyEditValue(t, false) : t;
    if (v !== t) { bar.value = v; updateTimeLabel(v); }
    left.currentTime = v; right.currentTime = v;
  } else userSeek(t);                                                     // keyboard
});

/* ---------- speed ---------- */
let rate = 1;
// defaultPlaybackRate survives load(), so a new pair keeps the chosen speed.
function applyRate() {
  for (const el of [vidA, vidB]) { el.defaultPlaybackRate = rate; el.playbackRate = rate; }
}
speedSel.addEventListener('change', () => { rate = +speedSel.value; applyRate(); });

/* ---------- audio ---------- */
function applyAudio() {
  if (!left) return;
  left.muted = audioSide !== 'L';
  right.muted = audioSide !== 'R';
  updateAudioUI();
}
// Per-pane audio buttons: the active pane is the one that is audible.
function updateAudioUI() {
  for (const [el, btn] of [[vidA, audioA], [vidB, audioB]]) {
    const audible = !!left && ((audioSide === 'L' ? left : right) === el);
    btn.disabled = !loaded;
    btn.setAttribute('aria-pressed', String(audible));
    btn.innerHTML = (audible ? ICON.on : ICON.off) + '<span>' + (audible ? 'Audio on' : 'Muted') + '</span>';
    btn.title = audible ? 'This video is the audio source' : 'Click to hear this video instead';
  }
}
for (const [el, btn] of [[vidA, audioA], [vidB, audioB]]) {
  btn.addEventListener('click', () => {
    if (!loaded) return;
    audioSide = left === el ? 'L' : 'R';
    applyAudio();
  });
}

/* ---------- theme (auto / light / dark) ---------- */
const THEMES = ['auto', 'light', 'dark'];
let theme = THEMES.includes(sGet('vr:theme')) ? sGet('vr:theme') : 'auto';
function applyTheme() {
  const root = document.documentElement;
  if (theme === 'auto') delete root.dataset.theme; else root.dataset.theme = theme;
  themeIcon.innerHTML = ICON[theme === 'auto' ? 'auto' : theme === 'light' ? 'sun' : 'moon'];
  themeLabel.textContent = theme === 'auto' ? 'Auto' : theme === 'light' ? 'Light' : 'Dark';
}
themeBtn.addEventListener('click', () => {
  theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
  sSet('vr:theme', theme);
  applyTheme();
});
applyTheme();

/* ---------- keyboard ---------- */
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (editing && !e.target.closest('input, select, textarea')) {   // finding editor: frame stepping
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      e.preventDefault();
      nudge({ frames: (e.code === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 10 : 1) });
      return;
    }
    if (e.code === 'Escape') { e.preventDefault(); endEdit(); return; }
  }
  if (e.code !== 'Space' || e.repeat) return;
  if (e.target.closest('input, select, textarea, button, a')) return;   // let those handle Space themselves
  e.preventDefault();
  if (loaded) togglePlay();
});

/* ---------- frame loop: UI + drift + end detection ---------- */
function tick(ts) {
  updateFrameChips();
  if (loaded) {
    const t = currentTime();
    if (!scrubbing && !seekPending) { bar.value = t; updateTimeLabel(t); }
    if (wantPlay && !stalled && !seekPending && !scrubbing) {
      if (resyncing && performance.now() - resyncAt > 3000) resyncing = false;   // failsafe
      if (ts - lastDrift >= DRIFT_INTERVAL) {
        lastDrift = ts;
        if (!resyncing && !right.seeking && !right.ended && Math.abs(right.currentTime - left.currentTime) > DRIFT_THRESHOLD) {
          resyncFollower();
        }
      }
      if (left.currentTime >= dur - END_EPS || right.currentTime >= dur - END_EPS) onEnd();
    }
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

/* ---------- loading a pair ---------- */
function resetPlayer() {
  seekTok++; seekPending = false; resyncing = false; atEnd = false; editing = null;
  wantPlay = false; stalled = false; scrubbing = false; pointerActive = false;
  openStart = null; findings = []; loaded = false; pair = null; dur = 0;
  for (const el of [vidA, vidB]) { el.pause(); el.removeAttribute('src'); el.load(); fpsInfo.delete(el); mediaTimes.delete(el); frameSamples.delete(el); }
  left = right = null;
  bar.value = 0; bar.max = 1;
  for (const [w, role, name, res, dr, who] of [[wrapA, roleA, nameA, resA, durA, 'A'], [wrapB, roleB, nameB, resB, durB, 'B']]) {
    w.classList.add('empty'); w.classList.remove('longer');
    w.style.removeProperty('--ar');
    role.textContent = 'Video ' + who; name.textContent = 'Not loaded'; name.title = '';
    res.textContent = '—'; dr.textContent = '—'; dr.className = 'chip';
  }
  tlNote.textContent = '';
  updatePairLabel();
  setWarnings([]);
  updateTimeLabel(0);
  renderFindings();
}
async function headCheck(url) {
  try {
    const r = await fetch(url.href, { method: 'HEAD' });
    if (r.status === 404) return 'File not found (404).';
    if (!r.ok && r.status !== 405 && r.status !== 501) return 'Server returned HTTP ' + r.status + '.';
  } catch (e) { /* let the video element report it */ }
  return '';
}
function waitMetadata(el, tok) {
  return new Promise((res) => {
    const ok = () => { cleanup(); res(''); };
    const bad = () => { cleanup(); res('Cannot play this file (unsupported format or corrupt).'); };
    const cleanup = () => { el.removeEventListener('loadedmetadata', ok); el.removeEventListener('error', bad); };
    if (tok !== loadTok) return res('');
    el.addEventListener('loadedmetadata', ok);
    el.addEventListener('error', bad);
  });
}
function validatePath(p) {
  if (!p) return { error: 'Enter a path.' };
  let url;
  try { url = resolvePath(p); } catch (e) { return { error: 'Not a valid path.' }; }
  if (url.origin !== location.origin) return { error: 'Only paths on this server are allowed.' };
  return { url };
}
async function loadPair(a, b) {
  a = a.trim(); b = b.trim();
  errA.textContent = errB.textContent = '';
  if (location.protocol === 'file:') { setStatus('Serve this page over HTTP to load videos.'); return; }
  const va = validatePath(a), vb = validatePath(b);
  if (va.error) errA.textContent = va.error;
  if (vb.error) errB.textContent = vb.error;
  if (va.error || vb.error) { setLoaderOpen(true); return; }

  const tok = ++loadTok;
  resetPlayer();
  setStatus('Loading…');

  const [ha, hb] = await Promise.all([headCheck(va.url), headCheck(vb.url)]);
  if (tok !== loadTok) return;
  if (ha) errA.textContent = ha;
  if (hb) errB.textContent = hb;
  if (ha || hb) { setStatus(''); setLoaderOpen(true); return; }

  const metaA = waitMetadata(vidA, tok), metaB = waitMetadata(vidB, tok);
  vidA.src = va.url.href; vidB.src = vb.url.href;
  vidA.load(); vidB.load();
  const [ea, eb] = await Promise.all([metaA, metaB]);
  if (tok !== loadTok) return;
  if (ea) errA.textContent = ea;
  if (eb) errB.textContent = eb;
  if (ea || eb) { setStatus(''); setLoaderOpen(true); return; }
  if (!vidA.videoWidth || !vidB.videoWidth) {
    if (!vidA.videoWidth) errA.textContent = 'No video track found.';
    if (!vidB.videoWidth) errB.textContent = 'No video track found.';
    setStatus(''); setLoaderOpen(true); return;
  }

  // orientation: landscape on the left (master), portrait on the right
  const warnings = [];
  const aLand = vidA.videoWidth >= vidA.videoHeight, bLand = vidB.videoWidth >= vidB.videoHeight;
  let lw, rw;
  if (!aLand && bLand) { left = vidB; right = vidA; lw = wrapB; rw = wrapA; }
  else {
    left = vidA; right = vidB; lw = wrapA; rw = wrapB;
    if (aLand === bLand) warnings.push('Both videos have the same orientation; keeping the entered order (A left, B right).');
  }
  lw.style.order = 0; rw.style.order = 1;
  for (const [el, w] of [[left, lw], [right, rw]]) w.style.setProperty('--ar', (el.videoWidth / el.videoHeight).toFixed(4));
  // pane headers: role, file name, resolution
  for (const [el, w, role, name, res, path] of [[vidA, wrapA, roleA, nameA, resA, a], [vidB, wrapB, roleB, nameB, resB, b]]) {
    w.classList.remove('empty');
    role.textContent = (el.videoWidth >= el.videoHeight ? 'Landscape' : 'Portrait') + ' · ' + aspectLabel(el.videoWidth, el.videoHeight);
    name.textContent = baseName(path); name.title = path;
    res.textContent = el.videoWidth + '×' + el.videoHeight;
  }

  // shared timeline = shorter duration
  const dA = vidA.duration, dB = vidB.duration;
  if (!isFinite(dA) || !isFinite(dB) || dA <= 0 || dB <= 0) {
    setStatus('Could not determine video durations.'); setLoaderOpen(true); return;
  }
  dur = Math.min(dA, dB);
  const diff = Math.abs(dA - dB);
  const mismatch = diff > DURATION_WARN;
  for (const [d, w, chip] of [[dA, wrapA, durA], [dB, wrapB, durB]]) {
    chip.className = 'chip';
    chip.textContent = 'Length ' + fmt(d);
    if (mismatch) {
      const isLonger = d > dur;
      chip.classList.add(isLonger ? 'longer' : 'shorter');
      chip.textContent += isLonger ? ' · ' + diff.toFixed(1) + ' s longer' : ' · shorter';
      w.classList.toggle('longer', isLonger);
    }
  }
  if (mismatch) {
    const longer = dA > dB ? 'Video A' : 'Video B';
    warnings.unshift({
      cls: 'mismatch',
      text: 'Durations differ: Video A is ' + fmt(dA) + ' and Video B is ' + fmt(dB) + ' (' + longer + ' is ' + diff.toFixed(1) +
        ' s longer). The timeline and progress bar stop at ' + fmt(dur) + ', so the last ' + diff.toFixed(1) + ' s of ' + longer + ' cannot be reviewed here.'
    });
    tlNote.textContent = 'Timeline ends at ' + fmt(dur) + ' (shorter video)';
  }
  setWarnings(warnings);
  bar.max = dur; bar.value = 0;

  pair = { a, b, key: pairKey(a, b) };
  loaded = true;
  detectFps(vidA, va.url.href, tok);
  detectFps(vidB, vb.url.href, tok);
  loadFindings();
  applyAudio();
  applyRate();
  addRecent(a, b);
  updatePairLabel();
  setLoaderOpen(false);
  const u = new URL(location.href);
  u.search = '?' + new URLSearchParams({ a, b }).toString();
  try { history.replaceState(null, '', u); } catch (e) { /* ignore */ }
  setStatus(bothReady() ? '' : 'Buffering…');
  updateTimeLabel(0);
  renderFindings();
}
form.addEventListener('submit', (e) => { e.preventDefault(); loadPair(inA.value, inB.value); });

/* ---------- export ---------- */
// fps = { a, b } (frames per second of each video, or null). When known, each finding also carries the
// start/end frame number (counted from 0) in each video.
function recordFor(a, b, list, fps) {
  const f = fps || {};
  const frame = (fp, t) => Math.max(0, Math.floor(t * fp + 0.001));
  const rec = { pair: { a, b }, videos: [a, b] };
  if (f.a || f.b) rec.fps = { a: f.a ? Number(f.a.toFixed(5)) : null, b: f.b ? Number(f.b.toFixed(5)) : null };
  rec.findings = [...list].sort((x, y) => x.start - y.start || x.end - y.end).map((x) => {
    const o = { start: x.start, end: x.end };
    if (x.note) o.note = x.note;
    if (f.a || f.b) {
      o.frames = {};
      if (f.a) o.frames.a = { start: frame(f.a, x.start), end: frame(f.a, x.end) };
      if (f.b) o.frames.b = { start: frame(f.b, x.start), end: frame(f.b, x.end) };
    }
    return o;
  });
  return rec;
}
function download(name, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
exportBtn.addEventListener('click', () => {
  if (!pair) return;
  download('findings-' + baseName(pair.a).replace(/\.[^.]+$/, '') + '.json', recordFor(pair.a, pair.b, findings, currentFps()));
});
exportAllBtn.addEventListener('click', () => {
  const out = [];
  for (const k of sKeys(FINDINGS_PREFIX)) {
    if (pair && k === pair.key) continue;   // use live state for the current pair below
    const rec = sGetJSON(k, null);
    if (rec && rec.a && rec.b && Array.isArray(rec.findings) && rec.findings.length) out.push(recordFor(rec.a, rec.b, rec.findings, rec.fps));
  }
  if (pair && findings.length) out.push(recordFor(pair.a, pair.b, findings, currentFps()));
  if (!out.length) { setStatus('No saved findings to export.'); return; }
  download('findings-all.json', out);
});

/* ---------- import ("upload project") ----------
   Accepts a file produced by Export JSON (one pair) or Export all (a list of pairs). The videos are
   loaded from the paths in the file and the findings are merged into what is already saved for that
   pair; a finding that is already there (same start, end and note) is not added twice. Times in
   seconds are the source of truth; the frame numbers in the file are informational. */
function normalizeRecord(r) {
  if (!r || typeof r !== 'object') return null;
  const p = r.pair && typeof r.pair.a === 'string' ? r.pair : (Array.isArray(r.videos) ? { a: r.videos[0], b: r.videos[1] } : null);
  if (!p || typeof p.a !== 'string' || typeof p.b !== 'string' || !p.a.trim() || !p.b.trim() || !Array.isArray(r.findings)) return null;
  const list = [];
  let invalid = 0;
  for (const f of r.findings) {
    if (f && Number.isFinite(f.start) && Number.isFinite(f.end) && f.start >= 0 && f.end > f.start) {
      list.push({ start: round4(f.start), end: round4(f.end), note: typeof f.note === 'string' ? f.note : '' });
    } else invalid++;
  }
  const fp = (x) => (Number.isFinite(x) && x > 0 ? x : null);
  return { a: p.a.trim(), b: p.b.trim(), findings: list, invalid, fps: r.fps && typeof r.fps === 'object' ? { a: fp(r.fps.a), b: fp(r.fps.b) } : null };
}
function mergeRecord(rec) {
  const key = pairKey(rec.a, rec.b);
  const stored = sGetJSON(key, null);
  const list = stored && Array.isArray(stored.findings) ? stored.findings : [];
  let added = 0, dup = 0;
  for (const f of rec.findings) {
    if (list.some((x) => Math.abs(x.start - f.start) < 0.0005 && Math.abs(x.end - f.end) < 0.0005 && (x.note || '') === f.note)) { dup++; continue; }
    list.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), start: f.start, end: f.end, note: f.note });
    added++;
  }
  if (list.length) sSet(key, JSON.stringify({ a: rec.a, b: rec.b, findings: list, fps: rec.fps || (stored && stored.fps) || null }));
  return { added, dup };
}
async function importProject(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch (e) { setStatus('That file is not valid JSON.'); return; }
  const recs = (Array.isArray(data) ? data : [data]).map(normalizeRecord).filter(Boolean);
  if (!recs.length) { setStatus('This is not a findings file exported by this tool.'); return; }
  let added = 0, dup = 0, invalid = 0, offServer = 0;
  const usable = [];
  for (const rec of recs) {
    if (validatePath(rec.a).error || validatePath(rec.b).error) { offServer++; continue; }
    const r = mergeRecord(rec);
    added += r.added; dup += r.dup; invalid += rec.invalid;
    usable.push(rec);
  }
  if (!usable.length) { setStatus('The video paths in this file are not on this server (paths must be relative to this page).'); return; }
  for (const rec of usable.slice(1).reverse()) addRecent(rec.a, rec.b);   // other pairs open from "Recent"
  const first = usable[0];
  inA.value = first.a; inB.value = first.b;
  await loadPair(first.a, first.b);
  const parts = ['Imported ' + added + ' finding' + (added === 1 ? '' : 's')];
  if (dup) parts.push(dup + ' already present');
  if (invalid) parts.push(invalid + ' skipped (invalid times)');
  if (offServer) parts.push(offServer + ' pair' + (offServer === 1 ? '' : 's') + ' skipped (not on this server)');
  let msg = parts.join(', ') + '.';
  if (usable.length > 1) msg += ' Loaded the first of ' + usable.length + ' pairs; the others are in Recent.';
  if (!loaded) msg += ' The videos could not be loaded; the findings are saved and will appear once they can.';
  setStatus(msg);
}
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', () => {
  const file = importFile.files[0];
  if (file) importProject(file).finally(() => { importFile.value = ''; });
});

/* ---------- startup ---------- */
if (location.protocol === 'file:') {
  $('fileBanner').hidden = false;
  $('loadBtn').disabled = true;
}
renderRecents();
renderFindings();
updateTimeLabel(0);
applyRate();
{
  const q = new URLSearchParams(location.search);
  const qa = q.get('a'), qb = q.get('b');
  if (qa && qb) { inA.value = qa; inB.value = qb; loadPair(qa, qb); }
}
