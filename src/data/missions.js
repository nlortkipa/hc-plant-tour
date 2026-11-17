// Mission content: positions, correct answers and per-item topics. Texts are in i18n `missions.*`.

export const SPOT_SETS = {
  // Raw mill: find moving-part danger zones. Coordinates are for the mission board (1280x720).
  rawmill: {
    board: 'board_rawmill',
    spots: [
      { id: 'tailpulley', x: 214, y: 470, r: 52, hazard: true },
      { id: 'coupling', x: 560, y: 540, r: 50, hazard: true },
      { id: 'chain', x: 905, y: 505, r: 52, hazard: true },
      { id: 'elevator', x: 1095, y: 330, r: 56, hazard: true },
      { id: 'extinguisher', x: 1210, y: 560, r: 40, hazard: false },
      { id: 'panel', x: 350, y: 300, r: 52, hazard: false },
      { id: 'guarded', x: 735, y: 300, r: 50, hazard: false },
      { id: 'stairs', x: 90, y: 250, r: 56, hazard: false },
    ],
  },
  // Silos: spot workers breaking the rules.
  silos: {
    board: 'board_silos',
    spots: [
      { id: 'noharness', x: 208, y: 190, r: 46, hazard: true, topic: 'height' },
      { id: 'alonehatch', x: 690, y: 555, r: 48, hazard: true, topic: 'confined' },
      { id: 'underload', x: 1060, y: 600, r: 50, hazard: true, topic: 'loads' },
      { id: 'ladderhands', x: 455, y: 400, r: 46, hazard: true, topic: 'height' },
      { id: 'harness', x: 840, y: 190, r: 46, hazard: false },
      { id: 'attendant', x: 330, y: 600, r: 48, hazard: false },
      { id: 'walker', x: 860, y: 680, r: 44, hazard: false },
    ],
  },
};

export const DECISIONS = {
  kiln: [
    { id: 'spill', correct: 'b', topic: 'heat' },
    { id: 'barrier', correct: 'c', topic: 'rules' },
    { id: 'colleague', correct: 'a', topic: 'machinery' },
    { id: 'heatstress', correct: 'b', topic: 'heat' },
  ],
};

export const ALARMS = {
  seconds: 15,
  list: [
    { id: 'fire', correct: 'b', kind: 'fire' },
    { id: 'evacuation', correct: 'c', kind: 'siren' },
    { id: 'gas', correct: 'b', kind: 'gas' },
    { id: 'injury', correct: 'a', kind: 'camera' },
  ],
};

export const MATCH_IDS = ['cem1', 'cem2', 'cem3', 's425', 'r', 'n'];

export const PALLET = {
  maxLayers: 6,
  choices: ['broken', 'good', 'block'],
  correctPallet: 'good',
  jam: { options: ['a', 'b', 'c'], correct: 'b' },
};

export const LOADING = {
  checks: [
    { id: 'engine', correct: true },
    { id: 'cab', correct: false },
    { id: 'chocks', correct: true },
    { id: 'skip', correct: false },
    { id: 'driver', correct: true },
  ],
  // Trailer has 2 columns (left/right) x 4 rows (front..rear).
  cols: 2,
  rows: 4,
  pallets: [2, 2, 1, 2, 1, 2], // tonnes, in arrival order
  // Centre of gravity tolerance: lateral in column units (-1..1), longitudinal in row units (0..3).
  target: { lat: 0.25, longMin: 1.1, longMax: 1.9 },
  straps: { options: ['a', 'b', 'c'], correct: 'b' },
};
