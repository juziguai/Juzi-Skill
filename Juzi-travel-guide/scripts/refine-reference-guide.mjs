import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(SCRIPT_DIR, "..");

export const SOURCE_NAME = "ChatGPT-5.6 Sol-深圳出发-厦门三天两夜攻略.html";
export const OUTPUT_NAME = "ChatGPT-5.6 Sol-深圳出发-厦门三天两夜攻略-迭代版.html";
export const SOURCE_SHA256 = "73D6A98937D1D8394D8162595C0BEA7AEB2FA52CA36FB8440F2640FCF5BD4698";

const WEATHER_FAILURE_SOURCE = `    } catch (_) {
      if (weatherLiveStatus) {
        weatherLiveStatus.className = "network-status is-error";
        weatherLiveStatus.textContent = "天气接口暂不可用，请使用中国天气网入口复核";
      }
      if (manual) announce("天气接口暂不可用，已保留官方天气入口");
    } finally {`;

const WEATHER_FAILURE_REFINED = `    } catch (_) {
      document.querySelectorAll("[data-live-weather]").forEach((card) => {
        card.dataset.state = "error";
        const label = card.querySelector("[data-weather-label]");
        const temperature = card.querySelector("[data-weather-temperature]");
        const rain = card.querySelector("[data-weather-rain]");
        if (label) label.textContent = "暂不可用";
        if (temperature) temperature.textContent = "—";
        if (rain) rain.textContent = "请用官方入口复核";
      });
      if (weatherLiveStatus) {
        weatherLiveStatus.className = "network-status is-error";
        weatherLiveStatus.textContent = "天气接口暂不可用，请使用中国天气网入口复核";
      }
      if (manual) announce("天气接口暂不可用，已保留官方天气入口");
    } finally {`;

const REFINEMENT_STYLE = `
<style id="juzi-reference-refinement">
/* Incremental mobile refinements for the approved reference guide. */
.reduce-motion .route-map-node,
.motion-paused .route-map-node {
  animation: none !important;
  opacity: 1 !important;
  transform: translate(-50%, -50%) !important;
}

.reduce-motion .route-stop,
.motion-paused .route-stop {
  animation: none !important;
  opacity: 1 !important;
  transform: none !important;
}

.weather-live-grid [data-state="error"] {
  background: #fff0ed;
}

@media (max-width: 640px) {
  #task-reset,
  .action-card a,
  .task-toggle,
  .route-map-panel-head a,
  .route-stop a,
  .hotel-card a,
  .eat-card a,
  .budget-mode button,
  .network-refresh,
  .network-fallback a,
  .motion-toggle,
  footer a {
    min-height: 44px;
  }

  #task-reset,
  .action-card a,
  .route-map-panel-head a,
  .route-stop a,
  .hotel-card a,
  .eat-card a,
  .network-fallback a,
  footer a {
    align-items: center;
    display: inline-flex;
  }

  .route-map-node {
    min-height: 44px;
    min-width: 44px;
  }
}

@media (max-width: 480px) {
  .hero-copy {
    min-width: 0;
  }

  .eyebrow {
    font-size: 11px;
    letter-spacing: 0;
    line-height: 1.55;
    overflow-wrap: anywhere;
  }

  .hero h1 {
    font-size: 56px;
    letter-spacing: 0;
    line-height: .98;
    overflow-wrap: anywhere;
  }

  .hero-lede {
    overflow-wrap: anywhere;
  }
}

@media (max-width: 360px) {
  .hero h1 {
    font-size: 48px;
  }
}
</style>`;

function sha256(content) {
  return createHash("sha256").update(content).digest("hex").toUpperCase();
}

export function refineReferenceGuide(source) {
  const sourceHash = sha256(source);
  if (sourceHash !== SOURCE_SHA256) {
    throw new Error(`Reference guide hash mismatch: expected ${SOURCE_SHA256}, received ${sourceHash}`);
  }
  if (source.includes('id="juzi-reference-refinement"')) {
    throw new Error("Reference guide already contains the refinement marker");
  }
  if (!source.includes("</head>")) {
    throw new Error("Reference guide is missing </head>");
  }

  const weatherFailureMatches = source.split(WEATHER_FAILURE_SOURCE).length - 1;
  if (weatherFailureMatches !== 1) {
    throw new Error(`Expected one weather fallback block, received ${weatherFailureMatches}`);
  }

  return source
    .replace(WEATHER_FAILURE_SOURCE, WEATHER_FAILURE_REFINED)
    .replace("</head>", `${REFINEMENT_STYLE}\n</head>`);
}

async function main() {
  const sourcePath = path.join(PROJECT_DIR, SOURCE_NAME);
  const outputPath = path.join(PROJECT_DIR, OUTPUT_NAME);
  const source = await readFile(sourcePath, "utf8");
  const refined = refineReferenceGuide(source);

  if (process.argv.includes("--check")) {
    const current = await readFile(outputPath, "utf8").catch(() => null);
    if (current !== refined) {
      throw new Error(`Refined guide is missing or stale: ${outputPath}`);
    }
    console.log(`OK ${OUTPUT_NAME} ${sha256(refined)}`);
    return;
  }

  await writeFile(outputPath, refined);
  console.log(`WROTE ${outputPath}`);
  console.log(`SOURCE ${SOURCE_SHA256}`);
  console.log(`OUTPUT ${sha256(refined)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
