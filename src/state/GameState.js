// Single source of truth for player progress. Persisted through a pluggable storage adapter
// (localStorage in this MVP). A SCORM adapter would map the same JSON to cmi.suspend_data and
// the derived values (score, status, location, session time) to the matching cmi.* fields.

import { LOCATIONS, TOUR_ZONES, ZONES } from '../data/zones.js';
import { FINAL_QUESTIONS } from '../data/finalTest.js';
import { SCORING, PASS_THRESHOLD, STORAGE_KEY } from '../config.js';

const localStorageAdapter = {
  read() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  write(data) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* storage full or blocked — progress just won't persist */
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
  },
};

const blankZone = () => ({
  ppeDone: false,
  introDone: false,
  questionDone: false,
  missionDone: false,
  eventDone: false,
  facts: [],
});

function freshState() {
  const zones = {};
  for (const id of ['kpp', ...TOUR_ZONES]) zones[id] = blankZone();
  return {
    v: 1,
    name: '',
    avatar: 0,
    wardrobe: [],
    wardrobeAttempts: 0,
    kppCleared: false,
    location: 'kpp',
    zones,
    scores: {}, // key -> earned points (max comes from scoreTable(), keeps suspend_data small)
    mistakes: {}, // topic -> count
    final: { done: false, attempts: 0, answers: {} },
    timeMs: 0,
    startedAt: Date.now(),
    finishedAt: null,
  };
}

/** Maximum points for every scored item, in a stable order. */
export function scoreTable() {
  const rows = [
    { key: 'kpp.ppe', max: SCORING.kppPpe.max, group: 'kpp' },
    { key: 'kpp.question', max: SCORING.kppQuestion.max, group: 'kpp' },
  ];
  for (const id of TOUR_ZONES) {
    const z = ZONES[id];
    if (z.hazards.length) rows.push({ key: `${id}.ppe`, max: SCORING.zonePpe.max, group: id });
    rows.push({ key: `${id}.question`, max: SCORING.zoneQuestion.max, group: id });
    if (z.event) rows.push({ key: `${id}.event`, max: SCORING.event.max, group: id });
    rows.push({ key: `${id}.mission`, max: SCORING.mission.max, group: id });
  }
  for (const q of FINAL_QUESTIONS) rows.push({ key: `final.${q.id}`, max: SCORING.finalQuestion.max, group: 'final' });
  return rows;
}

export const TOTAL_MAX = scoreTable().reduce((s, r) => s + r.max, 0);

class GameStateStore {
  constructor(adapter) {
    this.adapter = adapter;
    this.data = freshState();
    this.listeners = new Set();
  }

  // ---- persistence -------------------------------------------------------
  hasSave() {
    const d = this.adapter.read();
    return !!(d && d.v === 1 && d.name);
  }

  load() {
    const d = this.adapter.read();
    if (d && d.v === 1) {
      const base = freshState();
      this.data = { ...base, ...d, zones: { ...base.zones, ...d.zones }, final: { ...base.final, ...d.final } };
      return true;
    }
    return false;
  }

  save() {
    this.adapter.write(this.data);
    this.emit();
  }

  newGame(keepIdentity = false) {
    const { name, avatar } = this.data;
    this.data = freshState();
    if (keepIdentity) {
      this.data.name = name;
      this.data.avatar = avatar;
    }
    this.save();
  }

  wipe() {
    this.adapter.clear();
    this.data = freshState();
    this.emit();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) fn(this.data);
  }

  // ---- scoring -----------------------------------------------------------
  /** Records points for an item. The first result for a key is kept (replays don't farm points). */
  award(key, earned, max, topic, { overwrite = false } = {}) {
    if (key in this.data.scores && !overwrite) return false;
    this.data.scores[key] = Math.max(0, Math.min(max, Math.round(earned)));
    this.save();
    return true;
  }

  isScored(key) {
    return key in this.data.scores;
  }

  mistake(topic, n = 1) {
    if (!topic || n <= 0) return;
    this.data.mistakes[topic] = (this.data.mistakes[topic] || 0) + n;
    this.save();
  }

  earned() {
    // only count known items, capped at their max (guards against stale or hand-edited saves)
    return scoreTable().reduce((sum, row) => sum + Math.min(row.max, Number(this.data.scores[row.key]) || 0), 0);
  }

  percent() {
    return Math.round((this.earned() / TOTAL_MAX) * 100);
  }

  groupScore(group) {
    let earned = 0;
    let max = 0;
    for (const row of scoreTable()) {
      if (row.group !== group) continue;
      max += row.max;
      earned += Math.min(row.max, Number(this.data.scores[row.key]) || 0);
    }
    return { earned, max };
  }

  topMistakes(limit = 3) {
    return Object.entries(this.data.mistakes)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  resetFinal() {
    for (const q of FINAL_QUESTIONS) delete this.data.scores[`final.${q.id}`];
    this.data.final = { done: false, attempts: this.data.final.attempts, answers: {} };
    this.save();
  }

  // ---- progress ----------------------------------------------------------
  zone(id) {
    if (!this.data.zones[id]) this.data.zones[id] = blankZone();
    return this.data.zones[id];
  }

  isComplete(loc) {
    if (loc === 'kpp') return this.data.kppCleared;
    if (loc === 'final') return this.data.final.done;
    const z = this.data.zones[loc];
    return !!(z && z.missionDone);
  }

  isUnlocked(loc) {
    const i = LOCATIONS.indexOf(loc);
    if (i <= 0) return true;
    return this.isComplete(LOCATIONS[i - 1]);
  }

  allZonesDone() {
    return this.data.kppCleared && TOUR_ZONES.every((id) => this.isComplete(id));
  }

  progress() {
    const done = LOCATIONS.filter((l) => this.isComplete(l)).length;
    return { done, total: LOCATIONS.length };
  }

  setLocation(loc) {
    this.data.location = loc;
    this.save();
  }

  passed() {
    return this.allZonesDone() && this.data.final.done && this.percent() >= PASS_THRESHOLD;
  }

  /** Status as an LMS would see it (cmi.core.lesson_status vocabulary). */
  lessonStatus() {
    if (!this.data.final.done) return 'incomplete';
    return this.passed() ? 'passed' : 'failed';
  }

  addTime(ms) {
    this.data.timeMs += ms;
  }
}

export const GameState = new GameStateStore(localStorageAdapter);
