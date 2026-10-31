// The arcade shell: owns the terminal, the menu, input, the AI banner, pausing and best scores.
// Games only keep their own state and draw their board; see src/games/index.mjs for the game interface.
import fs from 'node:fs';
import { DIR, SIGNAL, BEST, PID } from './paths.mjs';
import { sponsorLine, refreshSponsor } from './sponsor.mjs';

export const color = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m', inverse: '\x1b[7m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  banner: '\x1b[30;103m', alert: '\x1b[97;41m', note: '\x1b[30;47m',
};
const out = process.stdout;

// Visible width of a string, ignoring ANSI colour codes.
export const width = (s) => s.replace(/\x1b\[[0-9;]*m/g, '').length;
export const center = (text, w) => {
  const pad = Math.max(0, w - width(text));
  return ' '.repeat(pad >> 1) + text + ' '.repeat(pad - (pad >> 1));
};
const fit = (s, w) => s + ' '.repeat(Math.max(0, w - width(s)));

// Best scores, one per game.
let best = {};
try { best = JSON.parse(fs.readFileSync(BEST, 'utf8')); } catch {}
function saveBest(game, score) {
  const old = best[game.id];
  const better = old === undefined || (game.better === 'lower' ? score < old : score > old);
  if (!better || (game.better !== 'lower' && score <= 0)) return false;
  best[game.id] = score;
  try { fs.writeFileSync(BEST, JSON.stringify(best)); } catch {}
  return true;
}
const showScore = (game, n) => (n === undefined ? '-' : `${n}${game.unit || ''}`);

// The AI signal: `agent-arcade notify` writes "done" or "ask"; a new mtime means a new event.
const stamp = () => { try { return fs.statSync(SIGNAL).mtimeMs; } catch { return 0; } };
let seen = stamp();
let agent = null; // null | 'done' | 'ask'
let agentAt = 0; // when the banner appeared; keys typed in the next moment were meant for the game
function checkAgent() {
  const t = stamp();
  if (t === seen) return;
  seen = t;
  let kind = 'done';
  try { kind = fs.readFileSync(SIGNAL, 'utf8').trim() === 'ask' ? 'ask' : 'done'; } catch {}
  agent = kind;
  agentAt = Date.now();
  out.write('\x07');
}

// Turns a chunk of terminal input into key names: 'up' 'down' 'left' 'right' 'enter' 'backspace' 'esc' 'focus' 'blur', or a character.
function* keys(data) {
  const seq = { '\x1b[A': 'up', '\x1b[B': 'down', '\x1b[C': 'right', '\x1b[D': 'left', '\x1bOA': 'up', '\x1bOB': 'down', '\x1bOC': 'right', '\x1bOD': 'left', '\x1b[I': 'focus', '\x1b[O': 'blur' };
  for (let i = 0; i < data.length; ) {
    const three = data.slice(i, i + 3);
    if (seq[three]) { yield seq[three]; i += 3; continue; }
    const ch = data[i++];
    if (ch === '\x1b') { if (data[i] === '[' || data[i] === 'O') { i += 2; continue; } yield 'esc'; }
    else if (ch === '\r' || ch === '\n') yield 'enter';
    else if (ch === '\x7f' || ch === '\b') yield 'backspace';
    else if (ch === '\x03') yield 'ctrl-c';
    else yield ch;
  }
}

export function run(games, startId) {
  if (!process.stdin.isTTY) {
    console.error('agent-arcade needs a terminal.');
    process.exit(1);
  }
  fs.mkdirSync(DIR, { recursive: true });

  let mode = 'menu'; // 'menu' | 'play'
  let pick = 0, game = null, state = null;
  let paused = false, over = false, record = false, timer;

  function start(g) {
    game = g;
    state = g.start();
    mode = 'play';
    paused = over = record = false;
    out.write('\x1b[2J');
    loop();
  }

  function toMenu() {
    mode = 'menu';
    game = null;
    clearTimeout(timer);
    out.write('\x1b[2J');
    draw();
  }

  function loop() {
    clearTimeout(timer);
    checkAgent();
    let delay = 200;
    if (mode === 'play' && !paused && !over && !agent) {
      delay = game.tick(state, Date.now());
      if (state.over) {
        over = true;
        record = saveBest(game, game.score(state));
      }
    }
    draw();
    timer = setTimeout(loop, over || paused || agent || mode === 'menu' ? 200 : delay);
  }

  function frame(title, rows, footer, overlay, note) {
    const w = Math.max(...rows.map(width), 40);
    const lines = [title, '┌' + '─'.repeat(w) + '┐'];
    const mid = rows.length >> 1;
    const first = mid - (overlay ? overlay.lines.length >> 1 : 0);
    rows.forEach((r, y) => {
      const o = overlay ? overlay.lines[y - first] : undefined;
      lines.push('│' + (o !== undefined ? overlay.style + center(o, w) + color.reset : fit(r, w)) + '│');
    });
    lines.push('└' + '─'.repeat(w) + '┘', color.dim + footer + color.reset);
    if (out.columns < w + 2 || out.rows < lines.length) {
      out.write(`\x1b[H\x1b[2JMake the window bigger (need ${w + 2}×${lines.length}).`);
      return;
    }
    // Centered in the window, so it sits in the middle of a popup.
    const top = Math.max(0, (out.rows - lines.length) >> 1), left = Math.max(0, (out.columns - w - 2) >> 1);
    out.write(lines.map((l, i) => `\x1b[${top + i + 1};${left + 1}H` + l + '\x1b[0m').join(''));
    // The sponsor line sits under the footer, centered in the window, never wider than it.
    if (note && out.rows > top + lines.length + 1) {
      const text = note.length > out.columns - 2 ? note.slice(0, out.columns - 3) + '…' : note;
      out.write(`\x1b[${top + lines.length + 2};1H\x1b[2K\x1b[${top + lines.length + 2};${Math.max(1, ((out.columns - text.length) >> 1) + 1)}H${color.dim}${text}${color.reset}`);
    }
  }

  function agentOverlay() {
    if (!agent) return null;
    return agent === 'ask'
      ? { style: color.alert, lines: ['', 'Your AI needs your input!', 'q: back to work   c: keep playing', ''] }
      : { style: color.banner, lines: ['', 'Your AI is done!', 'q: back to work   c: keep playing', ''] };
  }

  function draw() {
    if (mode === 'menu') {
      const rows = [''];
      games.forEach((g, i) => {
        const sel = i === pick;
        rows.push(`${sel ? color.inverse : ''} ${sel ? '▶' : ' '} ${fit(g.name, 14)}${color.reset} ${color.dim}${fit(g.blurb, 30)}${color.reset} best ${showScore(g, best[g.id])} `);
      });
      rows.push('');
      while (rows.length < 8) rows.push('');
      frame(`${color.bold} AGENT ARCADE${color.reset}  ${color.dim}play while your AI works${color.reset}`, rows, ' ↑↓ choose · Enter play · q quit', agentOverlay(), sponsorLine());
      return;
    }
    let overlay = agentOverlay();
    const score = game.score(state);
    if (!overlay && over) overlay = { style: color.banner, lines: ['', record ? `New best: ${showScore(game, score)}!` : `Game over: ${showScore(game, score)}`, 'r: again   m: menu   q: quit', ''] };
    else if (!overlay && paused) overlay = { style: color.note, lines: ['', 'Paused', 'Esc: resume   r: restart   m: menu   q: quit', ''] };
    const extra = game.status ? '   ' + game.status(state) : '';
    frame(`${color.bold} ${game.name.toUpperCase()}${color.reset}   score ${color.bold}${showScore(game, score)}${color.reset}   best ${showScore(game, best[game.id])}${extra}`,
      game.draw(state), ` ${game.help} · Esc pause`, overlay, over ? sponsorLine() : null); // never during play
  }

  function quit() {
    clearTimeout(timer);
    out.write('\x1b[0m\x1b[?1004l\x1b[?25h\x1b[?1049l');
    try { fs.unlinkSync(PID); } catch {}
    process.stdin.setRawMode(false);
    process.exit(0);
  }

  function onKey(k) {
    if (k === 'ctrl-c') return quit();
    if (k === 'focus') return;
    if (k === 'blur') { if (mode === 'play' && !over) paused = true; return; } // clicked away: pause
    if (agent) {
      if (Date.now() - agentAt < 700) return;
      if (k === 'q') quit();
      else if (k === 'c' || k === 'esc') { agent = null; if (mode === 'play' && !over) paused = true; }
      else if (k === 'm') { agent = null; toMenu(); }
      return;
    }
    if (mode === 'menu') {
      if (k === 'up' || k === 'k') pick = (pick + games.length - 1) % games.length;
      else if (k === 'down' || k === 'j') pick = (pick + 1) % games.length;
      else if (k === 'enter' || k === ' ') return start(games[pick]);
      else if (k === 'q' || k === 'esc') quit();
      return;
    }
    if (over || paused) {
      if (k === 'r') start(game);
      else if (k === 'm') toMenu();
      else if (k === 'q') quit();
      else if (k === 'esc' && paused) paused = false;
      return;
    }
    if (k === 'esc') paused = true;
    else game.key(state, k);
  }

  out.write('\x1b[?1049h\x1b[?25l\x1b[?1004h\x1b[2J'); // alt screen, no cursor, focus reports (1004)
  refreshSponsor(); // in the background, at most once a day
  fs.writeFileSync(PID, String(process.pid));
  process.stdin.setRawMode(true);
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (data) => {
    for (const k of keys(data)) onKey(k);
    draw();
  });
  out.on('resize', () => { out.write('\x1b[2J'); draw(); });
  process.on('SIGTERM', quit);
  process.on('SIGHUP', quit);

  const g = startId && games.find((x) => x.id === startId);
  if (g) { pick = games.indexOf(g); start(g); } else { draw(); loop(); }
}
