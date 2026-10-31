// Type racer: developer words fall down the board; type each one before it lands. Three lives.
const W = 48, H = 14;
const WORDS = [
  'async', 'await', 'const', 'return', 'import', 'export', 'null', 'undefined', 'typeof', 'promise',
  'useEffect', 'useState', 'props', 'render', 'callback', 'closure', 'module', 'interface', 'generic', 'enum',
  'git push', 'git pull', 'git rebase', 'git stash', 'commit', 'merge', 'branch', 'diff', 'hotfix', 'revert',
  'npm install', 'package', 'docker', 'deploy', 'kubectl', 'nginx', 'cron', 'redis', 'kafka', 'postgres',
  'SELECT', 'JOIN', 'index', 'schema', 'query', 'cache', 'mutex', 'thread', 'socket', 'webhook',
  'regex', 'lambda', 'array', 'string', 'boolean', 'float', 'pointer', 'stack', 'queue', 'heap',
  'refactor', 'linter', 'debugger', 'segfault', 'timeout', 'retry', 'payload', 'header', 'token', 'sudo',
  'localhost', 'stdout', 'grep', 'chmod', 'ssh', 'curl', 'json', 'yaml', 'binary', 'recursion',
];
const col = { reset: '\x1b[0m', typed: '\x1b[1;32m', word: '\x1b[97m', near: '\x1b[33m', danger: '\x1b[31m', heart: '\x1b[31m', miss: '\x1b[97;41m' };

const rand = (n) => Math.floor(Math.random() * n);

// The lowest word on the board that starts with the given text.
const target = (s, text) => s.words.filter((w) => w.text.startsWith(text)).sort((a, b) => b.y - a.y)[0];

function spawn(s) {
  const text = WORDS[rand(WORDS.length)];
  // Try a few spots that don't overlap a word near the top.
  for (let i = 0; i < 8; i++) {
    const x = rand(W - text.length);
    if (!s.words.some((w) => w.y < 2 && x < w.x + w.text.length + 1 && w.x < x + text.length + 1)) {
      s.words.push({ text, x, y: 0 });
      return;
    }
  }
}

export default {
  id: 'typer',
  name: 'Type racer',
  blurb: 'type the falling code words',
  help: 'type the words · Backspace fixes',

  start() {
    const s = { words: [], typed: '', lives: 3, score: 0, cleared: 0, wait: 0, miss: 0, over: false };
    spawn(s);
    return s;
  },

  tick(s) {
    const speed = 0.06 + s.cleared * 0.004; // rows per tick
    for (const w of s.words) w.y += speed;
    const landed = s.words.filter((w) => w.y >= H);
    if (landed.length) {
      s.words = s.words.filter((w) => w.y < H);
      s.lives -= landed.length;
      if (!target(s, s.typed)) s.typed = '';
      if (s.lives <= 0) { s.lives = 0; s.over = true; }
    }
    if (--s.wait <= 0 || !s.words.length) {
      spawn(s);
      s.wait = Math.max(8, 26 - s.cleared); // ticks until the next word
    }
    if (s.miss) s.miss--;
    return 100;
  },

  key(s, k) {
    if (k === 'backspace') { s.typed = s.typed.slice(0, -1); return; }
    if (k.length !== 1) return;
    const next = s.typed + k;
    const w = target(s, next);
    if (!w) { s.miss = 3; return; } // wrong key: flash, keep what's typed
    if (w.text === next) {
      s.words.splice(s.words.indexOf(w), 1);
      s.score += w.text.length;
      s.cleared++;
      s.typed = '';
    } else s.typed = next;
  },

  draw(s) {
    const rows = Array.from({ length: H }, () => []);
    for (const w of s.words) rows[Math.floor(w.y)].push(w);
    const aim = s.typed && target(s, s.typed);
    return rows.map((list) => {
      let line = '', at = 0;
      for (const w of list.sort((a, b) => a.x - b.x)) {
        if (w.x < at) continue; // a rare overlap: skip drawing it this frame
        const tone = w.y > H - 3 ? col.danger : w.y > H - 6 ? col.near : col.word;
        const done = w === aim ? s.typed.length : 0;
        line += ' '.repeat(w.x - at) + col.typed + w.text.slice(0, done) + tone + w.text.slice(done) + col.reset;
        at = w.x + w.text.length;
      }
      return line;
    });
  },

  score: (s) => s.score,
  status: (s) => `${col.heart}${'♥'.repeat(s.lives)}${col.reset}${'♡'.repeat(3 - s.lives)}   ${s.miss ? col.miss : ''}> ${s.typed}_${col.reset}`,
};
