/* Links and media URLs. A normal build serves the site from the root of its domain, so these return the path as is.
   A portable build (PORTABLE=1) can be opened from any sub-path: scripts/make-portable.mjs rewrites the static HTML,
   and on the client these resolve against window.__CL_ROOT__, the site root found by a script at the top of
   every page. */

const portable = !!process.env.NEXT_PUBLIC_PORTABLE;

function root(): string | null {
  if (!portable || typeof window === "undefined") return null;
  return (window as unknown as { __CL_ROOT__?: string }).__CL_ROOT__ ?? null;
}

/** A file in public/, e.g. "/media/x.jpg". */
export function asset(path: string): string {
  const r = root();
  return r && path.startsWith("/") ? r + path.slice(1) : path;
}

/** A page of the site, e.g. "/it/projects/" or "/it/#contatti". */
export function pageHref(path: string): string {
  const r = root();
  if (!r || !path.startsWith("/")) return path;
  const [p, hash] = path.split("#");
  const file = p.endsWith("/") ? `${p}index.html` : p;
  return r + file.slice(1) + (hash !== undefined ? `#${hash}` : "");
}

export const isPortable = portable;
