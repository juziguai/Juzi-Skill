import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const templatePath = path.join(skillRoot, "assets", "travel-guide-template.html");

const defaultBudget = {
  maxImageKiB: 350,
  maxTotalImagesKiB: 3000,
  maxOutputKiB: 4500,
};

const hardBudget = {
  maxImageKiB: 512,
  maxTotalImagesKiB: 4096,
  maxOutputKiB: 6144,
};

const themeDefaults = {
  ink: "#123331",
  paper: "#f4efdf",
  coral: "#f26d50",
  teal: "#11877d",
  yellow: "#f5c64d",
};

function parseArgs(argv) {
  const args = { validateOnly: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--input") args.inputPath = argv[++index];
    else if (token === "--output") args.outputPath = argv[++index];
    else if (token === "--validate-only") args.validateOnly = true;
    else if (token === "--help" || token === "-h") args.help = true;
    else throw new Error(`未知参数：${token}`);
  }
  return args;
}

function usage() {
  return [
    "用法：",
    "  node build-guide.mjs --input <plan.json> --output <guide.html>",
    "  node build-guide.mjs --input <plan.json> --validate-only",
  ].join("\n");
}

function fail(message) {
  throw new Error(message);
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} 必须是对象。`);
  }
  return value;
}

function requireArray(value, label, minimum = 0) {
  if (!Array.isArray(value) || value.length < minimum) {
    fail(`${label} 必须是至少包含 ${minimum} 项的数组。`);
  }
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${label} 必须是非空字符串。`);
  }
  return value.trim();
}

function optionalString(value, label) {
  if (value == null || value === "") return "";
  if (typeof value !== "string") fail(`${label} 必须是字符串。`);
  return value.trim();
}

function validateIsoDate(value, label) {
  const text = requireString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    fail(`${label} 必须使用有效的 YYYY-MM-DD 日期。`);
  }
  return text;
}

function validateUrl(value, label, { optional = false } = {}) {
  if ((value == null || value === "") && optional) return "";
  const text = requireString(value, label);
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    fail(`${label} 不是有效 URL：${text}`);
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    fail(`${label} 只允许 http/https URL：${text}`);
  }
  return text;
}

function validatePlan(plan) {
  requireObject(plan, "行程根节点");
  const meta = requireObject(plan.meta, "meta");
  requireString(meta.title, "meta.title");
  requireString(meta.description, "meta.description");
  requireString(meta.origin, "meta.origin");
  requireString(meta.destination, "meta.destination");
  const startDate = validateIsoDate(meta.startDate, "meta.startDate");
  const endDate = validateIsoDate(meta.endDate, "meta.endDate");
  if (startDate > endDate) fail("meta.startDate 不得晚于 meta.endDate。");
  requireString(meta.timezone, "meta.timezone");
  requireString(meta.travelers, "meta.travelers");
  requireString(meta.transportMode, "meta.transportMode");
  requireString(meta.verifiedAt, "meta.verifiedAt");
  requireString(meta.slug, "meta.slug");
  if (!/^[a-z0-9-]+$/.test(meta.slug)) fail("meta.slug 只允许小写字母、数字和连字符。");
  if (typeof meta.sampleOnly !== "boolean") fail("meta.sampleOnly 必须是布尔值。");
  if (typeof meta.offline !== "boolean") fail("meta.offline 必须是布尔值。");

  const hero = requireObject(plan.hero, "hero");
  requireString(hero.eyebrow, "hero.eyebrow");
  requireString(hero.headline, "hero.headline");
  requireString(hero.summary, "hero.summary");
  optionalString(hero.coverImage, "hero.coverImage");
  optionalString(hero.coverImageAlt, "hero.coverImageAlt");
  requireArray(hero.stats, "hero.stats", 1).forEach((item, index) => {
    requireString(item.label, `hero.stats[${index}].label`);
    requireString(item.value, `hero.stats[${index}].value`);
  });

  requireArray(plan.quickFacts, "quickFacts", 1).forEach((item, index) => {
    requireString(item.label, `quickFacts[${index}].label`);
    requireString(item.value, `quickFacts[${index}].value`);
    optionalString(item.note, `quickFacts[${index}].note`);
  });

  const checklistIds = new Set();
  requireArray(plan.checklist, "checklist", 1).forEach((item, index) => {
    const id = requireString(item.id, `checklist[${index}].id`);
    if (checklistIds.has(id)) fail(`checklist id 重复：${id}`);
    checklistIds.add(id);
    requireString(item.label, `checklist[${index}].label`);
    optionalString(item.note, `checklist[${index}].note`);
    validateUrl(item.url, `checklist[${index}].url`, { optional: true });
  });

  const transport = requireObject(plan.transport, "transport");
  for (const direction of ["outbound", "return"]) {
    requireArray(transport[direction], `transport.${direction}`, 1).forEach((item, index) => {
      for (const field of ["service", "from", "to", "depart", "arrive", "duration", "class", "price", "status"]) {
        requireString(item[field], `transport.${direction}[${index}].${field}`);
      }
      validateUrl(item.bookingUrl, `transport.${direction}[${index}].bookingUrl`);
    });
  }
  requireArray(transport.notes, "transport.notes");

  requireArray(plan.days, "days", 1).forEach((day, dayIndex) => {
    if (!Number.isInteger(day.day) || day.day < 1) fail(`days[${dayIndex}].day 必须是正整数。`);
    const date = validateIsoDate(day.date, `days[${dayIndex}].date`);
    if (date < startDate || date > endDate) fail(`days[${dayIndex}].date 超出旅行日期范围。`);
    requireString(day.weekday, `days[${dayIndex}].weekday`);
    requireString(day.title, `days[${dayIndex}].title`);
    requireString(day.theme, `days[${dayIndex}].theme`);
    requireArray(day.stops, `days[${dayIndex}].stops`, 1).forEach((stop, stopIndex) => {
      for (const field of ["time", "name", "type", "description"]) {
        requireString(stop[field], `days[${dayIndex}].stops[${stopIndex}].${field}`);
      }
      for (const field of ["duration", "address", "ticket", "image", "imageAlt"]) {
        optionalString(stop[field], `days[${dayIndex}].stops[${stopIndex}].${field}`);
      }
      requireArray(stop.tips ?? [], `days[${dayIndex}].stops[${stopIndex}].tips`);
      validateUrl(stop.mapUrl, `days[${dayIndex}].stops[${stopIndex}].mapUrl`, { optional: true });
    });
  });

  if (plan.ferry != null) {
    requireObject(plan.ferry, "ferry");
    requireString(plan.ferry.title, "ferry.title");
    requireString(plan.ferry.summary, "ferry.summary");
    requireArray(plan.ferry.routes, "ferry.routes", 1).forEach((item, index) => {
      requireString(item.label, `ferry.routes[${index}].label`);
      requireString(item.value, `ferry.routes[${index}].value`);
      optionalString(item.note, `ferry.routes[${index}].note`);
    });
    validateUrl(plan.ferry.bookingUrl, "ferry.bookingUrl");
    requireArray(plan.ferry.notes, "ferry.notes");
  }

  requireArray(plan.hotels, "hotels", 1).forEach((item, index) => {
    for (const field of ["tier", "name", "area", "price", "reason"]) {
      requireString(item[field], `hotels[${index}].${field}`);
    }
    validateUrl(item.bookingUrl, `hotels[${index}].bookingUrl`);
    optionalString(item.image, `hotels[${index}].image`);
    optionalString(item.imageAlt, `hotels[${index}].imageAlt`);
  });

  requireArray(plan.foods, "foods", 1).forEach((item, index) => {
    for (const field of ["mark", "name", "address", "order", "tip", "imageAlt"]) {
      requireString(item[field], `foods[${index}].${field}`);
    }
    optionalString(item.image, `foods[${index}].image`);
    validateUrl(item.sourceUrl, `foods[${index}].sourceUrl`);
  });

  const budget = requireObject(plan.budget, "budget");
  requireString(budget.summary, "budget.summary");
  const budgetIds = new Set();
  requireArray(budget.modes, "budget.modes", 1).forEach((mode, modeIndex) => {
    const id = requireString(mode.id, `budget.modes[${modeIndex}].id`);
    if (budgetIds.has(id)) fail(`budget mode id 重复：${id}`);
    budgetIds.add(id);
    requireString(mode.label, `budget.modes[${modeIndex}].label`);
    requireString(mode.total, `budget.modes[${modeIndex}].total`);
    optionalString(mode.note, `budget.modes[${modeIndex}].note`);
    requireArray(mode.items, `budget.modes[${modeIndex}].items`, 1).forEach((item, itemIndex) => {
      requireString(item.label, `budget.modes[${modeIndex}].items[${itemIndex}].label`);
      requireString(item.amount, `budget.modes[${modeIndex}].items[${itemIndex}].amount`);
      if (!Number.isFinite(item.weight) || item.weight < 0 || item.weight > 100) {
        fail(`budget.modes[${modeIndex}].items[${itemIndex}].weight 必须在 0–100。`);
      }
    });
  });

  const weather = requireObject(plan.weather, "weather");
  if (!Number.isFinite(weather.latitude) || !Number.isFinite(weather.longitude)) {
    fail("weather.latitude / weather.longitude 必须是数字。");
  }
  if (typeof weather.live !== "boolean") fail("weather.live 必须是布尔值。");
  validateUrl(weather.sourceUrl, "weather.sourceUrl");
  requireArray(weather.days, "weather.days", 1).forEach((item, index) => {
    validateIsoDate(item.date, `weather.days[${index}].date`);
    requireString(item.label, `weather.days[${index}].label`);
    requireString(item.summary, `weather.days[${index}].summary`);
    for (const field of ["high", "low", "rainProbability"]) {
      if (!Number.isFinite(item[field])) fail(`weather.days[${index}].${field} 必须是数字。`);
    }
  });

  requireArray(plan.packing, "packing", 1).forEach((group, index) => {
    requireString(group.category, `packing[${index}].category`);
    requireArray(group.items, `packing[${index}].items`, 1).forEach((item, itemIndex) =>
      requireString(item, `packing[${index}].items[${itemIndex}]`),
    );
  });

  requireArray(plan.sources, "sources", 1).forEach((source, index) => {
    requireString(source.label, `sources[${index}].label`);
    validateUrl(source.url, `sources[${index}].url`);
    requireString(source.note, `sources[${index}].note`);
    requireString(source.verifiedAt, `sources[${index}].verifiedAt`);
  });
  requireArray(plan.disclaimers, "disclaimers", 1).forEach((item, index) =>
    requireString(item, `disclaimers[${index}]`),
  );
}

function resolveBudget(meta) {
  const requested = { ...defaultBudget, ...(meta.assetBudget ?? {}) };
  for (const key of Object.keys(defaultBudget)) {
    const value = requested[key];
    if (!Number.isFinite(value) || value <= 0) fail(`meta.assetBudget.${key} 必须是正数。`);
    if (value > hardBudget[key]) {
      fail(`meta.assetBudget.${key}=${value} 超过硬上限 ${hardBudget[key]} KiB。`);
    }
  }
  return requested;
}

function webpDimensions(buffer, filename) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    fail(`${filename} 不是有效 WebP。`);
  }
  const chunkType = buffer.toString("ascii", 12, 16);
  if (chunkType === "VP8X") {
    const width = buffer[24] | (buffer[25] << 8) | (buffer[26] << 16);
    const height = buffer[27] | (buffer[28] << 8) | (buffer[29] << 16);
    return { width: width + 1, height: height + 1 };
  }
  if (chunkType === "VP8 ") {
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) fail(`${filename} 的 VP8 帧头无效。`);
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }
  if (chunkType === "VP8L") {
    if (buffer[20] !== 0x2f) fail(`${filename} 的 VP8L 帧头无效。`);
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  fail(`${filename} 使用未支持的 WebP 块类型 ${chunkType}。`);
}

function pngDimensions(buffer, filename) {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) fail(`${filename} 不是有效 PNG。`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegDimensions(buffer, filename) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) fail(`${filename} 不是有效 JPEG。`);
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    if (length < 2) break;
    offset += 2 + length;
  }
  fail(`${filename} 无法读取 JPEG 尺寸。`);
}

function inspectImage(buffer, filename) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".webp") return { mime: "image/webp", ...webpDimensions(buffer, filename) };
  if (extension === ".png") return { mime: "image/png", ...pngDimensions(buffer, filename) };
  if (extension === ".jpg" || extension === ".jpeg") return { mime: "image/jpeg", ...jpegDimensions(buffer, filename) };
  fail(`${filename} 只允许 WebP、PNG 或 JPEG。`);
}

function imageSlots(plan) {
  const slots = [];
  slots.push({ owner: plan.hero, key: "coverImage", label: "hero.coverImage" });
  plan.days.forEach((day, dayIndex) => day.stops.forEach((stop, stopIndex) => {
    slots.push({ owner: stop, key: "image", label: `days[${dayIndex}].stops[${stopIndex}].image` });
  }));
  plan.hotels.forEach((hotel, index) => slots.push({ owner: hotel, key: "image", label: `hotels[${index}].image` }));
  plan.foods.forEach((food, index) => slots.push({ owner: food, key: "image", label: `foods[${index}].image` }));
  return slots;
}

async function embedImages(plan, planDirectory, budget) {
  const cache = new Map();
  const uniqueAssets = [];
  let remoteImages = 0;

  for (const slot of imageSlots(plan)) {
    const reference = slot.owner[slot.key];
    if (!reference) continue;
    if (reference.startsWith("data:")) {
      const match = reference.match(/^data:(image\/(?:webp|png|jpeg));base64,(.+)$/);
      if (!match) fail(`${slot.label} 的 Data URI 格式不受支持。`);
      const bytes = Buffer.from(match[2], "base64").length;
      if (bytes > budget.maxImageKiB * 1024) fail(`${slot.label} 超过单图预算。`);
      uniqueAssets.push({ key: `${slot.label}:data`, bytes, width: null, height: null, mime: match[1] });
      continue;
    }
    if (/^https?:\/\//i.test(reference)) {
      if (plan.meta.offline) fail(`${slot.label} 在离线模式下不得使用远程图片：${reference}`);
      validateUrl(reference, slot.label);
      remoteImages += 1;
      continue;
    }

    const absolutePath = path.resolve(planDirectory, reference);
    let asset = cache.get(absolutePath);
    if (!asset) {
      const buffer = await readFile(absolutePath).catch(() => fail(`${slot.label} 找不到图片：${absolutePath}`));
      const info = inspectImage(buffer, absolutePath);
      if (buffer.length > budget.maxImageKiB * 1024) {
        fail(`${slot.label} 为 ${(buffer.length / 1024).toFixed(1)} KiB，超过 ${budget.maxImageKiB} KiB。`);
      }
      if (info.width > 1600 || info.height > 1200) {
        fail(`${slot.label} 为 ${info.width}×${info.height}，超过 1600×1200。`);
      }
      asset = {
        key: absolutePath,
        bytes: buffer.length,
        width: info.width,
        height: info.height,
        mime: info.mime,
        dataUri: `data:${info.mime};base64,${buffer.toString("base64")}`,
      };
      cache.set(absolutePath, asset);
      uniqueAssets.push(asset);
    }
    slot.owner[slot.key] = asset.dataUri;
  }

  const totalBytes = uniqueAssets.reduce((sum, item) => sum + item.bytes, 0);
  if (totalBytes > budget.maxTotalImagesKiB * 1024) {
    fail(`图片总量 ${(totalBytes / 1024).toFixed(1)} KiB 超过 ${budget.maxTotalImagesKiB} KiB。`);
  }
  return { uniqueAssets, totalBytes, remoteImages };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderLink(url, label, className = "text-link") {
  if (!url) return "";
  return `<a class="${escapeHtml(className)}" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)} <span aria-hidden="true">↗</span></a>`;
}

function renderImage(source, alt, className) {
  if (!source) {
    return `<div class="${escapeHtml(className)} image-placeholder" role="img" aria-label="${escapeHtml(alt || "旅行图片占位")}"><span>TRAVEL NOTE</span></div>`;
  }
  return `<div class="${escapeHtml(className)}"><img src="${escapeHtml(source)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"></div>`;
}

function renderList(items, className = "note-list") {
  if (!items?.length) return "";
  return `<ul class="${className}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderSectionHeading(kicker, title, copy = "", inverse = false) {
  return `<div class="section-heading${inverse ? " inverse" : ""}"><div><p class="kicker">${escapeHtml(kicker)}</p><h2>${escapeHtml(title)}</h2></div>${copy ? `<p>${escapeHtml(copy)}</p>` : ""}</div>`;
}

function renderHero(plan) {
  const stats = plan.hero.stats.map((item) => `<div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join("");
  const cover = plan.hero.coverImage
    ? `<img class="hero-cover" src="${escapeHtml(plan.hero.coverImage)}" alt="${escapeHtml(plan.hero.coverImageAlt)}">`
    : "";
  return `<header class="hero" id="top">
    ${cover}
    <div class="hero-atmosphere" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="shell hero-inner">
      <div class="hero-copy">
        <p class="eyebrow">${escapeHtml(plan.hero.eyebrow)}</p>
        <h1>${escapeHtml(plan.hero.headline)}</h1>
        <p class="hero-summary">${escapeHtml(plan.hero.summary)}</p>
        <div class="hero-dates"><span>${escapeHtml(plan.meta.startDate)}</span><i aria-hidden="true">→</i><span>${escapeHtml(plan.meta.endDate)}</span></div>
      </div>
      <div class="hero-stats">${stats}</div>
    </div>
  </header>`;
}

function renderQuick(plan) {
  const facts = plan.quickFacts.map((item) => `<article><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong><small>${escapeHtml(item.note)}</small></article>`).join("");
  const checklist = plan.checklist.map((item) => `<label class="check-card"><input type="checkbox" data-check-id="${escapeHtml(item.id)}"><span class="check-box" aria-hidden="true"></span><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.note)}</small>${item.url ? renderLink(item.url, "官方入口", "mini-link") : ""}</span></label>`).join("");
  return `<section class="section" id="plan"><div class="shell">
    ${renderSectionHeading("START HERE", "先把关键项锁住", "完成后会保存在当前设备，不上传任何身份或订单信息。")}
    <div class="quick-grid">${facts}</div>
    <div class="checklist-grid">${checklist}</div>
  </div></section>`;
}

function renderTransportCard(item, label) {
  return `<article class="ticket-card">
    <div class="ticket-label"><span>${escapeHtml(label)}</span><small>${escapeHtml(item.status)}</small></div>
    <strong class="service-number">${escapeHtml(item.service)}</strong>
    <div class="ticket-route"><div><b>${escapeHtml(item.depart)}</b><span>${escapeHtml(item.from)}</span></div><i aria-hidden="true"></i><div><b>${escapeHtml(item.arrive)}</b><span>${escapeHtml(item.to)}</span></div></div>
    <div class="ticket-meta"><span>${escapeHtml(item.duration)}</span><span>${escapeHtml(item.class)}</span><strong>${escapeHtml(item.price)}</strong></div>
    ${renderLink(item.bookingUrl, "前往官方查询", "button-link")}
  </article>`;
}

function renderTransport(plan) {
  return `<section class="section transport-section" id="transport"><div class="shell">
    ${renderSectionHeading("TRANSPORT", "往返交通先定锚", "状态是核实时快照，最终以官方下单页为准。")}
    <div class="ticket-grid">${plan.transport.outbound.map((item) => renderTransportCard(item, "去程")).join("")}${plan.transport.return.map((item) => renderTransportCard(item, "返程")).join("")}</div>
    ${renderList(plan.transport.notes, "transport-notes")}
  </div></section>`;
}

function renderStop(stop, index) {
  const visual = stop.image ? renderImage(stop.image, stop.imageAlt, "stop-media") : "";
  return `<li class="stop-card">
    <div class="stop-index">${String(index + 1).padStart(2, "0")}</div>
    <div class="stop-content">
      ${visual}
      <div class="stop-top"><span>${escapeHtml(stop.time)}</span><em>${escapeHtml(stop.type)}</em>${stop.duration ? `<small>${escapeHtml(stop.duration)}</small>` : ""}</div>
      <h3>${escapeHtml(stop.name)}</h3>
      <p>${escapeHtml(stop.description)}</p>
      <div class="stop-meta">${stop.address ? `<span>地点 · ${escapeHtml(stop.address)}</span>` : ""}${stop.ticket ? `<span>费用 · ${escapeHtml(stop.ticket)}</span>` : ""}</div>
      ${renderList(stop.tips, "tip-list")}
      ${stop.mapUrl ? renderLink(stop.mapUrl, "打开地图", "mini-link") : ""}
    </div>
  </li>`;
}

function renderDays(plan) {
  const days = plan.days.map((day) => `<article class="day-card" data-day="${day.day}">
    <header><div><span>DAY ${day.day} · ${escapeHtml(day.weekday)}</span><strong>${escapeHtml(day.date)}</strong></div><h3>${escapeHtml(day.title)}</h3><p>${escapeHtml(day.theme)}</p></header>
    <div class="route-strip" aria-label="当天路线">${day.stops.map((stop) => `<span>${escapeHtml(stop.name)}</span>`).join('<i aria-hidden="true">→</i>')}</div>
    <ol class="timeline">${day.stops.map(renderStop).join("")}</ol>
  </article>`).join("");
  return `<section class="section days-section" id="days"><div class="shell">
    ${renderSectionHeading("DAILY ROUTE", "每天只抓一条主线", "按时间推进，给换乘、天气和临时休息留出余量。", true)}
    <div class="days-stack">${days}</div>
  </div></section>`;
}

function renderFerry(plan) {
  if (!plan.ferry) return "";
  const routes = plan.ferry.routes.map((item) => `<article><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong><small>${escapeHtml(item.note)}</small></article>`).join("");
  return `<section class="section" id="ferry"><div class="shell ferry-layout">
    <div>${renderSectionHeading("FERRY / TICKETS", plan.ferry.title, plan.ferry.summary)}${renderLink(plan.ferry.bookingUrl, "官方购票入口", "button-link")}</div>
    <div><div class="ferry-routes">${routes}</div>${renderList(plan.ferry.notes)}</div>
  </div></section>`;
}

function renderHotels(plan) {
  const cards = plan.hotels.map((hotel) => `<article class="hotel-card">
    ${hotel.image ? renderImage(hotel.image, hotel.imageAlt, "hotel-media") : ""}
    <div class="hotel-body"><div class="hotel-top"><span>${escapeHtml(hotel.tier)}</span><strong>${escapeHtml(hotel.price)}</strong></div><h3>${escapeHtml(hotel.name)}</h3><p class="hotel-area">${escapeHtml(hotel.area)}</p><p>${escapeHtml(hotel.reason)}</p>${renderLink(hotel.bookingUrl, "查看酒店", "mini-link")}</div>
  </article>`).join("");
  return `<section class="section hotel-section" id="stay"><div class="shell">
    ${renderSectionHeading("STAY", "两晚不换店，位置比网红感重要", "先定区域，再比较含税总价、外窗、隔音和取消规则。")}
    <div class="hotel-grid">${cards}</div>
  </div></section>`;
}

function renderFoods(plan) {
  const cards = plan.foods.map((food) => `<article class="food-card">
    <div class="food-media${food.image ? "" : " image-placeholder"}" role="img" aria-label="${escapeHtml(food.imageAlt)}">${food.image ? `<img src="${escapeHtml(food.image)}" alt="${escapeHtml(food.imageAlt)}" loading="lazy" decoding="async">` : "<span>LOCAL FLAVOUR</span>"}<span class="photo-note">菜品示意</span></div>
    <span class="food-mark">${escapeHtml(food.mark)}</span>
    <div class="food-body"><h3>${escapeHtml(food.name)}</h3><p class="food-address">${escapeHtml(food.address)}</p><p class="food-order"><strong>点：</strong>${escapeHtml(food.order)}</p><small>${escapeHtml(food.tip)}</small>${renderLink(food.sourceUrl, "来源 / 地图", "mini-link")}</div>
  </article>`).join("");
  return `<section class="section food-section" id="eat"><div class="shell">
    ${renderSectionHeading("EAT LIKE A LOCAL", "一口一站，别一次吃撑", "同类小吃二选一；图片为视觉示意，实际出品以到店为准。", true)}
    <div class="food-grid">${cards}</div>
  </div></section>`;
}

function renderBudget(plan) {
  const first = plan.budget.modes[0];
  const buttons = plan.budget.modes.map((mode, index) => `<button type="button" data-budget-mode="${escapeHtml(mode.id)}" aria-pressed="${index === 0}">${escapeHtml(mode.label)}</button>`).join("");
  const items = first.items.map((item) => `<div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.amount)}</strong><i style="--weight:${item.weight}%"></i></div>`).join("");
  return `<section class="section budget-section" id="budget"><div class="shell budget-layout">
    <div>${renderSectionHeading("BUDGET", "这趟大约花多少", plan.budget.summary)}<div class="budget-toggle" role="group" aria-label="预算模式">${buttons}</div><div class="budget-total"><span id="budget-label">${escapeHtml(first.label)}</span><strong id="budget-total">${escapeHtml(first.total)}</strong><small id="budget-note">${escapeHtml(first.note)}</small></div></div>
    <div class="budget-items" id="budget-items">${items}</div>
  </div></section>`;
}

function renderWeather(plan) {
  const cards = plan.weather.days.map((day) => `<article data-weather-date="${escapeHtml(day.date)}"><span>${escapeHtml(day.label)}</span><strong data-weather-summary>${escapeHtml(day.summary)}</strong><b><i data-weather-high>${escapeHtml(day.high)}</i> / <i data-weather-low>${escapeHtml(day.low)}</i>°C</b><small>最高降雨概率 <i data-weather-rain>${escapeHtml(day.rainProbability)}</i>%</small></article>`).join("");
  return `<section class="section weather-section" id="live"><div class="shell">
    ${renderSectionHeading("WEATHER", `${plan.meta.destination}行程天气`, `快照核实于 ${plan.meta.verifiedAt}；联网刷新失败时仍保留原计划。`)}
    <div class="weather-grid">${cards}</div>
    <div class="weather-actions">${plan.weather.live ? '<button type="button" id="weather-refresh" class="action-button">刷新天气</button>' : ""}${renderLink(plan.weather.sourceUrl, "数据来源", "mini-link")}<span id="weather-status" role="status">当前显示核实快照</span></div>
  </div></section>`;
}

function renderPacking(plan) {
  const groups = plan.packing.map((group) => `<article><span>${escapeHtml(group.category)}</span>${renderList(group.items, "packing-list")}</article>`).join("");
  return `<section class="section pack-section" id="pack"><div class="shell">
    ${renderSectionHeading("PACK LIGHT", "带得少，走得远", "围绕证件、天气与当天路线打包。")}
    <div class="packing-grid">${groups}</div>
  </div></section>`;
}

function renderSources(plan) {
  const sources = plan.sources.map((source) => `<article><span>${escapeHtml(source.verifiedAt)}</span><h3>${escapeHtml(source.label)}</h3><p>${escapeHtml(source.note)}</p>${renderLink(source.url, "查看来源", "mini-link")}</article>`).join("");
  return `<section class="section sources-section" id="sources"><div class="shell">
    ${renderSectionHeading("SOURCES", "每个关键结论都留入口", "价格、余票、天气和开放规则会变化，请在下单或出发前再次确认。")}
    <div class="source-grid">${sources}</div>
    <div class="disclaimers">${plan.disclaimers.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>
  </div></section>`;
}

function renderNav(plan) {
  const links = [
    ["plan", "先订什么"], ["transport", plan.meta.transportMode], ["days", "逐日行程"],
    ...(plan.ferry ? [["ferry", "票务"]] : []), ["stay", "酒店"], ["eat", "小吃"],
    ["budget", "预算"], ["live", "天气"], ["pack", "行李"], ["sources", "来源"],
  ];
  return `<nav class="section-nav" aria-label="攻略章节"><div class="shell">${links.map(([id, label]) => `<a href="#${id}" data-section-link="${id}">${escapeHtml(label)}</a>`).join("")}</div></nav>`;
}

function color(value, fallback) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function serializeClientData(plan) {
  const data = {
    meta: { slug: plan.meta.slug, startDate: plan.meta.startDate, endDate: plan.meta.endDate },
    budget: plan.budget,
    weather: plan.weather,
  };
  return JSON.stringify(data).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
}

function renderPage(plan, template) {
  const body = [
    renderQuick(plan), renderTransport(plan), renderDays(plan), renderFerry(plan), renderHotels(plan),
    renderFoods(plan), renderBudget(plan), renderWeather(plan), renderPacking(plan), renderSources(plan),
  ].join("\n");
  const theme = { ...themeDefaults, ...(plan.meta.theme ?? {}) };
  const themeVars = `--ink:${color(theme.ink, themeDefaults.ink)};--paper:${color(theme.paper, themeDefaults.paper)};--coral:${color(theme.coral, themeDefaults.coral)};--teal:${color(theme.teal, themeDefaults.teal)};--yellow:${color(theme.yellow, themeDefaults.yellow)};`;
  const sampleBanner = plan.meta.sampleOnly
    ? '<div class="sample-banner" role="note">示例数据 · 真实旅行前必须重新联网核实</div>'
    : "";
  const footer = `<footer><div class="shell"><strong>${escapeHtml(plan.meta.origin)} → ${escapeHtml(plan.meta.destination)}</strong><span>${escapeHtml(plan.meta.startDate)} — ${escapeHtml(plan.meta.endDate)}</span><small>信息核实于 ${escapeHtml(plan.meta.verifiedAt)}</small></div></footer>`;

  const replacements = {
    __TITLE__: escapeHtml(plan.meta.title),
    __DESCRIPTION__: escapeHtml(plan.meta.description),
    __THEME_VARS__: themeVars,
    __SAMPLE_BANNER__: sampleBanner,
    __HERO__: renderHero(plan),
    __NAV__: renderNav(plan),
    __BODY__: body,
    __FOOTER__: footer,
    __GUIDE_DATA__: serializeClientData(plan),
  };
  let html = template;
  for (const [token, value] of Object.entries(replacements)) html = html.replaceAll(token, value);
  const unresolved = html.match(/__[A-Z0-9_]+__/g);
  if (unresolved) fail(`模板仍有未替换占位符：${[...new Set(unresolved)].join(", ")}`);
  return html;
}

export async function buildGuide({ inputPath, outputPath, validateOnly = false }) {
  if (!inputPath) fail("缺少 --input。\n" + usage());
  if (!validateOnly && !outputPath) fail("生成网页时必须提供 --output。\n" + usage());

  const resolvedInput = path.resolve(inputPath);
  const planText = await readFile(resolvedInput, "utf8");
  let sourcePlan;
  try {
    sourcePlan = JSON.parse(planText);
  } catch (error) {
    fail(`无法解析 JSON：${error.message}`);
  }
  validatePlan(sourcePlan);
  const plan = structuredClone(sourcePlan);
  const budget = resolveBudget(plan.meta);
  const imageReport = await embedImages(plan, path.dirname(resolvedInput), budget);
  const template = await readFile(templatePath, "utf8");
  const html = renderPage(plan, template);
  const outputBytes = Buffer.byteLength(html, "utf8");
  if (outputBytes > budget.maxOutputKiB * 1024) {
    fail(`HTML 为 ${(outputBytes / 1024).toFixed(1)} KiB，超过 ${budget.maxOutputKiB} KiB。`);
  }

  const sha256 = createHash("sha256").update(html).digest("hex").toUpperCase();
  if (!validateOnly) {
    const resolvedOutput = path.resolve(outputPath);
    await mkdir(path.dirname(resolvedOutput), { recursive: true });
    await writeFile(resolvedOutput, html, "utf8");
  }

  const report = {
    valid: true,
    sampleOnly: plan.meta.sampleOnly,
    offline: plan.meta.offline,
    localImages: imageReport.uniqueAssets.length,
    remoteImages: imageReport.remoteImages,
    imageKiB: Number((imageReport.totalBytes / 1024).toFixed(1)),
    outputKiB: Number((outputBytes / 1024).toFixed(1)),
    sha256,
    wroteOutput: !validateOnly,
    output: validateOnly ? null : path.resolve(outputPath),
    budgetKiB: budget,
  };
  return { html, report };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const { report } = await buildGuide(args);
  console.log(JSON.stringify(report, null, 2));
}

const isMain = process.argv[1] && realpathSync(path.resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
