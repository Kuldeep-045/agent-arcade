// `agent-arcade setup`: lets Claude Code and Codex tell the arcade when they finish or need you,
// and adds a /arcade command to Claude Code. `--uninstall` takes all of it back out.
// Each file is backed up once (as <file>.agent-arcade.bak) before the first change.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();
const CLAUDE_SETTINGS = path.join(HOME, '.claude', 'settings.json');
const CLAUDE_COMMAND = path.join(HOME, '.claude', 'commands', 'arcade.md');
const CODEX_CONFIG = path.join(HOME, '.codex', 'config.toml');
const MARK = 'agent-arcade';

const q = (s) => (/[\s"']/.test(s) ? JSON.stringify(s) : s);
// The node on PATH (e.g. /opt/homebrew/bin/node) survives node upgrades; process.execPath points into a versioned folder.
const NODE = (process.env.PATH || '').split(path.delimiter).map((d) => path.join(d, 'node')).find((f) => fs.existsSync(f)) || process.execPath;

function backup(file) {
  const bak = `${file}.${MARK}.bak`;
  if (fs.existsSync(file) && !fs.existsSync(bak)) fs.copyFileSync(file, bak);
}

function claude(cli, remove) {
  if (!fs.existsSync(path.dirname(CLAUDE_SETTINGS))) return 'Claude Code: not found, skipped';
  let s = {};
  try { s = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS, 'utf8')); } catch (e) {
    if (fs.existsSync(CLAUDE_SETTINGS)) return `Claude Code: couldn't read ${CLAUDE_SETTINGS} (${e.message}), skipped`;
  }
  backup(CLAUDE_SETTINGS);
  s.hooks ||= {};
  for (const [event, kind] of [['Stop', 'done'], ['Notification', 'ask']]) {
    const list = (s.hooks[event] || []).filter((h) => !JSON.stringify(h).includes(MARK));
    if (!remove) list.push({ hooks: [{ type: 'command', command: `${q(NODE)} ${q(cli)} notify ${kind}` }] });
    if (list.length) s.hooks[event] = list; else delete s.hooks[event];
  }
  if (!Object.keys(s.hooks).length) delete s.hooks;
  fs.writeFileSync(CLAUDE_SETTINGS, JSON.stringify(s, null, 2) + '\n');

  if (remove) fs.rmSync(CLAUDE_COMMAND, { force: true });
  else {
    fs.mkdirSync(path.dirname(CLAUDE_COMMAND), { recursive: true });
    const popup = `${q(NODE)} ${q(cli)} popup`;
    fs.writeFileSync(CLAUDE_COMMAND, `---
description: Open Agent Arcade beside this chat, to play while Claude works
allowed-tools: Bash(${popup})
---
Run \`${popup}\` with the Bash tool, then reply in one short line using the line it prints. Do nothing else.
`);
  }
  return remove ? 'Claude Code: hooks and /arcade removed' : 'Claude Code: hooks added (finished → "done", waiting for you → "ask"), /arcade command added';
}

function codex(cli, remove) {
  if (!fs.existsSync(path.dirname(CODEX_CONFIG))) return 'Codex: not found, skipped';
  const text = fs.existsSync(CODEX_CONFIG) ? fs.readFileSync(CODEX_CONFIG, 'utf8') : '';
  const lines = text.split('\n');
  const ours = (l) => /^notify\s*=/.test(l) && l.includes(MARK);
  if (remove) {
    if (!lines.some(ours)) return 'Codex: nothing to remove';
    fs.writeFileSync(CODEX_CONFIG, lines.filter((l) => !ours(l)).join('\n'));
    return 'Codex: notify removed';
  }
  if (lines.some(ours)) return 'Codex: already set up';
  if (lines.some((l) => /^notify\s*=/.test(l))) return 'Codex: you already have a notify program, left it alone';
  backup(CODEX_CONFIG);
  // notify must be a top-level key, so it goes above the first [table].
  fs.writeFileSync(CODEX_CONFIG, `notify = ${JSON.stringify([NODE, cli, 'notify'])}\n` + text);
  return 'Codex: notify added (each finished turn → "done")';
}

export function setup(cli, { remove = false } = {}) {
  if (!remove && cli.includes(`${path.sep}_npx${path.sep}`)) {
    console.log('Install it first so the hooks keep working:  npm install -g agent-arcade  then run  agent-arcade setup');
    process.exit(1);
  }
  console.log(claude(cli, remove));
  console.log(codex(cli, remove));
  console.log(remove ? 'Done. Your best scores are still in ~/.agent-arcade.' : 'Done. New Claude Code / Codex sessions will ping the arcade. Play with: agent-arcade');
}
