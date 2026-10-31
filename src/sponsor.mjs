// The optional sponsor line: "Sponsored · Brand: line → url", shown on the menu and the game-over screen.
// It comes from sponsor.json in the GitHub repo, fetched at most once a day in the background and cached.
// The request carries nothing about the player; an empty or missing file shows nothing.
// `agent-arcade ads off` (or AGENT_ARCADE_ADS=off) turns it off and stops the fetch.
import fs from 'node:fs';
import path from 'node:path';
import { DIR } from './paths.mjs';

const URL = process.env.AGENT_ARCADE_SPONSOR_URL || 'https://raw.githubusercontent.com/Kuldeep-045/agent-arcade/main/sponsor.json';
const CACHE = path.join(DIR, 'sponsor.json');
const CONFIG = path.join(DIR, 'config.json');
const DAY = 24 * 60 * 60 * 1000;

const readJSON = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

export const adsOn = () => process.env.AGENT_ARCADE_ADS !== 'off' && readJSON(CONFIG)?.ads !== false;

export function setAds(on) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(CONFIG, JSON.stringify({ ...(readJSON(CONFIG) || {}), ads: on }));
  if (!on) fs.rmSync(CACHE, { force: true });
}

// Plain printable text only (no escape codes a file could use to mess with the terminal), cut to a length.
const clean = (v, max) => (typeof v === 'string' ? v.replace(/[^\x20-\x7e -￿]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) : '');

function valid(data, now = Date.now()) {
  if (!data || typeof data !== 'object') return null;
  const s = { brand: clean(data.brand, 30), line: clean(data.line, 60), url: clean(data.url, 40) };
  if (!s.brand || !s.line) return null;
  if (data.until && !(Date.parse(data.until) + DAY > now)) return null; // shown through the whole "until" day
  return s;
}

// The line to show now, from the cache; null when there's nothing to show or ads are off.
export function sponsorLine() {
  if (!adsOn()) return null;
  const s = valid(readJSON(CACHE)?.data);
  return s ? `Sponsored · ${s.brand}: ${s.line}${s.url ? ` → ${s.url}` : ''}` : null;
}

// Fetches sponsor.json if the cache is a day old. Never throws; a failure leaves the cache as it was.
export async function refreshSponsor({ force = false } = {}) {
  if (!adsOn()) return;
  const cached = readJSON(CACHE);
  if (!force && cached && Date.now() - cached.fetchedAt < DAY) return;
  try {
    const res = await fetch(URL, { signal: AbortSignal.timeout(4000), headers: { 'user-agent': 'agent-arcade' } });
    const data = res.ok ? JSON.parse((await res.text()).slice(0, 4096)) : res.status === 404 ? {} : null;
    if (data === null) return;
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(CACHE, JSON.stringify({ fetchedAt: Date.now(), data }));
  } catch {}
}
