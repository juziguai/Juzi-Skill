import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  buildAppleReferenceGuide,
  OUTPUT_NAME,
  SOURCE_NAME,
  SOURCE_SHA256,
} from "./build-apple-reference-guide.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(SCRIPT_DIR, "..");
const sourcePath = path.join(PROJECT_DIR, SOURCE_NAME);
const outputPath = path.join(PROJECT_DIR, OUTPUT_NAME);

function sha256(content) {
  return createHash("sha256").update(content).digest("hex").toUpperCase();
}

const source = await readFile(sourcePath, "utf8");
const output = await readFile(outputPath, "utf8");
const expected = buildAppleReferenceGuide(source);

assert.equal(sha256(source), SOURCE_SHA256, "the approved reference guide must remain byte-identical");
assert.deepEqual(output, expected, "the derived guide must match deterministic output");
assert.equal((output.match(/id="juzi-apple-control-layer"/g) || []).length, 1);
assert.equal((output.match(/id="juzi-apple-interactions"/g) || []).length, 1);
assert.equal((output.match(/data:image\/webp/g) || []).length, 8, "all original embedded raster assets must be preserved");

for (const marker of [
  'class="ticket-stub"',
  'class="action-grid"',
  'class="day-compass"',
  'id="map"',
  'class="route-map-stage"',
  'id="live"',
  "apple-journey-pass",
  "apple-next-stop",
  "apple-tabbar",
  "apple-more-sheet",
  "apple-weather-summary",
  "apple-map-toolbar",
]) {
  assert.ok(output.includes(marker), `missing original or Apple-inspired feature marker: ${marker}`);
}

for (const behavior of [
  "selectDay(hashDay ||",
  "syncPasses()",
  "updateNextStop()",
  "updateWeatherSummary(activeDay)",
  "data-apple-map-view",
  "data-apple-weather-details",
  "data-apple-opaque",
  "data-apple-motion",
]) {
  assert.ok(output.includes(behavior), `missing Apple-inspired interaction: ${behavior}`);
}

for (const rule of [
  "@media (max-width: 760px)",
  "@media (max-width: 480px)",
  "@media (max-width: 360px)",
  "@media (prefers-reduced-motion: reduce)",
  "@media (forced-colors: active)",
  "@supports not ((backdrop-filter",
  "min-height: 44px",
  ".opaque-controls",
  "letter-spacing: 0",
]) {
  assert.ok(output.includes(rule), `missing responsive or accessibility rule: ${rule}`);
}

for (const forbidden of [
  "Apple Logo",
  "SF Symbols",
  "font-family: SF Pro",
  "apple.com/assets",
]) {
  assert.ok(!output.includes(forbidden), `forbidden Apple asset marker found: ${forbidden}`);
}

console.log(`OK ${OUTPUT_NAME} ${sha256(output)}`);
