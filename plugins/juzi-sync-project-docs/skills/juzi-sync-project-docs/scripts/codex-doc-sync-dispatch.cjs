'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const eventIndex = process.argv.indexOf('--event');
const event = eventIndex >= 0 ? process.argv[eventIndex + 1] : '';
const stopEvent = event === 'Stop';

function writeSafeStopResult() {
  if (stopEvent) process.stdout.write('{}');
}

function findEnabledConfig(startDirectory) {
  let directory = path.resolve(startDirectory);
  while (true) {
    const configPath = path.join(directory, '.codex', 'doc-sync.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.enabled === true &&
          Array.isArray(config.behavior_paths) &&
          config.behavior_paths.some((value) => String(value).trim().length > 0);
      } catch {
        return false;
      }
    }

    if (fs.existsSync(path.join(directory, '.git'))) return false;
    const parent = path.dirname(directory);
    if (parent === directory) return false;
    directory = parent;
  }
}

if (!['UserPromptSubmit', 'Stop'].includes(event) || !findEnabledConfig(process.cwd())) {
  writeSafeStopResult();
  process.exit(0);
}

const input = fs.readFileSync(0);
const hookPath = path.join(__dirname, 'codex-doc-sync-hook.ps1');
const result = spawnSync(
  'powershell.exe',
  ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', hookPath, '-Event', event],
  {
    input,
    encoding: 'utf8',
    timeout: stopEvent ? 9000 : 4500,
    windowsHide: true,
  },
);

if (!result.error && result.status === 0) {
  if (result.stdout) process.stdout.write(result.stdout);
  process.exit(0);
}

if (process.env.CODEX_DOC_SYNC_DEBUG === '1') {
  const detail = result.error ? result.error.message : (result.stderr || `exit ${result.status}`);
  process.stderr.write(String(detail));
}
writeSafeStopResult();
