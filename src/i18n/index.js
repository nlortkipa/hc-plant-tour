import ka from './ka.js';

// Register additional locales here, e.g. `import en from './en.js'` and add `en` below.
const LOCALES = { ka };
let current = LOCALES.ka;

export function setLocale(code) {
  if (LOCALES[code]) current = LOCALES[code];
}

export function availableLocales() {
  return Object.keys(LOCALES);
}

function lookup(path) {
  let node = current;
  for (const part of path.split('.')) {
    if (node == null) return undefined;
    node = node[part];
  }
  return node;
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
}

/** Translate a dotted key. Strings are interpolated with {vars}; arrays are interpolated per item;
 *  objects are returned as-is. Missing keys return the key itself so gaps are visible in-game. */
export function t(path, vars) {
  const v = lookup(path);
  if (v === undefined) {
    console.warn('[i18n] missing key', path);
    return path;
  }
  if (typeof v === 'string') return interpolate(v, vars);
  if (Array.isArray(v)) return v.map((s) => (typeof s === 'string' ? interpolate(s, vars) : s));
  return v;
}

/** Same as t() but always returns an array of strings. */
export function tl(path, vars) {
  const v = t(path, vars);
  return Array.isArray(v) ? v : [v];
}

export function has(path) {
  return lookup(path) !== undefined;
}
