// Global game constants. Gameplay tuning (scoring, pass threshold) lives here so it can be
// adjusted without touching scene code.

export const W = 1280;
export const H = 720;
export const HUD_H = 56;

export const FONT = '"Noto Sans Georgian", "Noto Sans", "Segoe UI", sans-serif';

export const COLORS = {
  bg: 0x121a24,
  panel: 0x1f2a38,
  panelLight: 0x2b3a4e,
  panelBorder: 0x3d5170,
  accent: 0xf2b705, // safety yellow
  accentDark: 0xc79400,
  good: 0x3fb950,
  bad: 0xe5534b,
  info: 0x2f81f7,
  white: 0xffffff,
  locked: 0x56606d,
};

export const CSS = {
  text: '#f0f3f6',
  dim: '#a9b4c2',
  accent: '#f2b705',
  good: '#56d364',
  bad: '#ff7b72',
  dark: '#121a24',
  info: '#79c0ff',
};

// Points for every scored item. Totals are derived from these, so the maximum score is
// known up-front and the final result can be normalised to 0..100.
export const SCORING = {
  kppPpe: { max: 10, perMistake: 2 },
  kppQuestion: { max: 5 },
  zonePpe: { max: 4, perMistake: 2 },
  zoneQuestion: { max: 5 },
  mission: { max: 15, perMistake: 3 },
  event: { max: 5 },
  finalQuestion: { max: 3 },
};

// Final result is "passed" when every zone is complete AND the normalised score >= this.
export const PASS_THRESHOLD = 80;

export const STORAGE_KEY = 'hc-plant-tour.save.v1';
export const SETTINGS_KEY = 'hc-plant-tour.settings.v1';
