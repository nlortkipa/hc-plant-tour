// SCORM 1.2 connection. When the game runs inside an LMS (e.g. TalentLMS), the LMS provides a
// JavaScript object called `API` on a parent or opener window. We find it, open a session, and
// report progress through the cmi.* data model. Outside an LMS (npm run dev, a plain web host)
// `connect()` returns null and the game falls back to localStorage.

const SUSPEND_DATA_LIMIT = 4096; // SCORM 1.2 maximum for cmi.suspend_data
const COMMIT_DELAY_MS = 2000; // batch frequent saves into one LMS round-trip

function findApiIn(win) {
  // The API may sit several frames up; the spec caps the search depth at a sane number.
  for (let depth = 0; win && depth < 10; depth++) {
    try {
      if (win.API) return win.API;
      if (win.parent === win) break;
      win = win.parent;
    } catch (e) {
      break; // cross-origin frame — can't look further
    }
  }
  return null;
}

function findApi() {
  const api = findApiIn(window);
  if (api) return api;
  try {
    if (window.opener) return findApiIn(window.opener);
  } catch (e) {
    /* opener is cross-origin */
  }
  return null;
}

/** Milliseconds -> SCORM 1.2 CMITimespan (HHHH:MM:SS.SS). */
function timespan(ms) {
  const totalCs = Math.max(0, Math.round(ms / 10));
  const h = Math.min(9999, Math.floor(totalCs / 360000));
  const m = Math.floor((totalCs % 360000) / 6000);
  const s = Math.floor((totalCs % 6000) / 100);
  const cs = totalCs % 100;
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(h, 4)}:${pad(m)}:${pad(s)}.${pad(cs)}`;
}

class ScormSession {
  constructor(api) {
    this.api = api;
    this.startedAt = Date.now();
    this.commitTimer = null;
    this.finished = false;
    this.last = {}; // last value sent per element, to skip redundant calls
    // A learner who already passed keeps "passed" even if they replay the course for practice.
    const status = this.get('cmi.core.lesson_status');
    this.alreadyPassed = status === 'passed' || status === 'completed';
    if (status === 'not attempted' || status === '') this.set('cmi.core.lesson_status', 'incomplete');
    this.set('cmi.core.score.min', '0');
    this.set('cmi.core.score.max', '100');
    this.commit();

    const end = () => this.finish();
    window.addEventListener('pagehide', end);
    window.addEventListener('beforeunload', end);
  }

  get(el) {
    try {
      return String(this.api.LMSGetValue(el) ?? '');
    } catch (e) {
      return '';
    }
  }

  set(el, value) {
    if (this.finished) return;
    const v = String(value);
    if (this.last[el] === v) return;
    try {
      if (String(this.api.LMSSetValue(el, v)) === 'true') this.last[el] = v;
      else console.warn(`[SCORM] LMSSetValue(${el}) failed: ${this.errorText()}`);
    } catch (e) {
      console.warn(`[SCORM] LMSSetValue(${el}) threw`, e);
    }
  }

  errorText() {
    try {
      const code = this.api.LMSGetLastError();
      return `${code} ${this.api.LMSGetErrorString(code)}`;
    } catch (e) {
      return 'unknown';
    }
  }

  commit() {
    if (this.finished) return;
    clearTimeout(this.commitTimer);
    this.commitTimer = null;
    this.set('cmi.core.session_time', timespan(Date.now() - this.startedAt));
    try {
      this.api.LMSCommit('');
    } catch (e) {
      console.warn('[SCORM] LMSCommit threw', e);
    }
  }

  scheduleCommit() {
    if (!this.commitTimer) this.commitTimer = setTimeout(() => this.commit(), COMMIT_DELAY_MS);
  }

  finish() {
    if (this.finished) return;
    this.commit();
    this.finished = true;
    try {
      this.api.LMSFinish('');
    } catch (e) {
      /* window is closing anyway */
    }
  }

  // ---- storage adapter interface used by GameState ----------------------
  read() {
    const raw = this.get('cmi.suspend_data');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  write(data) {
    const json = JSON.stringify(data);
    if (json.length > SUSPEND_DATA_LIMIT) {
      console.warn(`[SCORM] save is ${json.length} chars, over the ${SUSPEND_DATA_LIMIT} limit; progress not stored`);
    } else {
      this.set('cmi.suspend_data', json);
    }
    this.scheduleCommit();
  }

  clear() {
    this.set('cmi.suspend_data', '');
    this.scheduleCommit();
  }

  /** Pushes the derived results (status, score, location) to the LMS. */
  report(state) {
    this.set('cmi.core.lesson_location', state.data.location || '');
    const status = state.lessonStatus();
    if (this.alreadyPassed) {
      this.set('cmi.core.exit', '');
      return;
    }
    if (status !== 'incomplete') {
      // Only report a score once the final test is done, so the LMS never records a partial score.
      this.set('cmi.core.score.raw', String(state.percent()));
      if (status === 'passed') this.alreadyPassed = true;
    }
    this.set('cmi.core.lesson_status', status);
    // "suspend" tells the LMS to keep suspend_data so the learner resumes where they left off.
    this.set('cmi.core.exit', status === 'passed' ? '' : 'suspend');
  }
}

/** Opens an LMS session if the game was launched from one; otherwise returns null. */
export function connect() {
  const api = findApi();
  if (!api) return null;
  try {
    if (String(api.LMSInitialize('')) !== 'true') {
      console.warn('[SCORM] LMSInitialize failed; falling back to local storage');
      return null;
    }
  } catch (e) {
    console.warn('[SCORM] LMSInitialize threw; falling back to local storage', e);
    return null;
  }
  return new ScormSession(api);
}
