#!/usr/bin/env node
// agent-arcade: small terminal games to play while your AI coding agent works.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import games from '../src/games/index.mjs';
import { DIR, SIGNAL } from '../src/paths.mjs';

const CLI = fs.realpathSync(fileURLToPath(import.meta.url));
const [cmd, arg] = process.argv.slice(2);

const HELP = `agent-arcade: play small games in your terminal while your AI agent works.

  agent-arcade               open the menu
  agent-arcade <game>        play a game directly (${games.map((g) => g.id).join(', ')})
  agent-arcade setup         connect Claude Code and Codex, so a banner shows when they finish
  agent-arcade setup --uninstall
  agent-arcade popup         open the arcade beside the current terminal (used by /arcade)
  agent-arcade notify [ask]  tell the arcade your agent is done (or needs you); for other agents' hooks

In a game: Esc pauses, q quits from the pause screen. Best scores live in ~/.agent-arcade.`;

if (!cmd) (await import('../src/shell.mjs')).run(games);
else if (cmd === 'help' || cmd === '--help' || cmd === '-h') console.log(HELP);
else if (cmd === '--version' || cmd === '-v') console.log(JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url))).version);
else if (cmd === 'setup') (await import('../src/setup.mjs')).setup(CLI, { remove: arg === '--uninstall' });
else if (cmd === 'popup') console.log((await import('../src/popup.mjs')).popup(CLI));
else if (cmd === 'notify') {
  // Codex passes a JSON blob as the argument, which counts as "done".
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(SIGNAL, arg === 'ask' ? 'ask\n' : 'done\n');
} else if (games.some((g) => g.id === cmd)) (await import('../src/shell.mjs')).run(games, cmd);
else {
  console.error(`Unknown command: ${cmd}\n\n${HELP}`);
  process.exit(1);
}
