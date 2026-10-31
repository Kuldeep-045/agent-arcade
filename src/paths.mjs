// Where agent-arcade keeps its few files: best scores, the AI signal, and the pid of a running game.
import os from 'node:os';
import path from 'node:path';

export const DIR = path.join(os.homedir(), '.agent-arcade');
export const SIGNAL = path.join(DIR, 'signal');
export const BEST = path.join(DIR, 'best.json');
export const PID = path.join(DIR, 'pid');
