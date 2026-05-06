/**
 * Fetches all playlist data from the Brightcove API and writes stripped-down
 * seed JSON files to public/bundled-playlists/.
 *
 * The seed files contain only the navigation-critical fields (book, chapter,
 * localized names, IDs, durations). Expiring CDN fields (video sources, VTT
 * chapter URLs, poster_sources, thumbnail_sources) are stripped out so the
 * files stay valid indefinitely and stay small.
 *
 * Usage (from the repo root):
 *   node scripts/fetchPlaylistSeedData.mjs
 *
 * Requires: a .env file with VITE_BC_ACCOUNT_ID and VITE_POLICY_KEY
 *
 * Run this whenever new playlists are added or the video list changes.
 * Commit the resulting public/bundled-playlists/*.json files.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Load env vars from .env (no dotenv dependency needed)
// ---------------------------------------------------------------------------
const envPath = resolve(root, ".env");
const envVars = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx < 0) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const value = trimmed.slice(eqIdx + 1).trim();
  envVars[key] = value;
}

const ACCOUNT_ID = envVars["VITE_BC_ACCOUNT_ID"];
const POLICY_KEY = envVars["VITE_POLICY_KEY"];

if (!ACCOUNT_ID || !POLICY_KEY) {
  console.error("Missing VITE_BC_ACCOUNT_ID or VITE_POLICY_KEY in .env");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Playlist slugs (must match playlist-mappers.ts)
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
// Fields to strip from each video object — these expire and aren't useful offline
// ---------------------------------------------------------------------------
function stripVideo(video) {
  const {
    sources,         // CDN video/HLS/DASH URLs with expiring tokens
    text_tracks,     // VTT chapter URLs with expiring tokens
    poster_sources,  // redundant with poster
    thumbnail_sources,
    thumbnail,
    ad_keys,
    cue_points,
    variants,
    transcripts,
    labels,
    ...keep
  } = video;

  // Strip text_track *sources* arrays but keep the track metadata (kind/label)
  // so the app still knows chapters exist, even though it can't fetch them offline
  const strippedTextTracks = (text_tracks || []).map(({ sources: _s, src: _src, ...trackMeta }) => trackMeta);

  return {
    ...keep,
    text_tracks: strippedTextTracks.length ? strippedTextTracks : undefined,
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

  try {
    const res = await fetch(url, {
      headers: { Accept: `application/json;pk=${POLICY_KEY}` },
    });
    if (!res.ok) {
      console.log(`FAILED (HTTP ${res.status})`);
      failCount++;
      continue;
    }

    const data = await res.json();
    const now = Date.now();

    const seed = {
      ...data,
      videos: (data.videos || []).map(stripVideo),
      // Timestamps that signal "this is bundled seed data"
      lastFetched: now,
      expiresBy: now + 1000 * 60 * 60 * 24 * 365 * 10, // effectively never
      refreshBy: 0, // always refresh in background when online
      isBundledSeed: true,
    };

    const outPath = resolve(outDir, `${playlist}.json`);
    writeFileSync(outPath, JSON.stringify(seed));

    const videoCount = seed.videos?.length ?? 0;
    console.log(`OK (${videoCount} videos)`);
    successCount++;
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
    failCount++;
  }
}

console.log(`\nDone: ${successCount} succeeded, ${failCount} failed.`);
if (successCount > 0) {
  console.log(`Seed files written to public/bundled-playlists/`);
  console.log(`Commit these files so they are bundled into the app.`);
}
