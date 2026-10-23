#!/usr/bin/env node
/* Responsive AVIF copies of the photos and panoramas in public/media, for <picture> srcsets and the 360° viewer.
   Runs before `dev` and `build`; only images that changed are encoded again. Writes public/media/r/ (not in git) and
   src/lib/media-manifest.json (in git: the widths each image comes in, and its size, so pages can reserve its space).

   node scripts/optimize-images.mjs [--force] */
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import sharp from "sharp";

const root = join(dirname(new URL(import.meta.url).pathname), "..");
const media = join(root, "public", "media");
const out = join(media, "r");
const force = process.argv.includes("--force");
mkdirSync(out, { recursive: true });

const PHOTO_WIDTHS = [480, 800, 1200, 1600, 2400];
const PANO_WIDTHS = [1024, 2048, 4096];

const jobs = [
  ...readdirSync(media)
    .filter((f) => f.endsWith(".jpg"))
    .map((f) => ({ file: join(media, f), url: `/media/${f}`, prefix: basename(f, ".jpg"), widths: PHOTO_WIDTHS, quality: 52 })),
  ...readdirSync(join(media, "pano"))
    .filter((f) => f.endsWith(".jpg") && !f.startsWith("thumb-"))
    .map((f) => ({ file: join(media, "pano", f), url: `/media/pano/${f}`, prefix: `pano-${basename(f, ".jpg")}`, widths: PANO_WIDTHS, quality: 50 })),
];

const manifest = {};
let encoded = 0;
for (const job of jobs) {
  const meta = await sharp(job.file).metadata();
  const widths = job.widths.filter((w) => w <= meta.width);
  if (!widths.includes(meta.width) && meta.width < job.widths[job.widths.length - 1]) widths.push(meta.width);
  const mtime = statSync(job.file).mtimeMs;
  for (const w of widths) {
    const target = join(out, `${job.prefix}-${w}.avif`);
    if (!force && existsSync(target) && statSync(target).mtimeMs >= mtime) continue;
    await sharp(job.file).resize({ width: w, withoutEnlargement: true }).avif({ quality: job.quality, effort: 4 }).toFile(target);
    encoded++;
  }
  manifest[job.url] = { w: meta.width, h: meta.height, base: `/media/r/${job.prefix}`, widths: widths.sort((a, b) => a - b) };
}

writeFileSync(join(root, "src", "lib", "media-manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
const bytes = readdirSync(out).reduce((n, f) => n + statSync(join(out, f)).size, 0);
console.log(`images: ${jobs.length} sources, ${encoded} encoded, public/media/r ${(bytes / 1e6).toFixed(1)} MB`);
