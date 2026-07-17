import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  OUTPUT_NAME,
  refineReferenceGuide,
  SOURCE_NAME,
  SOURCE_SHA256,
} from "./refine-reference-guide.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(SCRIPT_DIR, "..");
const sourcePath = path.join(PROJECT_DIR, SOURCE_NAME);
const outputPath = path.join(PROJECT_DIR, OUTPUT_NAME);

function sha256(content) {
  return createHash("sha256").update(content).digest("hex").toUpperCase();
}

const source = await readFile(sourcePath, "utf8");
const output = await readFile(outputPath, "utf8");
const expected = refineReferenceGuide(source);

assert.equal(sha256(source), SOURCE_SHA256, "the approved reference guide must remain byte-identical");
assert.deepEqual(output, expected, "the derived guide must match deterministic output");
assert.equal((output.match(/id="juzi-reference-refinement"/g) || []).length, 1);
assert.equal((output.match(/data:image\//g) || []).length, 8, "embedded images must be preserved");

for (const marker of [
  'class="ticket-stub"',
  'class="action-grid"',
  'class="day-compass"',
  'id="map"',
  'class="route-map-stage"',
  'id="live"',
  'data-budget-mode',
]) {
  assert.ok(output.includes(marker), `missing original feature marker: ${marker}`);
}

for (const rule of [
  "@media (max-width: 640px)",
  "@media (max-width: 480px)",
  "min-height: 44px",
  ".motion-paused .route-map-node",
  ".route-map-node",
  'card.dataset.state = "error"',
  'label.textContent = "暂不可用"',
  ".hero h1",
  "font-size: 56px",
]) {
  assert.ok(output.includes(rule), `missing refinement rule: ${rule}`);
}

console.log(`OK ${OUTPUT_NAME} ${sha256(output)}`);
