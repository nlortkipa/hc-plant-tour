import { SETTINGS_KEY } from '../config.js';

const DEFAULTS = { music: true, sfx: true, textScale: 1, textSpeed: 'animated' };

let data = { ...DEFAULTS };
try {
  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (raw) data = { ...DEFAULTS, ...JSON.parse(raw) };
} catch (e) {
  /* ignore */
}

const listeners = new Set();

export const Settings = {
  get(key) {
    return data[key];
  },
  set(key, value) {
    data[key] = value;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
    } catch (e) {
      /* ignore */
    }
    for (const fn of listeners) fn(key, value);
  },
  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
