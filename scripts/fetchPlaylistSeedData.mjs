/**
 * Fetches all playlist data from the Brightcove API and writes stripped-down
 * seed JSON files to public/bundled-playlists/.
 *
 * Navigation fields (book, chapter, localized names, IDs, durations) are kept.
 * Expiring CDN fields (video sources, VTT URLs with tokens) are stripped.
 * Chapter VTT *content* is fetched and embedded inline as `bundledContent` so
 * chapter markers work offline without needing to re-fetch the expiring URL.
 *
 * Usage (from the repo root):
 *   node scripts/fetchPlaylistSeedData.mjs
 *
 * Requires: a .env file with VITE_BC_ACCOUNT_ID and VITE_POLICY_KEY
 *
 * Re-run whenever new playlists are added or videos are added to existing ones.
 * Commit the resulting public/bundled-playlists/*.json files.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Load env vars from .env
// ---------------------------------------------------------------------------
const envPath = resolve(root, ".env");
const envVars = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx < 0) continue;
  envVars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
}

const ACCOUNT_ID = envVars["VITE_BC_ACCOUNT_ID"];
const POLICY_KEY = envVars["VITE_POLICY_KEY"];

if (!ACCOUNT_ID || !POLICY_KEY) {
  console.error("Missing VITE_BC_ACCOUNT_ID or VITE_POLICY_KEY in .env");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Playlist slugs — must match playlist-mappers.ts
// ---------------------------------------------------------------------------
const PLAYLISTS = [
  "benin-new-testament",
  "ghana-new-testament",
  "cote-d'ivoire-new-testament",
  "togo-new-testament",
  "malawi-new-testament",
  "tanzania-new-testament",
  "cameroon-new-testament",
  "congo-french-nt",
  "ase-x-bukavusl",
  "marathi-nt",
  "brazil-nt",
  "pys-nt",
  "ins-x-keralasl",
  "mozambique-new-testament",
];

// ---------------------------------------------------------------------------
// Fetch VTT content for a single chapter track, with retry
// ---------------------------------------------------------------------------
async function fetchVttContent(src, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(src);
      if (res.ok) return await res.text();
    } catch {
      // retry
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

// ---------------------------------------------------------------------------
// Run a list of async tasks with a maximum concurrency
// ---------------------------------------------------------------------------
async function runConcurrent(tasks, concurrency) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ---------------------------------------------------------------------------
// Strip a video object, optionally embedding pre-fetched VTT content
// ---------------------------------------------------------------------------
function stripVideo(video, chapterVttContent) {
  const {
    sources,           // CDN video/HLS/DASH URLs with expiring tokens
    text_tracks,
    poster_sources,    // redundant with poster
    thumbnail_sources,
    thumbnail,
    ad_keys,
    cue_points,
    variants,
    transcripts,
    labels,
    ...keep
  } = video;

  const strippedTracks = (text_tracks || [])
    .filter((tt) => tt.kind === "chapters") // discard metadata/thumbnail tracks
    .map(({ sources: _s, src: _src, ...meta }) => ({
      ...meta,
      // Embed the VTT text so it works offline without re-fetching the URL
      ...(chapterVttContent ? { bundledContent: chapterVttContent } : {}),
    }));

  return {
    ...keep,
    text_tracks: strippedTracks.length ? strippedTracks : undefined,
  };
}

// ---------------------------------------------------------------------------
// Fetch + write
// ---------------------------------------------------------------------------
const outDir = resolve(root, "public", "bundled-playlists");
mkdirSync(outDir, { recursive: true });

let successCount = 0;
let failCount = 0;

for (const playlist of PLAYLISTS) {
  const url = `https://edge.api.brightcove.com/playback/v1/accounts/${ACCOUNT_ID}/playlists/ref:${playlist}?limit=500`;
  process.stdout.write(`Fetching ${playlist}... `);

  let data;
  try {
    const res = await fetch(url, {
      headers: { Accept: `application/json;pk=${POLICY_KEY}` },
    });
    if (!res.ok) {
      console.log(`FAILED (HTTP ${res.status})`);
      failCount++;
      continue;
    }
    data = await res.json();
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
    failCount++;
    continue;
  }

  const videos = data.videos || [];

  // Build concurrent tasks to fetch every chapter VTT in this playlist
  process.stdout.write(`fetching ${videos.length} chapter VTTs... `);
  const vttTasks = videos.map((vid) => async () => {
    const chapterTrack = vid.text_tracks?.find((tt) => tt.kind === "chapters");
    if (!chapterTrack) return null;
    // prefer the https source; fall back to the top-level src
    const src =
      chapterTrack.sources?.find((s) => s.src?.startsWith("https"))?.src ??
      chapterTrack.src;
    if (!src) return null;
    return fetchVttContent(src);
  });

  const vttContents = await runConcurrent(vttTasks, 20);

  const strippedVideos = videos.map((vid, i) => stripVideo(vid, vttContents[i]));
  const withVtts = strippedVideos.filter(
    (v) => v.text_tracks?.some((tt) => tt.bundledContent),
  ).length;

  const now = Date.now();
  const seed = {
    ...data,
    videos: strippedVideos,
    lastFetched: now,
    expiresBy: now + 1000 * 60 * 60 * 24 * 365 * 10,
    refreshBy: 0,
    isBundledSeed: true,
  };

  const outPath = resolve(outDir, `${playlist}.json`);
  writeFileSync(outPath, JSON.stringify(seed));

  const fileSizeKb = Math.round(
    Buffer.byteLength(JSON.stringify(seed)) / 1024,
  );
  console.log(`OK (${videos.length} videos, ${withVtts} with VTTs, ${fileSizeKb} KB)`);
  successCount++;
}

console.log(`\nDone: ${successCount} succeeded, ${failCount} failed.`);
if (successCount > 0) {
  console.log(`Seed files written to public/bundled-playlists/`);
  console.log(`Commit these files so they are bundled into the app.`);
}
