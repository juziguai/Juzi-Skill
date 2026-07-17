import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(SCRIPT_DIR, "..");

export const SOURCE_NAME = "ChatGPT-5.6 Sol-深圳出发-厦门三天两夜攻略.html";
export const OUTPUT_NAME = "ChatGPT-5.6 Sol-深圳出发-厦门三天两夜攻略-Apple风格迭代版.html";
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

const APPLE_STYLE = `
<style id="juzi-apple-control-layer">
:root {
  --juzi-control-surface: rgb(255 253 247 / 88%);
  --juzi-control-surface-solid: #fffdf7;
  --juzi-control-border: rgb(19 45 45 / 16%);
  --juzi-control-shadow: 0 10px 32px rgb(5 21 20 / 14%);
  --juzi-control-blur: 18px;
  --juzi-content-radius: 8px;
  --juzi-control-radius: 999px;
  --juzi-control-font: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif;
  --juzi-tabbar-height: 66px;
}

.apple-control,
.apple-tabbar,
.apple-next-stop,
.apple-more-sheet,
.apple-journey-pass,
.apple-map-toolbar,
.apple-map-view,
.apple-weather-control,
.apple-disclosure-toggle {
  font-family: var(--juzi-control-font);
  letter-spacing: 0;
}

.hero h1,
.section-heading h2,
.ferry-copy h2,
.budget-copy h2,
.sources-grid h2,
.stub-route {
  letter-spacing: 0;
}

.hero h1 {
  font-size: 116px;
}

.section-heading h2,
.ferry-copy h2,
.budget-copy h2,
.sources-grid h2 {
  font-size: 68px;
}

.apple-skip-link {
  position: fixed;
  z-index: 250;
  top: 12px;
  left: 12px;
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid var(--ink);
  background: var(--white);
  color: var(--ink);
  font: 800 14px/1.5 var(--juzi-control-font);
  transform: translateY(-160%);
  transition: transform 180ms ease;
}

.apple-skip-link:focus {
  transform: translateY(0);
}

.apple-icon {
  display: inline-block;
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  background: currentColor;
  -webkit-mask: var(--apple-icon) center / contain no-repeat;
  mask: var(--apple-icon) center / contain no-repeat;
}

.quick-nav {
  transition: background 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.quick-nav.is-apple-compact {
  border-bottom-color: var(--juzi-control-border);
  background: var(--juzi-control-surface);
  box-shadow: 0 8px 26px rgb(5 21 20 / 8%);
}

@supports ((backdrop-filter: blur(2px)) or (-webkit-backdrop-filter: blur(2px))) {
  .quick-nav.is-apple-compact,
  .apple-tabbar-inner,
  .apple-next-stop,
  .apple-more-sheet::backdrop,
  .apple-more-sheet-inner,
  .apple-map-toolbar {
    -webkit-backdrop-filter: blur(var(--juzi-control-blur)) saturate(135%);
    backdrop-filter: blur(var(--juzi-control-blur)) saturate(135%);
  }
}

@supports not ((backdrop-filter: blur(2px)) or (-webkit-backdrop-filter: blur(2px))) {
  .quick-nav.is-apple-compact,
  .apple-tabbar-inner,
  .apple-next-stop,
  .apple-more-sheet-inner,
  .apple-map-toolbar {
    background: var(--juzi-control-surface-solid);
  }
}

.opaque-controls .quick-nav.is-apple-compact,
.opaque-controls .apple-tabbar-inner,
.opaque-controls .apple-next-stop,
.opaque-controls .apple-more-sheet-inner,
.opaque-controls .apple-map-toolbar {
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  background: var(--juzi-control-surface-solid) !important;
}

.apple-journey-pass {
  margin-top: 34px;
  border: 1px solid var(--ink);
  background: var(--white);
}

.apple-pass-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 420px);
  align-items: end;
  gap: 28px;
  padding: 26px 28px 22px;
  border-bottom: 1px solid var(--ink);
}

.apple-pass-heading p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.apple-pass-heading h3 {
  margin: 4px 0 0;
  font: 900 30px/1.15 STSong, SimSun, serif;
  letter-spacing: 0;
}

.apple-pass-kicker {
  color: var(--teal);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.apple-pass-list {
  display: grid;
}

.apple-pass-row {
  display: grid;
  grid-template-columns: 160px minmax(220px, 1fr) minmax(170px, .65fr) auto;
  align-items: center;
  gap: 22px;
  min-height: 78px;
  padding: 15px 20px;
  border-bottom: 1px solid var(--line);
  transition: background 160ms ease, box-shadow 160ms ease;
}

.apple-pass-row:last-child {
  border-bottom: 0;
}

.apple-pass-row.is-relevant {
  background: #d9eee7;
  box-shadow: inset 4px 0 0 var(--teal);
}

.apple-pass-kind,
.apple-pass-use {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.apple-pass-kind span,
.apple-pass-use span {
  color: var(--muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.apple-pass-kind strong,
.apple-pass-use strong {
  overflow-wrap: anywhere;
  font-size: 14px;
  line-height: 1.35;
}

.apple-pass-status {
  justify-self: start;
  min-width: 92px;
  padding: 7px 10px;
  border: 1px solid currentColor;
  color: var(--coral);
  font-size: 11px;
  font-weight: 900;
  text-align: center;
}

.apple-pass-status[data-state="done"] {
  color: var(--teal);
}

.apple-pass-row a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 92px;
  min-height: 44px;
  color: var(--teal);
  font-size: 12px;
  font-weight: 900;
}

.apple-next-stop {
  position: fixed;
  z-index: 90;
  left: 50%;
  bottom: 20px;
  display: grid;
  grid-template-columns: auto minmax(190px, 1fr) minmax(150px, .6fr) auto;
  align-items: center;
  gap: 14px;
  width: min(760px, calc(100% - 40px));
  min-height: 72px;
  padding: 10px 10px 10px 18px;
  border: 1px solid var(--juzi-control-border);
  border-radius: var(--juzi-content-radius);
  background: var(--juzi-control-surface);
  box-shadow: var(--juzi-control-shadow);
  transform: translate(-50%, 0);
  transition: opacity 180ms ease, transform 180ms ease, min-height 180ms ease;
}

.apple-next-stop[hidden] {
  display: none;
}

.apple-next-stop.is-entering {
  opacity: 0;
  transform: translate(-50%, 18px);
}

.apple-next-stop.is-compact {
  min-height: 58px;
}

.apple-next-stop.is-compact .apple-next-meta,
.apple-next-stop.is-compact .apple-next-copy p {
  display: none;
}

.apple-next-time {
  display: grid;
  place-items: center;
  min-width: 64px;
  min-height: 48px;
  border-right: 1px solid var(--juzi-control-border);
  color: var(--teal);
  font-size: 18px;
  font-weight: 900;
}

.apple-next-copy,
.apple-next-meta {
  min-width: 0;
}

.apple-next-copy span,
.apple-next-meta span {
  display: block;
  color: var(--muted);
  font-size: 9px;
  font-weight: 900;
  text-transform: uppercase;
}

.apple-next-copy strong {
  display: block;
  overflow: hidden;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.apple-next-copy p,
.apple-next-meta p {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.35;
}

.apple-primary-action,
.apple-icon-button,
.apple-text-button,
.apple-segment-button,
.apple-switch-button {
  appearance: none;
  border: 0;
  cursor: pointer;
  font: inherit;
}

.apple-primary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 126px;
  min-height: 48px;
  padding: 0 17px;
  border: 1px solid var(--teal);
  background: var(--teal);
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  text-decoration: none;
}

.apple-primary-action:hover {
  background: var(--ink);
  border-color: var(--ink);
}

.apple-tabbar {
  display: none;
}

.apple-tabbar-inner {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  width: min(520px, calc(100% - 16px));
  min-height: var(--juzi-tabbar-height);
  margin: 0 auto max(8px, env(safe-area-inset-bottom));
  padding: 5px;
  border: 1px solid var(--juzi-control-border);
  border-radius: 18px;
  background: var(--juzi-control-surface);
  box-shadow: var(--juzi-control-shadow);
}

.apple-tab-link,
.apple-tab-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  min-height: 52px;
  padding: 4px 2px;
  border: 0;
  border-radius: 13px;
  background: transparent;
  color: var(--muted);
  font: 800 10px/1.15 var(--juzi-control-font);
  text-decoration: none;
}

.apple-tab-link.is-active,
.apple-tab-link[aria-current="page"] {
  background: var(--ink);
  color: #fff;
}

.apple-tab-link .apple-icon,
.apple-tab-more .apple-icon {
  width: 19px;
  height: 19px;
}

.apple-more-sheet {
  width: min(560px, calc(100% - 24px));
  max-height: calc(100dvh - 24px);
  margin: auto;
  padding: 0;
  overflow: visible;
  border: 0;
  background: transparent;
}

.apple-more-sheet::backdrop {
  background: rgb(19 45 45 / 38%);
}

.apple-more-sheet-inner {
  max-height: calc(100dvh - 24px);
  overflow: auto;
  border: 1px solid var(--juzi-control-border);
  border-radius: var(--juzi-content-radius);
  background: var(--juzi-control-surface);
  box-shadow: 0 24px 80px rgb(5 21 20 / 26%);
}

.apple-more-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px;
  border-bottom: 1px solid var(--juzi-control-border);
}

.apple-more-head h2 {
  margin: 0;
  font: 900 25px/1.2 STSong, SimSun, serif;
  letter-spacing: 0;
}

.apple-icon-button {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--juzi-control-border);
  border-radius: 50%;
  background: var(--juzi-control-surface-solid);
  color: var(--ink);
}

.apple-more-nav {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  padding: 12px;
}

.apple-more-nav a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--juzi-control-border);
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.apple-more-settings {
  display: grid;
  gap: 8px;
  padding: 14px 20px 20px;
}

.apple-more-settings h3 {
  margin: 0 0 4px;
  color: var(--muted);
  font-size: 10px;
  text-transform: uppercase;
}

.apple-switch-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 48px;
  padding: 8px 0;
  border-bottom: 1px solid var(--juzi-control-border);
  background: transparent;
  color: var(--ink);
  text-align: left;
}

.apple-switch-track {
  position: relative;
  flex: 0 0 auto;
  width: 46px;
  height: 28px;
  border: 1px solid var(--ink);
  border-radius: var(--juzi-control-radius);
  background: var(--paper-2);
}

.apple-switch-track::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--ink);
  transition: transform 160ms ease, background 160ms ease;
}

.apple-switch-button[aria-checked="true"] .apple-switch-track {
  background: var(--teal-light);
}

.apple-switch-button[aria-checked="true"] .apple-switch-track::after {
  background: var(--teal);
  transform: translateX(18px);
}

.day-compass.apple-segmented {
  grid-template-columns: auto repeat(3, 1fr);
  padding: 5px;
  border-color: var(--juzi-control-border);
  background: var(--juzi-control-surface-solid);
  box-shadow: 0 10px 30px rgb(5 21 20 / 10%);
}

.day-compass.apple-segmented .day-compass-label {
  border: 0;
  padding-inline: 13px 18px;
}

.day-compass.apple-segmented a {
  min-height: 52px;
  border: 0;
  border-radius: 6px;
}

.day-compass.apple-segmented a.is-active {
  background: var(--ink);
  color: #fff;
}

.apple-map-view,
.apple-weather-segments {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--juzi-control-border);
  border-radius: var(--juzi-content-radius);
  background: var(--paper-2);
}

.apple-map-view {
  display: none;
}

.apple-weather-segments {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 16px;
}

.apple-segment-button {
  min-height: 45px;
  padding: 7px 10px;
  border-radius: 5px;
  background: transparent;
  color: var(--muted);
  font-size: 11px;
  font-weight: 900;
}

.apple-segment-button[aria-selected="true"] {
  background: var(--white);
  color: var(--ink);
  box-shadow: 0 2px 8px rgb(5 21 20 / 8%);
}

.route-map-stage {
  position: relative;
}

.apple-map-toolbar {
  position: absolute;
  z-index: 8;
  top: 14px;
  right: 14px;
  bottom: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border: 1px solid var(--juzi-control-border);
  border-radius: var(--juzi-control-radius);
  background: var(--juzi-control-surface);
  box-shadow: var(--juzi-control-shadow);
}

.apple-map-toolbar .apple-icon-button {
  width: 44px;
  height: 44px;
  border: 0;
  background: transparent;
}

.apple-map-toolbar .apple-primary-action {
  min-width: 112px;
  min-height: 44px;
  border-radius: var(--juzi-control-radius);
}

.route-map-node.is-next-stop {
  outline: 4px solid var(--yellow);
  outline-offset: 5px;
  z-index: 7;
}

.apple-weather-summary {
  display: grid;
  grid-template-columns: minmax(150px, .8fr) minmax(0, 1.2fr);
  gap: 24px;
  align-items: center;
  padding: 22px 0;
  border-block: 1px solid var(--juzi-control-border);
}

.apple-weather-now span,
.apple-weather-advice span {
  display: block;
  color: var(--muted);
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}

.apple-weather-now strong {
  display: block;
  margin-top: 5px;
  font-size: 24px;
  line-height: 1.2;
}

.apple-weather-now p,
.apple-weather-advice p {
  margin: 5px 0 0;
  font-size: 13px;
}

.apple-weather-advice {
  padding-left: 22px;
  border-left: 1px solid var(--juzi-control-border);
}

.apple-weather-details {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 1px solid var(--juzi-control-border);
}

.apple-weather-detail {
  min-height: 72px;
  padding: 14px;
  border-right: 1px solid var(--juzi-control-border);
}

.apple-weather-detail:last-child {
  border-right: 0;
}

.apple-weather-detail span {
  display: block;
  color: var(--muted);
  font-size: 9px;
  font-weight: 900;
  text-transform: uppercase;
}

.apple-weather-detail strong {
  display: block;
  margin-top: 5px;
  font-size: 12px;
}

.apple-disclosure-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 45px;
  margin-top: 12px;
  padding: 7px 12px;
  border: 1px solid var(--ink);
  background: transparent;
  color: var(--ink);
  font-size: 11px;
  font-weight: 900;
}

.apple-disclosure-toggle .apple-icon {
  width: 16px;
  height: 16px;
  transition: transform 160ms ease;
}

.apple-disclosure-toggle[aria-expanded="true"] .apple-icon {
  transform: rotate(180deg);
}

.source-links[data-apple-collapsed="true"] a:nth-child(n+5) {
  display: none;
}

.weather-live-grid[data-apple-expanded="false"] {
  display: none;
}

.weather-live-grid [data-state="error"] {
  background: #fff0ed;
}

.reduce-motion .route-map-node,
.motion-paused .route-map-node {
  animation: none !important;
  opacity: 1 !important;
  transform: translate(-50%, -50%) !important;
}

.reduce-motion {
  scroll-behavior: auto !important;
}

.reduce-motion *,
.reduce-motion *::before,
.reduce-motion *::after {
  transition-duration: .01ms !important;
  animation-duration: .01ms !important;
  animation-iteration-count: 1 !important;
}

.reduce-motion .hero-route-runner,
.reduce-motion .hero-orbit,
.reduce-motion .sea-spray-burst i {
  animation: none !important;
}

.reduce-motion .route-stop,
.motion-paused .route-stop {
  animation: none !important;
  opacity: 1 !important;
  transform: none !important;
}

@media (prefers-color-scheme: dark) {
  :root {
    --juzi-control-surface: rgb(19 45 45 / 90%);
    --juzi-control-surface-solid: #173737;
    --juzi-control-border: rgb(255 253 247 / 20%);
  }

  .apple-tabbar-inner,
  .apple-next-stop,
  .apple-more-sheet-inner,
  .apple-map-toolbar {
    color: #fffdf7;
  }

  .apple-next-copy p,
  .apple-next-meta p,
  .apple-next-copy span,
  .apple-next-meta span,
  .apple-tab-link,
  .apple-tab-more {
    color: #d4dfda;
  }

  .apple-icon-button {
    background: #fffdf7;
  }
}

@media (max-width: 900px) {
  .hero h1 {
    font-size: 72px;
  }

  .section-heading h2,
  .ferry-copy h2,
  .budget-copy h2,
  .sources-grid h2 {
    font-size: 52px;
  }

  .apple-pass-row {
    grid-template-columns: 130px minmax(180px, 1fr) auto;
  }

  .apple-pass-row a {
    grid-column: 2 / -1;
    justify-self: start;
  }
}

@media (max-width: 760px) {
  body {
    padding-bottom: calc(var(--juzi-tabbar-height) + 34px + env(safe-area-inset-bottom));
  }

  .quick-nav {
    display: none;
  }

  .hero h1 {
    font-size: 58px;
  }

  .section-heading h2,
  .ferry-copy h2,
  .budget-copy h2,
  .sources-grid h2 {
    font-size: 42px;
  }

  .apple-tabbar {
    position: fixed;
    z-index: 100;
    right: 0;
    bottom: 0;
    left: 0;
    display: block;
    pointer-events: none;
  }

  .apple-tabbar-inner {
    pointer-events: auto;
  }

  .apple-next-stop {
    bottom: calc(var(--juzi-tabbar-height) + 18px + env(safe-area-inset-bottom));
    grid-template-columns: auto minmax(0, 1fr) auto;
    width: calc(100% - 20px);
    min-height: 64px;
    padding: 8px 8px 8px 10px;
    border-radius: 8px;
  }

  .apple-next-time {
    min-width: 50px;
    min-height: 44px;
    font-size: 16px;
  }

  .apple-next-meta {
    display: none;
  }

  .apple-next-copy p {
    display: none;
  }

  .apple-primary-action {
    min-width: 48px;
    width: 48px;
    padding: 0;
    border-radius: 50%;
  }

  .apple-primary-action .apple-action-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  .day-compass.apple-segmented {
    top: 8px;
    grid-template-columns: repeat(3, 1fr);
    margin-inline: -4px;
    border-radius: 8px;
  }

  .day-compass.apple-segmented .day-compass-label {
    display: none;
  }

  .day-compass.apple-segmented a {
    min-width: 0;
    padding-inline: 4px;
  }

  .day-compass.apple-segmented a strong {
    font-size: 10px;
  }

  .day-compass.apple-segmented a span {
    overflow: hidden;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .apple-pass-heading {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 20px;
  }

  .apple-pass-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    min-height: 0;
    padding: 15px 16px;
  }

  .apple-pass-use,
  .apple-pass-row a {
    grid-column: 1 / -1;
  }

  .apple-pass-status {
    grid-column: 2;
    grid-row: 1;
  }

  .apple-pass-row a {
    justify-content: flex-start;
  }

  .apple-map-view {
    display: grid;
    margin-bottom: 12px;
  }

  #map[data-apple-map-view="map"] .route-map-panel,
  #map[data-apple-map-view="list"] .route-map-stage {
    display: none;
  }

  #map .route-map-layout {
    display: block;
  }

  #map .route-map-stage,
  #map .route-map-panel {
    min-height: min(68vh, 580px);
  }

  .apple-map-toolbar {
    top: 10px;
    right: 10px;
  }

  .apple-weather-summary {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .apple-weather-advice {
    padding: 14px 0 0;
    border-top: 1px solid var(--juzi-control-border);
    border-left: 0;
  }

  .apple-weather-details {
    grid-template-columns: 1fr;
  }

  .apple-weather-detail {
    min-height: 0;
    border-right: 0;
    border-bottom: 1px solid var(--juzi-control-border);
  }

  .apple-weather-detail:last-child {
    border-bottom: 0;
  }

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
    min-width: 44px;
    min-height: 44px;
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
    font-size: 50px;
    line-height: 1.04;
    padding-bottom: 4px;
    overflow-wrap: anywhere;
  }

  .hero-actions .button {
    padding-inline: 14px;
    text-align: center;
    white-space: normal;
  }

  .hero-lede {
    overflow-wrap: anywhere;
  }

  .apple-tabbar-inner {
    width: calc(100% - 10px);
    margin-bottom: max(5px, env(safe-area-inset-bottom));
  }

  .apple-tab-link,
  .apple-tab-more {
    font-size: 9px;
  }

  .apple-next-stop {
    width: calc(100% - 12px);
  }

  .apple-pass-heading h3 {
    font-size: 26px;
  }

  .apple-more-nav {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 360px) {
  .hero h1 {
    font-size: 44px;
  }

  .apple-next-time {
    min-width: 44px;
    font-size: 14px;
  }

  .apple-next-copy strong {
    font-size: 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .apple-skip-link,
  .apple-next-stop,
  .apple-switch-track::after,
  .apple-disclosure-toggle .apple-icon,
  .quick-nav {
    transition: none !important;
  }
}

@media (forced-colors: active) {
  .apple-tabbar-inner,
  .apple-next-stop,
  .apple-more-sheet-inner,
  .apple-map-toolbar,
  .apple-journey-pass,
  .apple-pass-row,
  .apple-segment-button,
  .apple-primary-action {
    forced-color-adjust: auto;
    border: 1px solid CanvasText;
    background: Canvas;
    color: CanvasText;
    box-shadow: none;
  }

  .apple-tab-link.is-active,
  .apple-segment-button[aria-selected="true"] {
    outline: 3px solid Highlight;
  }
}
</style>`;

const APPLE_SCRIPT = `
<script id="juzi-apple-interactions">
(() => {
  "use strict";

  const root = document.documentElement;
  const main = document.querySelector("main");
  const query = (selector, scope = document) => scope.querySelector(selector);
  const queryAll = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const safeStorage = {
    get(key) {
      try { return window.localStorage.getItem(key); } catch (_) { return null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); } catch (_) {}
    }
  };

  root.classList.add("apple-controls-active");

  const lucideIcons = {
    today: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/></svg>',
    route: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>',
    map: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15"/><path d="M15 6v15"/></svg>',
    ticket: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 0 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 0 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="m9 12 2 2 4-4"/></svg>',
    more: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>',
    navigation: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>',
    locate: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/></svg>',
    close: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    chevron: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    motion: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 2 3 14h9l-1.5 8L21 10h-9z"/></svg>',
    layers: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="m22 12.5-9.17 4.17a2 2 0 0 1-1.66 0L2 12.5"/><path d="m22 17.5-9.17 4.17a2 2 0 0 1-1.66 0L2 17.5"/></svg>'
  };

  const icon = (name) => '<span class="apple-icon" data-apple-icon="' + name + '" aria-hidden="true"></span>';
  const hydrateIcons = (scope = document) => {
    queryAll("[data-apple-icon]", scope).forEach((element) => {
      const source = lucideIcons[element.dataset.appleIcon];
      if (!source) return;
      element.style.setProperty("--apple-icon", 'url("data:image/svg+xml,' + encodeURIComponent(source) + '")');
    });
  };

  const announce = (message) => {
    const toast = query("#guide-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(announce.timer);
    announce.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2100);
  };

  document.body.insertAdjacentHTML("afterbegin", '<a class="apple-skip-link" href="#plan">跳到逐日行程</a>');

  const actionGrid = query("#booking .action-grid");
  if (actionGrid) {
    actionGrid.insertAdjacentHTML("afterend", [
      '<section class="apple-journey-pass" aria-labelledby="apple-pass-title">',
      '<div class="apple-pass-heading"><div><span class="apple-pass-kicker">TRIP PASSES</span><h3 id="apple-pass-title">旅程凭证</h3></div><p>只保存当前设备上的完成状态，不保存身份证、订单号或二维码。临出发仍以官方页面和本地票面为准。</p></div>',
      '<div class="apple-pass-list">',
      '<article class="apple-pass-row" data-pass-task="rail" data-pass-days="1,3"><div class="apple-pass-kind"><span>高铁</span><strong>D674 去程 / D691 返程</strong></div><div class="apple-pass-use"><span>使用时间</span><strong>7/17 07:05 · 7/19 16:58</strong></div><span class="apple-pass-status" data-state="pending">待购买</span><a href="https://kyfw.12306.cn/otn/leftTicket/init" target="_blank" rel="noreferrer">官方入口 ↗</a></article>',
      '<article class="apple-pass-row" data-pass-task="ferry" data-pass-days="2"><div class="apple-pass-kind"><span>轮渡</span><strong>东渡 → 三丘田</strong></div><div class="apple-pass-use"><span>使用时间</span><strong>7/18 08:10 · 提前到码头</strong></div><span class="apple-pass-status" data-state="pending">待购买</span><a href="https://www.xmferry.com/" target="_blank" rel="noreferrer">官方入口 ↗</a></article>',
      '<article class="apple-pass-row" data-pass-task="hotel" data-pass-days="1,2,3"><div class="apple-pass-kind"><span>酒店</span><strong>老城片区连住 2 晚</strong></div><div class="apple-pass-use"><span>使用时间</span><strong>7/17 入住 · 7/19 退房</strong></div><span class="apple-pass-status" data-state="pending">待预订</span><a href="#stay">查看酒店 ↓</a></article>',
      '<article class="apple-pass-row" data-pass-task="xmu" data-pass-days="3"><div class="apple-pass-kind"><span>预约</span><strong>厦门大学访客预约</strong></div><div class="apple-pass-use"><span>使用时间</span><strong>7/19 · 按预约时段</strong></div><span class="apple-pass-status" data-state="pending">待复核</span><a href="https://baowei.xmu.edu.cn/info/1003/1005.htm" target="_blank" rel="noreferrer">官方指南 ↗</a></article>',
      '</div></section>'
    ].join(""));
  }

  const dayCompass = query("#day-compass");
  if (dayCompass) dayCompass.classList.add("apple-segmented");

  const mapSection = query("#map");
  const mapLayout = query(".route-map-layout", mapSection || document);
  const mapStage = query(".route-map-stage", mapSection || document);
  if (mapSection && mapLayout) {
    mapSection.dataset.appleMapView = "map";
    mapLayout.insertAdjacentHTML("beforebegin", '<div class="apple-map-view" role="tablist" aria-label="地图显示方式"><button class="apple-segment-button" type="button" role="tab" aria-selected="true" data-apple-map-view="map">地图</button><button class="apple-segment-button" type="button" role="tab" aria-selected="false" data-apple-map-view="list">行程</button></div>');
  }

  if (mapStage) {
    mapStage.insertAdjacentHTML("beforeend", '<div class="apple-map-toolbar apple-control" aria-label="地图工具"><button class="apple-icon-button" type="button" data-apple-locate title="定位到下一站" aria-label="定位到下一站">' + icon("locate") + '</button><a class="apple-primary-action" data-apple-map-open href="https://uri.amap.com/search?keyword=厦门&city=厦门&view=map&src=juzi-xiamen-guide&callnative=0" target="_blank" rel="noreferrer">' + icon("navigation") + '<span class="apple-action-label">打开导航</span></a></div>');
  }

  const weatherPanel = query(".weather-live-panel");
  const weatherGrid = query(".weather-live-grid", weatherPanel || document);
  if (weatherPanel && weatherGrid) {
    weatherGrid.dataset.appleExpanded = "false";
    weatherGrid.insertAdjacentHTML("beforebegin", [
      '<div class="apple-weather-control">',
      '<div class="apple-weather-segments" role="tablist" aria-label="选择天气日期">',
      '<button class="apple-segment-button" type="button" role="tab" aria-selected="true" data-apple-weather-day="1">周五 17</button>',
      '<button class="apple-segment-button" type="button" role="tab" aria-selected="false" data-apple-weather-day="2">周六 18</button>',
      '<button class="apple-segment-button" type="button" role="tab" aria-selected="false" data-apple-weather-day="3">周日 19</button>',
      '</div>',
      '<div class="apple-weather-summary" aria-live="polite">',
      '<div class="apple-weather-now"><span data-apple-weather-date>周五 17</span><strong data-apple-weather-condition>等待刷新</strong><p><b data-apple-weather-temperature>—</b> · <span data-apple-weather-rain>最高降雨概率 —</span></p></div>',
      '<div class="apple-weather-advice"><span>路线建议</span><p data-apple-weather-advice>午后炎热，先寄存行李并留出午休时间。</p></div>',
      '</div>',
      '<div class="apple-weather-details" aria-label="天气复核项">',
      '<div class="apple-weather-detail"><span>逐小时降雨</span><strong>临出发查看官方逐小时预报</strong></div>',
      '<div class="apple-weather-detail"><span>风与体感</span><strong>海边和轮渡当天再次复核</strong></div>',
      '<div class="apple-weather-detail"><span>紫外线与预警</span><strong>以临近出发的官方预警为准</strong></div>',
      '</div>',
      '<button class="apple-disclosure-toggle" type="button" aria-expanded="false" data-apple-weather-details>查看三日详情 ' + icon("chevron") + '</button>',
      '</div>'
    ].join(""));
  }

  const sourceLinks = query(".source-links");
  if (sourceLinks) {
    sourceLinks.dataset.appleCollapsed = "true";
    sourceLinks.insertAdjacentHTML("afterend", '<button class="apple-disclosure-toggle" type="button" aria-expanded="false" data-apple-sources>展开全部来源 ' + icon("chevron") + '</button>');
  }

  if (main) {
    main.insertAdjacentHTML("beforeend", [
      '<aside class="apple-next-stop apple-control is-entering" id="apple-next-stop" aria-label="下一站" aria-live="polite" hidden>',
      '<time class="apple-next-time" data-apple-next-time>07:05</time>',
      '<div class="apple-next-copy"><span>下一站</span><strong data-apple-next-title>深圳北上车</strong><p data-apple-next-description>D674，建议提前抵达车站。</p></div>',
      '<div class="apple-next-meta"><span data-apple-next-mode>高铁</span><p data-apple-next-ticket>请备好高铁凭证</p></div>',
      '<a class="apple-primary-action" data-apple-next-map href="https://uri.amap.com/search?keyword=深圳北站&view=map&src=juzi-xiamen-guide&callnative=0" target="_blank" rel="noreferrer">' + icon("navigation") + '<span class="apple-action-label">打开地图</span></a>',
      '</aside>',
      '<nav class="apple-tabbar" aria-label="移动端主导航"><div class="apple-tabbar-inner">',
      '<a class="apple-tab-link is-active" data-apple-tab="today" href="#apple-next-stop" aria-current="page">' + icon("today") + '<span>今日</span></a>',
      '<a class="apple-tab-link" data-apple-tab="plan" href="#plan">' + icon("route") + '<span>行程</span></a>',
      '<a class="apple-tab-link" data-apple-tab="map" href="#map">' + icon("map") + '<span>地图</span></a>',
      '<a class="apple-tab-link" data-apple-tab="booking" href="#booking">' + icon("ticket") + '<span>预订</span></a>',
      '<button class="apple-tab-more" type="button" data-apple-more-open aria-haspopup="dialog">' + icon("more") + '<span>更多</span></button>',
      '</div></nav>',
      '<dialog class="apple-more-sheet" id="apple-more-sheet" aria-labelledby="apple-more-title"><div class="apple-more-sheet-inner">',
      '<header class="apple-more-head"><h2 id="apple-more-title">更多</h2><button class="apple-icon-button" type="button" data-apple-more-close aria-label="关闭更多菜单" title="关闭">' + icon("close") + '</button></header>',
      '<nav class="apple-more-nav" aria-label="更多章节"><a href="#rail">高铁 <span>→</span></a><a href="#ferry">轮渡 <span>→</span></a><a href="#stay">酒店 <span>→</span></a><a href="#eat">小吃 <span>→</span></a><a href="#budget">预算 <span>→</span></a><a href="#live">实时数据 <span>→</span></a><a href="#notes">出发备忘 <span>→</span></a><a href="#top">回到顶部 <span>↑</span></a></nav>',
      '<div class="apple-more-settings"><h3>显示设置</h3>',
      '<button class="apple-switch-button" type="button" role="switch" aria-checked="false" data-apple-opaque><span><strong>增强控制对比</strong><small>使用不透明控制背景</small></span><i class="apple-switch-track" aria-hidden="true"></i></button>',
      '<button class="apple-switch-button" type="button" role="switch" aria-checked="false" data-apple-motion><span><strong>暂停页面动效</strong><small>保留所有文字与状态</small></span><i class="apple-switch-track" aria-hidden="true"></i></button>',
      '</div></div></dialog>'
    ].join(""));
  }

  hydrateIcons();

  const opaqueToggle = query("[data-apple-opaque]");
  const motionToggle = query("[data-apple-motion]");
  const existingMotionToggle = query("#motion-toggle");
  const storedOpaque = safeStorage.get("juzi-xiamen-opaque-controls") === "true";
  root.classList.toggle("opaque-controls", storedOpaque);
  if (opaqueToggle) opaqueToggle.setAttribute("aria-checked", String(storedOpaque));

  const syncMotionToggle = () => {
    if (!motionToggle) return;
    const paused = root.classList.contains("motion-paused") || root.classList.contains("reduce-motion");
    motionToggle.setAttribute("aria-checked", String(paused));
  };
  syncMotionToggle();

  if (opaqueToggle) {
    opaqueToggle.addEventListener("click", () => {
      const enabled = !root.classList.contains("opaque-controls");
      root.classList.toggle("opaque-controls", enabled);
      opaqueToggle.setAttribute("aria-checked", String(enabled));
      safeStorage.set("juzi-xiamen-opaque-controls", String(enabled));
      announce(enabled ? "控制背景已增强" : "控制背景已恢复半透明");
    });
  }

  if (motionToggle) {
    motionToggle.addEventListener("click", () => {
      if (existingMotionToggle) existingMotionToggle.click();
      else root.classList.toggle("motion-paused");
      window.setTimeout(syncMotionToggle, 0);
    });
  }

  const moreDialog = query("#apple-more-sheet");
  const moreOpen = query("[data-apple-more-open]");
  const moreClose = query("[data-apple-more-close]");
  const closeMore = () => {
    if (!moreDialog) return;
    if (typeof moreDialog.close === "function") moreDialog.close();
    else moreDialog.removeAttribute("open");
  };
  if (moreOpen && moreDialog) {
    moreOpen.addEventListener("click", () => {
      if (typeof moreDialog.showModal === "function") moreDialog.showModal();
      else moreDialog.setAttribute("open", "");
    });
  }
  if (moreClose) moreClose.addEventListener("click", closeMore);
  queryAll(".apple-more-nav a").forEach((link) => link.addEventListener("click", closeMore));

  const dayLinks = queryAll("[data-day-link]");
  const mapDayButtons = queryAll("[data-route-map-day]");
  const weatherDayButtons = queryAll("[data-apple-weather-day]");
  const dayCards = queryAll("[data-day-card]");
  let activeDay = 1;
  let syncingMap = false;
  let preserveDayUntil = 0;

  const weatherAdvice = {
    1: "午后炎热，先寄存行李并留出午休时间。",
    2: "轮渡与海边受风雨影响更大，优先复核航班与降雨。",
    3: "室外路线较长，预留遮阳、防雨和返程交通缓冲。"
  };

  const updateWeatherSummary = (day) => {
    const cards = queryAll("[data-live-weather]", weatherPanel || document);
    const card = cards[day - 1];
    const date = query("[data-apple-weather-date]");
    const condition = query("[data-apple-weather-condition]");
    const temperature = query("[data-apple-weather-temperature]");
    const rain = query("[data-apple-weather-rain]");
    const advice = query("[data-apple-weather-advice]");
    if (date) date.textContent = ["周五 17", "周六 18", "周日 19"][day - 1];
    if (advice) advice.textContent = weatherAdvice[day];
    if (!card) return;
    const cardCondition = query("[data-weather-label]", card);
    const cardTemperature = query("[data-weather-temperature]", card);
    const cardRain = query("[data-weather-rain]", card);
    if (condition) condition.textContent = cardCondition ? cardCondition.textContent : "等待刷新";
    if (temperature) temperature.textContent = cardTemperature ? cardTemperature.textContent : "—";
    if (rain) rain.textContent = cardRain ? cardRain.textContent : "最高降雨概率 —";
  };

  const syncPasses = () => {
    queryAll("[data-pass-task]").forEach((row) => {
      const task = row.dataset.passTask;
      const sourceCard = query('[data-task="' + task + '"]');
      const done = Boolean(sourceCard && sourceCard.classList.contains("is-complete"));
      const status = query(".apple-pass-status", row);
      if (status) {
        status.dataset.state = done ? "done" : "pending";
        status.textContent = done ? "已标记完成" : (task === "hotel" ? "待预订" : task === "xmu" ? "待复核" : "待购买");
      }
      const days = (row.dataset.passDays || "").split(",").map(Number);
      row.classList.toggle("is-relevant", days.includes(activeDay));
      if (days.includes(activeDay)) row.setAttribute("aria-current", "step");
      else row.removeAttribute("aria-current");
    });
  };

  const selectDay = (day, origin = "control") => {
    activeDay = Math.max(1, Math.min(3, Number(day) || 1));
    root.dataset.appleDay = String(activeDay);
    safeStorage.set("juzi-xiamen-selected-day", String(activeDay));
    dayLinks.forEach((link) => {
      const selected = link.getAttribute("href") === "#day-" + activeDay;
      link.classList.toggle("is-active", selected);
      if (selected) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
    weatherDayButtons.forEach((button) => {
      const selected = Number(button.dataset.appleWeatherDay) === activeDay;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    if (origin !== "map" && !syncingMap) {
      const mapButton = mapDayButtons.find((button) => Number(button.dataset.routeMapDay) === activeDay);
      if (mapButton && mapButton.getAttribute("aria-selected") !== "true") {
        syncingMap = true;
        mapButton.click();
        syncingMap = false;
      }
    }
    updateWeatherSummary(activeDay);
    syncPasses();
    updateNextStop();
  };

  dayLinks.forEach((link) => link.addEventListener("click", () => selectDay(Number(link.getAttribute("href").slice(-1)), "timeline")));
  mapDayButtons.forEach((button) => button.addEventListener("click", () => selectDay(button.dataset.routeMapDay, "map")));
  weatherDayButtons.forEach((button) => button.addEventListener("click", () => selectDay(button.dataset.appleWeatherDay, "weather")));

  const weatherObserver = weatherGrid ? new MutationObserver(() => updateWeatherSummary(activeDay)) : null;
  if (weatherObserver) weatherObserver.observe(weatherGrid, { subtree: true, childList: true, characterData: true, attributes: true });

  const weatherDetailsButton = query("[data-apple-weather-details]");
  if (weatherDetailsButton && weatherGrid) {
    weatherDetailsButton.addEventListener("click", () => {
      const expanded = weatherDetailsButton.getAttribute("aria-expanded") !== "true";
      weatherDetailsButton.setAttribute("aria-expanded", String(expanded));
      weatherGrid.dataset.appleExpanded = String(expanded);
      weatherDetailsButton.childNodes[0].nodeValue = expanded ? "收起三日详情 " : "查看三日详情 ";
    });
  }

  const sourcesButton = query("[data-apple-sources]");
  if (sourcesButton && sourceLinks) {
    sourcesButton.addEventListener("click", () => {
      const expanded = sourcesButton.getAttribute("aria-expanded") !== "true";
      sourcesButton.setAttribute("aria-expanded", String(expanded));
      sourceLinks.dataset.appleCollapsed = String(!expanded);
      sourcesButton.childNodes[0].nodeValue = expanded ? "收起来源 " : "展开全部来源 ";
    });
  }

  const mapViewButtons = queryAll("[data-apple-map-view]");
  mapViewButtons.forEach((button) => button.addEventListener("click", () => {
    const view = button.dataset.appleMapView;
    if (mapSection) mapSection.dataset.appleMapView = view;
    mapViewButtons.forEach((item) => {
      const selected = item.dataset.appleMapView === view;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
  }));

  const taskObserver = actionGrid ? new MutationObserver(syncPasses) : null;
  if (taskObserver) taskObserver.observe(actionGrid, { subtree: true, attributes: true, attributeFilter: ["class", "aria-pressed"] });

  const journey = {};
  dayCards.forEach((card, dayIndex) => {
    journey[dayIndex + 1] = queryAll(".time-row", card).map((row) => ({
      row,
      time: query("time", row)?.textContent.trim() || "",
      title: query("strong", row)?.textContent.trim() || "下一站",
      description: query("p", row)?.textContent.trim() || "按行程前往",
      price: query(":scope > span", row)?.textContent.trim() || ""
    }));
  });

  const inferMode = (title) => {
    if (/站|上车|高铁/.test(title)) return "高铁";
    if (/码头|轮渡|三丘田|内厝澳|鼓浪屿/.test(title)) return "轮渡 / 步行";
    if (/酒店|入住|午休/.test(title)) return "休整";
    return "步行 / 短途车";
  };

  const ticketNote = (day) => day === 1 ? "请备好高铁凭证" : day === 2 ? "请备好轮渡票与证件" : "请复核预约与返程票";
  const amapUrl = (title) => "https://uri.amap.com/search?keyword=" + encodeURIComponent("厦门 " + title) + "&city=" + encodeURIComponent("厦门") + "&view=map&src=juzi-xiamen-guide&callnative=0";
  let nextStopIndex = 0;

  const updateMapHighlight = (title, url) => {
    window.setTimeout(() => {
      const nodes = queryAll(".route-map-node");
      let matched = null;
      nodes.forEach((node) => {
        const isMatch = node.textContent.includes(title) || title.includes(query("small", node)?.textContent.trim() || "__none__");
        node.classList.toggle("is-next-stop", isMatch);
        if (isMatch && !matched) matched = node;
      });
      if (!matched && nodes[0]) {
        nodes[0].classList.add("is-next-stop");
        matched = nodes[0];
      }
      const toolbarLink = query("[data-apple-map-open]");
      if (toolbarLink) toolbarLink.href = matched?.href || url;
    }, 20);
  };

  function updateNextStop() {
    const items = journey[activeDay] || [];
    if (!items.length) return;
    const activeCard = query("#day-" + activeDay);
    const cardInView = activeCard && activeCard.getBoundingClientRect().top < window.innerHeight * .6 && activeCard.getBoundingClientRect().bottom > 180;
    if (cardInView) {
      const visibleIndex = items.findIndex((item) => item.row.getBoundingClientRect().bottom > Math.min(window.innerHeight * .52, 440));
      nextStopIndex = visibleIndex >= 0 ? visibleIndex : items.length - 1;
    } else {
      nextStopIndex = 0;
    }
    const item = items[nextStopIndex];
    const url = amapUrl(item.title);
    const nextStop = query("#apple-next-stop");
    const time = query("[data-apple-next-time]");
    const title = query("[data-apple-next-title]");
    const description = query("[data-apple-next-description]");
    const mode = query("[data-apple-next-mode]");
    const ticket = query("[data-apple-next-ticket]");
    const link = query("[data-apple-next-map]");
    if (time) time.textContent = item.time || "下一站";
    if (title) title.textContent = item.title;
    if (description) description.textContent = item.description;
    if (mode) mode.textContent = inferMode(item.title);
    if (ticket) ticket.textContent = ticketNote(activeDay);
    if (link) link.href = url;
    if (nextStop && window.scrollY > 120) {
      nextStop.hidden = false;
      window.requestAnimationFrame(() => nextStop.classList.remove("is-entering"));
    }
    updateMapHighlight(item.title, url);
  }

  const locateButton = query("[data-apple-locate]");
  if (locateButton) {
    locateButton.addEventListener("click", () => {
      const activeNode = query(".route-map-node.is-next-stop") || query(".route-map-node");
      if (activeNode) {
        activeNode.focus({ preventScroll: false });
        activeNode.scrollIntoView({ behavior: root.classList.contains("reduce-motion") ? "auto" : "smooth", block: "center" });
        announce("已定位到下一站 " + (query("small", activeNode)?.textContent || ""));
      }
    });
  }

  const tabLinks = queryAll("[data-apple-tab]");
  const tabTargets = [
    { tab: "booking", sectionId: "booking" },
    { tab: "plan", sectionId: "plan" },
    { tab: "map", sectionId: "map" }
  ];
  const updateTabState = () => {
    const marker = Math.min(window.innerHeight * .35, 280);
    let current = "today";
    tabTargets.forEach(({ tab, sectionId }) => {
      const section = query("#" + sectionId);
      if (section && section.getBoundingClientRect().top <= marker) current = tab;
    });
    tabLinks.forEach((link) => {
      const selected = link.dataset.appleTab === current;
      link.classList.toggle("is-active", selected);
      if (selected) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  };

  queryAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;
      if (hash === "#map" || hash === "#plan" || hash === "#apple-next-stop") preserveDayUntil = Date.now() + 1400;
      let target = query(hash);
      if (hash === "#plan") target = query("#day-" + activeDay) || target;
      if (hash === "#apple-next-stop") target = query("#day-" + activeDay) || query("#plan");
      if (target) {
        if (window.location.hash !== hash) window.history.pushState(null, "", hash);
        target.scrollIntoView({ behavior: root.classList.contains("reduce-motion") ? "auto" : "smooth", block: "start" });
      }
    });
  });

  let lastScrollY = window.scrollY;
  let scrollFrame = 0;
  window.addEventListener("scroll", () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      const nextStop = query("#apple-next-stop");
      const quickNav = query(".quick-nav");
      const scrollingDown = window.scrollY > lastScrollY + 6;
      if (nextStop) nextStop.classList.toggle("is-compact", scrollingDown && window.scrollY > 400);
      if (quickNav) quickNav.classList.toggle("is-apple-compact", window.scrollY > 220);
      lastScrollY = window.scrollY;
      let closestDay = activeDay;
      let closestDistance = Number.POSITIVE_INFINITY;
      dayCards.forEach((card, index) => {
        const distance = Math.abs(card.getBoundingClientRect().top - 180);
        if (distance < closestDistance && card.getBoundingClientRect().bottom > 80) {
          closestDistance = distance;
          closestDay = index + 1;
        }
      });
      const planRect = query("#plan")?.getBoundingClientRect();
      if (Date.now() >= preserveDayUntil && closestDay !== activeDay && planRect && planRect.top < 320 && planRect.bottom > 180) selectDay(closestDay, "scroll");
      updateNextStop();
      updateTabState();
    });
  }, { passive: true });

  window.addEventListener("resize", () => {
    updateNextStop();
    updateTabState();
  });

  const hashDay = /^#day-([1-3])$/.exec(window.location.hash)?.[1];
  const storedDay = Number(safeStorage.get("juzi-xiamen-selected-day"));
  selectDay(hashDay || (storedDay >= 1 && storedDay <= 3 ? storedDay : 1), "init");
  updateTabState();
  syncPasses();
})();
</script>`;

function sha256(content) {
  return createHash("sha256").update(content).digest("hex").toUpperCase();
}

export function buildAppleReferenceGuide(source) {
  const sourceHash = sha256(source);
  if (sourceHash !== SOURCE_SHA256) {
    throw new Error(`Reference guide hash mismatch: expected ${SOURCE_SHA256}, received ${sourceHash}`);
  }
  if (source.includes('id="juzi-apple-control-layer"') || source.includes('id="juzi-apple-interactions"')) {
    throw new Error("Reference guide already contains the Apple-inspired layer");
  }
  if (!source.includes("</head>") || !source.includes("</main></body></html>")) {
    throw new Error("Reference guide is missing required document markers");
  }

  const weatherFailureMatches = source.split(WEATHER_FAILURE_SOURCE).length - 1;
  if (weatherFailureMatches !== 1) {
    throw new Error(`Expected one weather fallback block, received ${weatherFailureMatches}`);
  }

  return source
    .replace(WEATHER_FAILURE_SOURCE, WEATHER_FAILURE_REFINED)
    .replace("</head>", `${APPLE_STYLE}\n</head>`)
    .replace("</main></body></html>", `${APPLE_SCRIPT}\n</main></body></html>`);
}

async function main() {
  const sourcePath = path.join(PROJECT_DIR, SOURCE_NAME);
  const outputPath = path.join(PROJECT_DIR, OUTPUT_NAME);
  const source = await readFile(sourcePath, "utf8");
  const output = buildAppleReferenceGuide(source);

  if (process.argv.includes("--check")) {
    const current = await readFile(outputPath, "utf8").catch(() => null);
    if (current !== output) {
      throw new Error(`Apple-inspired guide is missing or stale: ${outputPath}`);
    }
    console.log(`OK ${OUTPUT_NAME} ${sha256(output)}`);
    return;
  }

  await writeFile(outputPath, output);
  console.log(`WROTE ${outputPath}`);
  console.log(`SOURCE ${SOURCE_SHA256}`);
  console.log(`OUTPUT ${sha256(output)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
