import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { buildGuide } from "./build-guide.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const templatePlanPath = path.join(skillRoot, "assets", "plan.template.json");
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "juzi-travel-guide-"));

try {
  const plan = JSON.parse(await readFile(templatePlanPath, "utf8"));
  const imagePath = path.join(temporaryDirectory, "tiny.png");
  const inputPath = path.join(temporaryDirectory, "plan.json");
  const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  plan.foods[0].image = "tiny.png";
  await writeFile(imagePath, tinyPng);
  await writeFile(inputPath, JSON.stringify(plan, null, 2), "utf8");

  const firstPath = path.join(temporaryDirectory, "first.html");
  const secondPath = path.join(temporaryDirectory, "second.html");
  const validation = await buildGuide({ inputPath, validateOnly: true });
  const first = await buildGuide({ inputPath, outputPath: firstPath });
  const second = await buildGuide({ inputPath, outputPath: secondPath });
  const html = await readFile(firstPath, "utf8");

  assert.equal(validation.report.valid, true);
  assert.equal(validation.report.wroteOutput, false);
  assert.equal(first.report.sha256, second.report.sha256);
  assert.equal(first.html, second.html);
  assert.equal(first.report.localImages, 1);
  assert.equal(first.report.remoteImages, 0);
  assert.match(html, /深圳出发｜厦门 3 天 2 夜周末攻略（示例）/);
  assert.match(html, /id="transport"/);
  assert.match(html, /id="days"/);
  assert.match(html, /id="trip-dashboard"/);
  assert.match(html, /id="checklist-progress"[^>]*role="progressbar"/);
  assert.match(html, /href="#day-1"/);
  assert.match(html, /id="day-1"/);
  assert.match(html, /id="eat"/);
  assert.match(html, /id="weather-refresh"/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /\.mini-link,.text-link\{[^}]*min-height:44px/);
  assert.match(html, /input:focus-visible\+\.check-box/);
  assert.match(html, /Array\.isArray\(storedIds\)/);
  assert.match(html, /--paper:#f4efdf/);
  assert.match(html, /background:#fffaf0/);
  assert.match(html, /START HERE/);
  assert.match(html, /<div class="quick-grid">[\s\S]*?<div class="checklist-grid">[\s\S]*?<div class="trip-dashboard"/);
  assert.match(html, /data:image\/png;base64,/);
  assert.doesNotMatch(html, /__[A-Z0-9_]+__/);
  assert.doesNotMatch(html, /letter-spacing:-/);
  assert.doesNotMatch(html, /font-size:clamp\(/);
  assert.doesNotMatch(html, /<link\s+[^>]*rel="stylesheet"/i);
  assert.doesNotMatch(html, /<script\s+[^>]*src=/i);

  const interaction = html.match(/<script id="guide-interactions">([\s\S]*?)<\/script>/i);
  assert.ok(interaction, "缺少交互脚本");
  new vm.Script(interaction[1], { filename: "guide-interactions.js" });

  const dataMatch = html.match(/<script type="application\/json" id="guide-data">([\s\S]*?)<\/script>/i);
  assert.ok(dataMatch, "缺少客户端数据");
  const clientData = JSON.parse(dataMatch[1]);
  assert.equal(clientData.meta.slug, "shenzhen-xiamen-weekend-sample");
  assert.equal(clientData.meta.timezone, "Asia/Shanghai");
  assert.equal(clientData.days.length, 3);
  assert.equal(clientData.days[0].stops.length, 3);
  assert.equal(clientData.budget.modes.length, 2);
  assert.equal(clientData.weather.days.length, 3);

  const missingDayPlan = structuredClone(plan);
  missingDayPlan.days.pop();
  const missingDayPath = path.join(temporaryDirectory, "missing-day.json");
  await writeFile(missingDayPath, JSON.stringify(missingDayPlan), "utf8");
  await assert.rejects(
    buildGuide({ inputPath: missingDayPath, validateOnly: true }),
    /days 必须覆盖/,
  );

  const unorderedStopsPlan = structuredClone(plan);
  unorderedStopsPlan.days[0].stops[1].time = "09:30";
  const unorderedStopsPath = path.join(temporaryDirectory, "unordered-stops.json");
  await writeFile(unorderedStopsPath, JSON.stringify(unorderedStopsPlan), "utf8");
  await assert.rejects(
    buildGuide({ inputPath: unorderedStopsPath, validateOnly: true }),
    /stops 必须按时间从早到晚排列/,
  );

  const mismatchedWeatherPlan = structuredClone(plan);
  mismatchedWeatherPlan.weather.days[1].date = plan.weather.days[0].date;
  const mismatchedWeatherPath = path.join(temporaryDirectory, "mismatched-weather.json");
  await writeFile(mismatchedWeatherPath, JSON.stringify(mismatchedWeatherPlan), "utf8");
  await assert.rejects(
    buildGuide({ inputPath: mismatchedWeatherPath, validateOnly: true }),
    /weather\.days\[1\]\.date 必须是/,
  );

  const invalidDatePlan = structuredClone(plan);
  invalidDatePlan.meta.startDate = "2026-02-30";
  const invalidDatePath = path.join(temporaryDirectory, "invalid-date.json");
  await writeFile(invalidDatePath, JSON.stringify(invalidDatePlan), "utf8");
  await assert.rejects(
    buildGuide({ inputPath: invalidDatePath, validateOnly: true }),
    /必须使用有效的 YYYY-MM-DD 日期/,
  );

  const invalidTimezonePlan = structuredClone(plan);
  invalidTimezonePlan.meta.timezone = "Mars/Olympus_Mons";
  const invalidTimezonePath = path.join(temporaryDirectory, "invalid-timezone.json");
  await writeFile(invalidTimezonePath, JSON.stringify(invalidTimezonePlan), "utf8");
  await assert.rejects(
    buildGuide({ inputPath: invalidTimezonePath, validateOnly: true }),
    /必须是有效的 IANA 时区/,
  );

  const overBudgetPlan = structuredClone(plan);
  overBudgetPlan.meta.assetBudget.maxImageKiB = 0.01;
  const overBudgetPath = path.join(temporaryDirectory, "over-budget.json");
  await writeFile(overBudgetPath, JSON.stringify(overBudgetPlan), "utf8");
  await assert.rejects(
    buildGuide({ inputPath: overBudgetPath, validateOnly: true }),
    /超过 .* KiB/,
  );

  console.log(JSON.stringify({
    valid: true,
    deterministic: true,
    interactionSyntax: "ok",
    chronologyRejection: "ok",
    weatherAlignmentRejection: "ok",
    invalidDateRejection: "ok",
    invalidTimezoneRejection: "ok",
    budgetRejection: "ok",
    outputKiB: first.report.outputKiB,
    sha256: first.report.sha256,
  }, null, 2));
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
