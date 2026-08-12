import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("renders the production planner and secure pairing workflow", async () => {
  const [html, page, css] = await Promise.all([
    readFile(new URL("out/index.html", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
  assert.match(html, /Vaahan Safe Data Collector/i);
  assert.match(html, /Start minimized background collection/i);
  assert.match(html, /Built by[^<]*<strong>Yash Jitendra Bhakat<\/strong>/i);
  assert.match(html, /educational, research and analytical purposes/i);
  assert.match(html, /vaahan-safe-companion\.zip/i);
  assert.match(html, /https:\/\/yashbhakat\.github\.io\/vaahan-safe-collector\/og\.png/i);
  assert.doesNotMatch(html, /vaahan-safe-collector\/vaahan-safe-collector\/og\.png/i);
  assert.match(page, /X-Collector-Pairing-Code/);
  assert.match(page, /PAIR SECURELY/);
  assert.match(page, /normalizePairingCode/);
  assert.match(page, /URLSearchParams\(window\.location\.hash/);
  assert.match(page, /window\.history\.replaceState/);
  assert.match(page, /AUTOMATIC DATA DOWNLOAD/);
  assert.match(css, /\.pairingEntry/);
  assert.match(css, /\.downloadPreference/);
});

test("ships the downloadable companion with a matching checksum", async () => {
  const archive = await readFile(new URL("out/vaahan-safe-companion.zip", root));
  const checksum = await readFile(new URL("out/vaahan-safe-companion.zip.sha256", root), "utf8");
  assert.ok(archive.length > 100_000, "companion archive is unexpectedly small");
  const actual = createHash("sha256").update(archive).digest("hex").toUpperCase();
  assert.equal(checksum.trim().split(/\s+/)[0].toUpperCase(), actual);
});
