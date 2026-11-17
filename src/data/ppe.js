// Wardrobe items. Texts live in i18n under `ppe.<id>`.
// `slot`: items sharing a slot are mutually exclusive (picking sneakers removes boots).
// `carry`: required to bring along, but only put on in zones whose hazards require it.
export const PPE_ITEMS = [
  { id: 'helmet', required: true, slot: 'head' },
  { id: 'glasses', required: true, slot: 'eyes' },
  { id: 'earmuffs', required: true, slot: 'ears', carry: true },
  { id: 'respirator', required: true, slot: 'mouth', carry: true },
  { id: 'vest', required: true, slot: 'body' },
  { id: 'gloves', required: true, slot: 'hands' },
  { id: 'boots', required: true, slot: 'feet' },
  { id: 'cap', required: false, slot: 'head' },
  { id: 'sneakers', required: false, slot: 'feet' },
  { id: 'sandals', required: false, slot: 'feet' },
  { id: 'scarf', required: false, slot: 'neck' },
];

export const PPE_BY_ID = Object.fromEntries(PPE_ITEMS.map((p) => [p.id, p]));

// Display order in the wardrobe grid (mixed, so correct items are not grouped together).
export const WARDROBE_ORDER = [
  'helmet', 'cap', 'glasses', 'scarf', 'earmuffs', 'vest',
  'sneakers', 'gloves', 'respirator', 'boots', 'sandals',
];

// Which zone hazard requires which carried item.
export const HAZARD_PPE = { noise: 'earmuffs', dust: 'respirator' };

/** Evaluate a wardrobe selection. Returns { ok, missing:[ids], wrong:[ids] }. */
export function checkPpe(selected) {
  const set = new Set(selected);
  const missing = PPE_ITEMS.filter((p) => p.required && !set.has(p.id)).map((p) => p.id);
  const wrong = PPE_ITEMS.filter((p) => !p.required && set.has(p.id)).map((p) => p.id);
  return { ok: missing.length === 0 && wrong.length === 0, missing, wrong };
}
