// Snake: eat, grow, don't hit the walls or yourself. Speeds up as you score.
const W = 24, H = 14; // board in cells; each cell is 2 columns wide
// The head has eyes, the body is green, and the tail fades to dark green.
const cell = { head: '\x1b[1;30;102m••\x1b[0m', body: '\x1b[42m  \x1b[0m', tail: '\x1b[48;5;22m  \x1b[0m', food: '\x1b[101m  \x1b[0m', empty: '  ' };
const dirs = {
  up: { x: 0, y: -1 }, w: { x: 0, y: -1 }, k: { x: 0, y: -1 },
  down: { x: 0, y: 1 }, s: { x: 0, y: 1 }, j: { x: 0, y: 1 },
  right: { x: 1, y: 0 }, d: { x: 1, y: 0 }, l: { x: 1, y: 0 },
  left: { x: -1, y: 0 }, a: { x: -1, y: 0 }, h: { x: -1, y: 0 },
};

const rand = (n) => Math.floor(Math.random() * n);
const same = (a, b) => a.x === b.x && a.y === b.y;

function placeFood(s) {
  do s.food = { x: rand(W), y: rand(H) };
  while (s.snake.some((p) => same(p, s.food)));
}

export default {
  id: 'snake',
  name: 'Snake',
  blurb: 'eat, grow, avoid the walls',
  help: 'arrows/wasd move',

  start() {
    const s = { snake: [{ x: 8, y: 7 }, { x: 7, y: 7 }, { x: 6, y: 7 }], dir: dirs.right, next: dirs.right, score: 0, over: false };
    placeFood(s);
    return s;
  },

  tick(s) {
    s.dir = s.next;
    const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };
    const eats = same(head, s.food);
    const body = eats ? s.snake : s.snake.slice(0, -1); // the tail moves out of the way unless we grow
    if (head.x < 0 || head.y < 0 || head.x >= W || head.y >= H || body.some((p) => same(p, head))) {
      s.over = true;
    } else {
      s.snake.unshift(head);
      if (eats) { s.score++; placeFood(s); } else s.snake.pop();
    }
    return Math.max(55, 140 - s.score * 4);
  },

  key(s, k) {
    const d = dirs[k.length === 1 ? k.toLowerCase() : k];
    if (d && (d.x !== -s.dir.x || d.y !== -s.dir.y)) s.next = d; // no turning back into yourself
  },

  draw(s) {
    const rows = [];
    for (let y = 0; y < H; y++) {
      let row = '';
      for (let x = 0; x < W; x++) {
        const p = { x, y };
        const i = s.snake.findIndex((q) => same(q, p));
        row += i === 0 ? cell.head : i === s.snake.length - 1 ? cell.tail : i > 0 ? cell.body : same(s.food, p) ? cell.food : cell.empty;
      }
      rows.push(row);
    }
    return rows;
  },

  score: (s) => s.score,
};
