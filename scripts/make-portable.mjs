#!/usr/bin/env node
/* Turns the static export (out/, built with PORTABLE=1) into portable/: the same site, but working from any
   sub-path and on hosts that don't map "folder/" to "folder/index.html" (a preview link, a file share, a sandboxed
   page). Run by `npm run build:portable`.

   - URLs in the HTML that start at the domain root ("/_next/…", "/media/…", "/icon.svg") become relative to the page,
     and the build files move to assets/_next/.
   - Links to pages ("/it/projects/") become relative links to their index.html.
   - A script at the top of every page records the site root (window.__CL_ROOT__, read by src/lib/paths.ts) and tells
     the Turbopack runtime where its chunks are (TURBOPACK_CHUNK_BASE_PATH, relative like the <script> tags).
   - start.html opens the site in the visitor's language. Left out: the RSC .txt files (only needed for client-side
     navigation), the 404 pages, the root language gate and the polyfills for browsers without ES modules. */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

const root = join(dirname(new URL(import.meta.url).pathname), "..");
const src = join(root, "out");
const dst = join(root, "portable");
if (!existsSync(src)) throw new Error("out/ is missing: run `PORTABLE=1 next build` first");

rmSync(dst, { recursive: true, force: true });
// Left out: RSC payloads, the 404 pages, and the root language gate (start.html replaces it).
const skip = (p) =>
  p.endsWith(".txt") || p.endsWith(`${sep}404`) || p.endsWith("404.html") || p.includes(`${sep}_not-found`) || p === join(src, "index.html");
cpSync(src, dst, { recursive: true, filter: (p) => !skip(p) });
// Some hosts reserve top-level names starting with "_": the build files move to assets/_next/. Next finds its asset
// prefix by looking for "/_next/" in its own script URL, so that segment stays.
mkdirSync(join(dst, "assets"));
renameSync(join(dst, "_next"), join(dst, "assets", "_next"));

const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const pages = walk(dst).filter((f) => f.endsWith(".html"));

const pageLink = (rel, path) => {
  const [p, hash] = path.split("#");
  const file = p === "" || p.endsWith("/") ? `${p}index.html` : p;
  return rel + file + (hash !== undefined ? `#${hash}` : "");
};

// Files only referenced by <script nomodule>, removed below with their tags.
const legacy = new Set(
  pages.flatMap((f) =>
    [...readFileSync(f, "utf8").matchAll(/<script src="\/_next\/([^"]+)" noModule=""><\/script>/g)].map((m) => join(dst, "assets", "_next", m[1])),
  ),
);

for (const file of pages) {
  const depth = relative(dst, dirname(file)).split(sep).filter(Boolean).length;
  const rel = "../".repeat(depth) || "./";
  let html = readFileSync(file, "utf8");

  // Files: in attributes ("/x) and inside the escaped React payload (\"/x).
  html = html.replace(/(\\?")\/(_next\/|media\/|icon\.svg)/g, (_, q, rest) => `${q}${rel}${rest === "_next/" ? "assets/_next/" : rest}`);
  // Pages: only real attributes; client-side links resolve through src/lib/paths.ts.
  html = html.replace(/(\shref=")\/((?:it|en)\/[^"]*|#[^"]*)?"/g, (_, attr, path = "") => `${attr}${pageLink(rel, path)}"`);

  // The runtime matches loaded chunks by the literal src attribute of their <script>, so its base is the same
  // relative prefix the attributes now carry.
  // The legacy-browser polyfills (<script nomodule>) are dropped: modern browsers never load them.
  html = html.replace(/<script src="[^"]*" noModule=""><\/script>/g, "");

  const boot = `<script>(function(){var r=${JSON.stringify(rel)};window.__CL_ROOT__=new URL(r,location.href).pathname;window.TURBOPACK_CHUNK_BASE_PATH=r+"assets/_next/";})();</script>`;
  html = html.replace(/<head>/, `<head>${boot}`);
  writeFileSync(file, html);
}

for (const f of legacy) rmSync(f, { force: true });

// Entry page: written without <html>/<head>/<body>, so a host that wraps pages in its own skeleton can use it as is.
writeFileSync(
  join(dst, "start.html"),
  `<title>Cantiere Live</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
  :root { --bg: #e8ebe7; --ink: #121514; --mute: #5f6864; --brand: #f2b200; color-scheme: light; }
  body { background: var(--bg); color: var(--ink); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { min-height: 100%; display: grid; place-items: center; gap: 12px; text-align: center; padding-block: 48px;
    padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
  .mark { width: 48px; height: 48px; border-radius: 6px; background: var(--brand); display: grid; place-items: center; font-weight: 900; }
  a { color: var(--ink); font-weight: 600; }
  p { margin: 0; color: var(--mute); }
</style>
<main>
  <div class="mark">DC</div>
  <p>Apertura del sito… / Opening the site…</p>
  <p><a href="it/index.html">Italiano</a> · <a href="en/index.html">English</a></p>
</main>
<script>
  (function () {
    var l = (navigator.languages && navigator.languages[0]) || navigator.language || "it";
    location.replace(/^en\\b/i.test(l) ? "en/index.html" : "it/index.html");
  })();
</script>
`,
);

const files = walk(dst);
const bytes = files.reduce((n, f) => n + statSync(f).size, 0);
console.log(`portable/: ${pages.length} pages, ${files.length} files, ${(bytes / 1e6).toFixed(1)} MB`);
