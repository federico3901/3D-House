#!/usr/bin/env node
/* End-to-end check of a built site, in a real browser.

   node scripts/e2e.mjs            tests out/ (npm run build), served at the domain root
   node scripts/e2e.mjs portable   tests portable/ (npm run build:portable), served from a sub-path by a server that
                                   does not map folders to index.html, the strictest host it must work on

   Chromium is /opt/pw-browsers/chromium unless CHROMIUM_PATH says otherwise. */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { chromium, expect } from "@playwright/test";

const mode = process.argv[2] === "portable" ? "portable" : "out";
const dir = join(dirname(new URL(import.meta.url).pathname), "..", mode);
const prefix = mode === "portable" ? "/preview/v1/" : "/";
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".avif": "image/avif", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain" };

const missing = [];
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(dir, path.slice(prefix.length)));
  try {
    if (!path.startsWith(prefix)) throw new Error("outside");
    if (mode === "out" && (await stat(file)).isDirectory()) file = join(file, "index.html");
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(await readFile(file));
  } catch {
    missing.push(path);
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}${prefix}`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const errors = [];
const watch = (page) => page.on("pageerror", (e) => errors.push(e.message));
const pageUrl = (p) => (mode === "portable" ? `${base}${p}index.html` : `${base}${p}`);
let failed = 0;
async function step(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}\n    ${String(e.message).split("\n").slice(0, 4).join("\n    ")}`);
  }
}

console.log(`e2e (${mode}) at ${base}`);
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, locale: "it-IT" });
const page = await ctx.newPage();
watch(page);

await step("entry page opens the Italian site", async () => {
  await page.goto(mode === "portable" ? `${base}start.html` : base);
  await expect(page).toHaveURL(/\/it\/(index\.html)?$/);
  await expect(page.locator("h1")).toContainText("Case nuove");
  await expect(page.getByRole("link", { name: /Dal cantiere/ })).toContainText("49%");
});

await step("language switch keeps the page", async () => {
  await page.getByRole("link", { name: "EN", exact: true }).first().click();
  await expect(page).toHaveURL(/\/en\//);
  await expect(page.locator("h1")).toContainText("New homes");
  await page.getByRole("link", { name: "IT", exact: true }).first().click();
  await expect(page).toHaveURL(/\/it\//);
});

await step("live card leads to the project page", async () => {
  await page.getByRole("link", { name: /Dal cantiere/ }).click();
  await expect(page.locator("h1")).toHaveText("Grazioli 57");
  await expect(page.getByText("Fase 2 · piani bassi").first()).toBeVisible();
});

await step("every image on the project page loads", async () => {
  // One image at a time: brought into view (they load lazily), then loaded. Scrolling past them quickly would not
  // test the page, only how fast this machine renders the 360° tour while scrolling.
  const imgs = page.locator("img:visible");
  for (let i = 0, n = await imgs.count(); i < n; i++) {
    const img = imgs.nth(i);
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0), { message: await img.getAttribute("src") }).toBe(true);
  }
});

await step("360° tour loads and a hotspot changes room", async () => {
  await page.locator("#tour").scrollIntoViewIfNeeded();
  const hotspot = page.locator("#tour [data-hotspot]").first();
  await expect(hotspot).toHaveCSS("opacity", "1", { timeout: 15000 });
  await page.locator("#tour").getByRole("button", { name: "Rotazione automatica" }).click();
  await hotspot.click();
  await expect(page.locator("#tour").getByText("Soggiorno B1, intonaci").first()).toBeVisible();
});

await step("apartment filter and 'Chiedi info' pre-fill the form", async () => {
  await page.getByLabel("Solo disponibili").check();
  await expect(page.locator("#appartamenti tbody tr")).toHaveCount(3);
  await page.locator("#appartamenti tbody tr").filter({ hasText: "B1" }).getByRole("button", { name: "Chiedi info" }).click();
  await expect(page.locator("#contact-message")).toHaveValue(/appartamento B1/);
});

await step("nearby services: the map filters by category", async () => {
  await page.goto(pageUrl("it/projects/grazioli-57-fase-2/"));
  const pos = page.locator("#posizione");
  await pos.scrollIntoViewIfNeeded();
  await expect(pos).toContainText("Dergano");
  await pos.getByRole("button", { name: "Scuole" }).click();
  await expect(pos.locator("ol li")).toHaveCount(await pos.locator("[data-marker]").count());
  await expect(pos.locator("ol")).not.toContainText("Dergano");
});

await step("costs: an apartment opens the calculator with its price", async () => {
  await page.locator("#appartamenti tbody tr").filter({ hasText: "B1" }).getByRole("button", { name: /Calcola i costi/ }).click();
  await expect(page.locator("#calc-price-grazioli-57-fase-2")).toHaveValue("468.000");
  const costs = page.locator("#costi");
  await expect(costs).toContainText("IVA 4%");
  await expect(costs).toContainText("18.720 €");
  await costs.getByRole("group", { name: "Prima casa" }).getByRole("button", { name: "No" }).click();
  await expect(costs).toContainText("IVA 10%");
  await expect(costs).toContainText("46.800 €");
});

await step("apartment sheet: plan, rooms, exposure and costs", async () => {
  await page.locator("#appartamenti tbody tr").filter({ hasText: "B1" }).getByRole("link", { name: /Scheda appartamento/ }).click();
  await expect(page.locator("h1")).toHaveText("B1");
  await expect(page.getByRole("img", { name: /Grazioli 57, B1/ })).toBeVisible();
  await expect(page.locator("article")).toContainText("Totale interni");
  await expect(page.locator("article")).toContainText("Sud · Est · Nord");
  await expect(page.locator("article")).toContainText("22.140 €");
});

await step("visit booking: a day, a time and a calendar file", async () => {
  await page.goto(pageUrl("it/projects/grazioli-57-fase-2/"));
  await page.getByRole("button", { name: "Prenota una visita" }).first().click();
  const panel = page.locator("#contact-panel-visit");
  await expect(panel).toBeVisible();
  await panel.getByRole("group", { name: "Giorno" }).getByRole("button").first().click();
  await panel.getByRole("group", { name: "Ora" }).getByRole("button").first().click();
  await page.fill("#visit-name", "Mario Rossi");
  await page.fill("#visit-email", "mario@example.com");
  await page.check("#visit-consent");
  await panel.getByRole("button", { name: "Chiedi l'appuntamento" }).click();
  await expect(panel.getByRole("link", { name: "Aggiungi al calendario" })).toBeVisible();
});

await step("admin changes show on the site", async () => {
  await page.goto(pageUrl("it/admin/"));
  await expect(page.locator("h1")).toHaveText("Area impresa");
  await page.getByLabel("Tramezze e massetti %").fill("100");
  await page.getByRole("tab", { name: "Diario" }).click();
  await page.locator("#diary-title-it").fill("Getto del vano scala");
  await page.getByRole("button", { name: "Pubblica aggiornamento" }).click();
  await expect(page.getByRole("status")).toContainText("Aggiornamento pubblicato");
  await page.getByRole("button", { name: "Brand" }).click();
  await page.getByRole("button", { name: "#1F6FEB" }).click();

  await page.goto(pageUrl("it/projects/grazioli-57-fase-2/"));
  await expect(page.getByText("53%").first()).toBeVisible();
  await expect(page.locator("#diario")).toContainText("Getto del vano scala");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--brand").trim())).toBe("#1F6FEB");
});

await step("reset restores the demo data", async () => {
  await page.goto(pageUrl("it/admin/"));
  await page.getByRole("button", { name: "Ripristina la demo" }).click();
  await page.getByRole("button", { name: "Sì, ripristina" }).click();
  await page.goto(pageUrl("it/"));
  await expect(page.getByRole("link", { name: /Dal cantiere/ })).toContainText("49%");
});

await step("3D view: from the project page to a floor, an apartment and the contact form", async () => {
  await page.goto(pageUrl("it/projects/grazioli-57-fase-2/"));
  await page.getByRole("link", { name: "Edificio 3D" }).first().click();
  await expect(page).toHaveURL(/\/3d\/(index\.html)?$/);
  await expect(page.locator(".b3d canvas")).toBeVisible();
  // Exploded by default: the floor labels stand beside the building.
  await expect.poll(() => page.locator("[data-leader]").evaluateAll((els) => els.filter((e) => e.style.visibility === "visible").length), { timeout: 15000 }).toBe(6);
  await page.locator(".b3d-frow", { hasText: "Primo piano" }).click();
  await expect(page.locator(".b3d-right h2")).toHaveText("Primo piano");
  await expect(page.locator(".b3d-right .b3d-row")).toHaveCount(3);
  await page.locator(".b3d-right .b3d-row", { hasText: "B1" }).click();
  await expect(page.locator(".b3d-right h2")).toHaveText("B1");
  await expect(page.locator(".b3d-right")).toContainText("Soggiorno con cucina");
  await page.locator(".b3d-right").getByRole("link", { name: "Chiedi info" }).click();
  await expect(page.locator("#contact-message")).toHaveValue(/appartamento B1/, { timeout: 15000 });
});

await step("3D view: sun, plan view, assembling and a link to one apartment", async () => {
  await page.goto(pageUrl("it/projects/grazioli-57-fase-1/3d/") + "#C2");
  await expect(page.locator(".b3d-right h2")).toHaveText("C2", { timeout: 15000 });
  await expect(page.locator(".b3d-right")).toContainText("Esposizione");
  await page.getByRole("button", { name: "Sole" }).click();
  await expect(page.getByRole("button", { name: "Sole" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Estate" }).click();
  await expect(page.locator(".b3d-sunrow")).toContainText("21 giugno");
  await expect.poll(() => page.locator("[data-sun]").evaluate((e) => e.style.visibility), { timeout: 15000 }).toBe("visible");
  await page.getByRole("button", { name: "Sole" }).click();
  await page.getByRole("button", { name: "Pianta" }).click();
  await expect(page.getByRole("button", { name: "Pianta" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.locator(".b3d-right h2")).toHaveText("Grazioli 57");
  await page.locator("#b3d-explode").fill("0");
  await expect.poll(() => page.locator("[data-leader]").evaluateAll((els) => els.filter((e) => e.style.visibility === "visible").length), { timeout: 15000 }).toBe(0);
});

await step("phone: menu opens, no sideways scrolling", async () => {
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "it-IT" });
  const p = await phone.newPage();
  watch(p);
  for (const path of ["it/", "it/projects/grazioli-57-fase-2/", "it/projects/grazioli-57-fase-2/units/B1/", "it/admin/", "en/projects/", "it/projects/grazioli-57-fase-2/3d/"]) {
    await p.goto(pageUrl(path));
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) throw new Error(`${path} is ${overflow}px wider than the screen`);
  }
  await p.goto(pageUrl("it/"));
  await p.getByRole("button", { name: "Menu" }).click();
  await expect(p.locator("#mobile-menu")).toBeVisible();
  await phone.close();
});

await step("no page errors and no missing files", async () => {
  if (errors.length) throw new Error(`page errors: ${[...new Set(errors)].join(" | ")}`);
  const real = missing.filter((m) => !m.endsWith(".txt") && !m.includes("_rsc"));
  if (real.length) throw new Error(`missing: ${[...new Set(real)].join(", ")}`);
});

await browser.close();
server.close();
console.log(failed ? `${failed} step(s) failed` : "all steps passed");
process.exit(failed ? 1 : 0);
