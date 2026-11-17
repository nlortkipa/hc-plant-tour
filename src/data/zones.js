// Zone (location) definitions: order, NPC, hazards, questions, missions and the layout used to
// paint each scene. All coordinates are screen pixels in the 1280x720 game space (HUD is y < 56).
// Texts for every id here live in i18n under `zones.<zoneId>.*`.

// The game currently consists of the entrance (KPP) only; leaving it through the exit ends the
// game. The other zone definitions below are kept but are not part of the flow.
export const LOCATIONS = ['kpp'];

// Zones that have a manager + mission (none in the current single-level flow).
export const TOUR_ZONES = [];

const WALKWAY = { x: 0, y: 440, w: 1280, h: 70 };
const EXIT = { x: 1236, y: 475 };
const SPAWN = { x: 46, y: 475 };

export const ZONES = {
  kpp: {
    id: 'kpp',
    npc: 'hs',
    hazards: [],
    question: { options: ['a', 'b', 'c'], correct: 'b', topic: 'emergency' },
    layout: {
      floor: 'asphalt',
      backdrop: 'plant',
      walkway: WALKWAY,
      spawn: { x: 225, y: 395 },
      npcPos: { x: 820, y: 470 },
      exit: EXIT,
      wardrobe: { x: 225, y: 352 },
      turnstile: { x: 892, y: 438, w: 36, h: 76 },
      facts: [
        { id: 'assembly', x: 560, y: 690 },
      ],
      props: [
        { type: 'booth', x: 60, y: 120, w: 330, h: 210 },
        { type: 'assembly', x: 520, y: 575, w: 90, h: 95 },
        { type: 'fence', x: 900, y: 160, w: 18, h: 280 },
        { type: 'fence', x: 900, y: 512, w: 18, h: 208 },
        { type: 'parking', x: 60, y: 560, w: 400, h: 150, solid: false },
        { type: 'car', x: 90, y: 600, w: 150, h: 80 },
        { type: 'flagpole', x: 1000, y: 230, w: 40, h: 160 },
        { type: 'planter', x: 1120, y: 560, w: 120, h: 60 },
      ],
    },
  },

  crushing: {
    id: 'crushing',
    npc: 'crushing',
    hazards: ['noise', 'dust'],
    question: { options: ['a', 'b', 'c'], correct: 'b', topic: 'traffic' },
    mission: { scene: 'PathMission', topic: 'traffic' },
    layout: {
      floor: 'gravel',
      backdrop: 'quarry',
      walkway: WALKWAY,
      spawn: SPAWN,
      npcPos: { x: 300, y: 470 },
      exit: EXIT,
      facts: [
        { id: 'crusher', x: 530, y: 352 },
        { id: 'conveyor', x: 870, y: 300 },
        { id: 'stockpile', x: 1150, y: 330 },
      ],
      props: [
        { type: 'road', x: 0, y: 560, w: 1280, h: 150, solid: false },
        { type: 'truck', kind: 'dumper', x: 110, y: 170, w: 250, h: 120 },
        { type: 'crusher', x: 380, y: 92, w: 300, h: 220 },
        { type: 'conveyor', x: 680, y: 196, w: 370, h: 44 },
        { type: 'stockpile', x: 1040, y: 80, w: 230, h: 210 },
        { type: 'rail', x: 0, y: 528, w: 1280, h: 20 },
        { type: 'signpost', hazards: ['noise', 'dust'], x: 10, y: 330, w: 70, h: 100 },
      ],
    },
  },

  rawmill: {
    id: 'rawmill',
    npc: 'rawmill',
    hazards: ['noise', 'dust'],
    question: { options: ['a', 'b', 'c'], correct: 'b', topic: 'machinery' },
    mission: { scene: 'SpotMission', set: 'rawmill', topic: 'machinery' },
    layout: {
      floor: 'concrete',
      backdrop: 'hall',
      walkway: WALKWAY,
      spawn: SPAWN,
      npcPos: { x: 640, y: 470 },
      exit: EXIT,
      facts: [
        { id: 'vrm', x: 425, y: 372 },
        { id: 'homosilo', x: 970, y: 382 },
        { id: 'sampler', x: 1160, y: 372 },
      ],
      props: [
        { type: 'conveyor', x: 30, y: 250, w: 260, h: 40 },
        { type: 'vrm', x: 290, y: 80, w: 270, h: 262 },
        { type: 'elevator', x: 630, y: 70, w: 64, h: 272 },
        { type: 'cabinet', x: 730, y: 250, w: 100, h: 92 },
        { type: 'silo', x: 860, y: 60, w: 220, h: 292, color: '#b9c2cc' },
        { type: 'sampler', x: 1120, y: 262, w: 80, h: 80 },
        { type: 'pallets', x: 160, y: 590, w: 260, h: 90 },
        { type: 'signpost', hazards: ['noise', 'dust'], x: 10, y: 330, w: 70, h: 100 },
      ],
    },
  },

  kiln: {
    id: 'kiln',
    npc: 'kiln',
    hazards: [],
    question: { options: ['a', 'b', 'c'], correct: 'b', topic: 'production' },
    mission: { scene: 'DecisionMission', set: 'kiln', topic: 'heat' },
    layout: {
      floor: 'concrete',
      backdrop: 'sky',
      walkway: WALKWAY,
      spawn: SPAWN,
      npcPos: { x: 520, y: 470 },
      exit: EXIT,
      facts: [
        { id: 'preheater', x: 150, y: 398 },
        { id: 'kiln', x: 700, y: 332 },
        { id: 'cooler', x: 1170, y: 392 },
      ],
      props: [
        { type: 'preheater', x: 30, y: 60, w: 220, h: 300 },
        { type: 'kiln', x: 250, y: 140, w: 880, h: 160 },
        { type: 'cooler', x: 1130, y: 190, w: 140, h: 162 },
        { type: 'hotzone', x: 330, y: 560, w: 420, h: 120 },
        { type: 'water', x: 1060, y: 580, w: 70, h: 90 },
      ],
    },
  },

  ccr: {
    id: 'ccr',
    npc: 'ccr',
    hazards: [],
    question: { options: ['a', 'b', 'c'], correct: 'b', topic: 'production' },
    mission: { scene: 'AlarmMission', topic: 'emergency' },
    layout: {
      floor: 'tiles',
      backdrop: 'room',
      walkway: null,
      spawn: SPAWN,
      npcPos: { x: 640, y: 465 },
      exit: EXIT,
      facts: [
        { id: 'dcs', x: 420, y: 382 },
        { id: 'cameras', x: 860, y: 382 },
        { id: 'alarms', x: 1200, y: 362 },
      ],
      props: [
        { type: 'videowall', x: 140, y: 70, w: 1000, h: 160 },
        { type: 'desk', x: 260, y: 262, w: 760, h: 90 },
        { type: 'rack', x: 1150, y: 120, w: 100, h: 200 },
        { type: 'plant', x: 40, y: 250, w: 60, h: 90 },
        { type: 'plant', x: 60, y: 600, w: 60, h: 90 },
        { type: 'table', x: 760, y: 590, w: 260, h: 90 },
      ],
    },
  },

  cementmill: {
    id: 'cementmill',
    npc: 'cementmill',
    hazards: ['noise', 'dust'],
    question: { options: ['a', 'b', 'c'], correct: 'a', topic: 'production' },
    mission: { scene: 'MatchMission', topic: 'production' },
    layout: {
      floor: 'concrete',
      backdrop: 'hall',
      walkway: WALKWAY,
      spawn: SPAWN,
      npcPos: { x: 380, y: 470 },
      exit: EXIT,
      facts: [
        { id: 'ballmill', x: 560, y: 332 },
        { id: 'separator', x: 910, y: 372 },
        { id: 'additives', x: 1155, y: 362 },
      ],
      props: [
        { type: 'ballmill', x: 200, y: 120, w: 580, h: 172 },
        { type: 'separator', x: 820, y: 70, w: 180, h: 262 },
        { type: 'hoppers', x: 1040, y: 70, w: 230, h: 252 },
        { type: 'hatch', x: 560, y: 590, w: 120, h: 80 },
        { type: 'signpost', hazards: ['noise', 'dust'], x: 10, y: 330, w: 70, h: 100 },
      ],
    },
  },

  silos: {
    id: 'silos',
    npc: 'silos',
    hazards: ['dust'],
    question: { options: ['a', 'b', 'c'], correct: 'b', topic: 'confined' },
    mission: { scene: 'SpotMission', set: 'silos', topic: 'height' },
    layout: {
      floor: 'concrete',
      backdrop: 'sky',
      walkway: WALKWAY,
      spawn: SPAWN,
      npcPos: { x: 520, y: 470 },
      exit: EXIT,
      facts: [
        { id: 'silo', x: 240, y: 382 },
        { id: 'hatch', x: 760, y: 382 },
        { id: 'level', x: 1020, y: 382 },
      ],
      props: [
        { type: 'silo', x: 140, y: 56, w: 200, h: 296, color: '#d5d9de', railing: true },
        { type: 'silo', x: 400, y: 56, w: 200, h: 296, color: '#d5d9de', railing: true },
        { type: 'silo', x: 660, y: 56, w: 200, h: 296, color: '#d5d9de', railing: true, hatch: true },
        { type: 'silo', x: 920, y: 56, w: 200, h: 296, color: '#d5d9de', railing: true },
        { type: 'truck', kind: 'tanker', x: 500, y: 580, w: 360, h: 120 },
        { type: 'signpost', hazards: ['dust'], x: 10, y: 330, w: 70, h: 100 },
      ],
    },
  },

  packing: {
    id: 'packing',
    npc: 'packing',
    hazards: ['noise', 'dust'],
    question: { options: ['a', 'b', 'c'], correct: 'b', topic: 'loads' },
    mission: { scene: 'PalletMission', topic: 'loads' },
    layout: {
      floor: 'concrete',
      backdrop: 'hall',
      walkway: WALKWAY,
      spawn: SPAWN,
      npcPos: { x: 560, y: 470 },
      exit: EXIT,
      facts: [
        { id: 'packer', x: 245, y: 352 },
        { id: 'robot', x: 850, y: 402 },
        { id: 'wrapper', x: 1155, y: 382 },
      ],
      props: [
        { type: 'packer', x: 110, y: 90, w: 260, h: 222 },
        { type: 'conveyor', x: 370, y: 232, w: 300, h: 40 },
        { type: 'robotcell', x: 670, y: 70, w: 360, h: 292 },
        { type: 'wrapper', x: 1060, y: 140, w: 190, h: 202 },
        { type: 'pallets', x: 200, y: 585, w: 320, h: 95 },
        { type: 'signpost', hazards: ['noise', 'dust'], x: 10, y: 330, w: 70, h: 100 },
      ],
    },
  },

  logistics: {
    id: 'logistics',
    npc: 'logistics',
    hazards: [],
    question: { options: ['a', 'b', 'c'], correct: 'c', topic: 'loads' },
    mission: { scene: 'LoadingMission', topic: 'loads' },
    event: { id: 'phone', trigger: { x: 700, y: 430, w: 70, h: 90 }, options: ['a', 'b', 'c'], correct: 'b', topic: 'rules' },
    layout: {
      floor: 'asphalt',
      backdrop: 'sky',
      walkway: WALKWAY,
      spawn: SPAWN,
      npcPos: { x: 300, y: 470 },
      exit: EXIT,
      facts: [
        { id: 'tanker', x: 770, y: 352 },
        { id: 'weighbridge', x: 1060, y: 322 },
        { id: 'forklift', x: 1150, y: 418 },
      ],
      props: [
        { type: 'truck', kind: 'flatbed', x: 50, y: 150, w: 430, h: 170 },
        { type: 'truck', kind: 'tanker', x: 560, y: 150, w: 420, h: 170 },
        { type: 'weighbridge', x: 1000, y: 214, w: 250, h: 80, solid: false },
        { type: 'forklift', x: 1140, y: 316, w: 110, h: 84 },
        { type: 'road', x: 0, y: 560, w: 1280, h: 160, solid: false },
        { type: 'rail', x: 0, y: 526, w: 1280, h: 20 },
      ],
    },
  },
};

export function nextLocation(id) {
  const i = LOCATIONS.indexOf(id);
  return i >= 0 && i < LOCATIONS.length - 1 ? LOCATIONS[i + 1] : null;
}
