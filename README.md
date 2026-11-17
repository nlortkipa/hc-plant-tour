# hc-plant-tour

HTML5 cement plant safety tour game for Heidelberg Cement. This MVP is a browser-playable build made with [Phaser 4](https://phaser.io) + [Vite](https://vite.dev). It is not yet packaged as SCORM for Talent LMS (see [Not implemented](#not-implemented-yet)).

## Documentation

- [Game scenario (ქარხნის ტური — თამაშის სცენარი)](docs/game-scenario.md): design spec covering flow, locations, NPCs, mini-missions, scoring, SCORM fields and UI. The original `.docx` is in [`docs/`](docs/).

## Running

```bash
npm install
npm run dev        # dev server with hot reload → http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve the production build → http://localhost:4173
```

The build in `dist/` is fully self-contained. Phaser, the Georgian font (Noto Sans Georgian via `@fontsource`), the art and the audio are all bundled or generated at runtime, so there are no requests to external servers. The asset base is relative (`./`), which means `dist/` can be served from any folder.

## What's in the MVP

### Game flow

1. **Main menu**: new game / continue (progress is saved automatically), settings, help.
2. **Character**: name (printed on the certificate) and one of 4 appearance variants.
3. **Wardrobe**: 11 items (7 correct + 4 wrong: cap, sneakers, sandals, scarf). Items that share a body slot replace each other. The selected PPE is drawn on the character.
4. **KPP / entrance**: the H&S manager checks the equipment. If it is wrong or incomplete, she names each missing or wrong item and explains why, and the player goes back to the wardrobe. Every error costs points. If it is correct, she gives a briefing on plant rules (pedestrian route, no phone near moving machinery, restricted zones, evacuation signal), asks a check question and opens the turnstile.
5. **Eight plant zones** in production order. Each zone unlocks only after the previous one is completed.

| Zone | Manager (NPC) | Mini-mission |
|---|---|---|
| Crushing | crushing area head | **Safe route**: walk to the control room on the green pedestrian path, crossing haul roads only on the zebra at a green pedestrian light, while dump trucks drive and stop at stop lines. Leaving the path, crossing on red or getting near a truck counts as a mistake and resets you to a checkpoint |
| Raw mill | raw mill head | **Spot the moving parts**: click the 4 dangerous rotating/moving zones (animated). Clicking a safe object counts as a mistake |
| Kiln | kiln head | **Situations**: 4 scenario decisions (hot clinker spill, barricaded cyclone cleaning, colleague at the rotating tyre, heat stress) |
| CCR | CCR head | **Alarm simulation**: 4 alarms (fire, evacuation siren, CO gas, injured person on camera), each with a 15 s timer |
| Cement mill | cement mill head | **Match the markings**: CEM I / II / III, 42,5, R, N ↔ meaning |
| Silos | silos/terminal head | **Spot the violations**: no harness at the roof edge, entering a hatch alone, standing under a suspended load, climbing a ladder with hands full (plus 3 correct workers as distractors) |
| Packing & palletizer | packing head | **Pallet**: reject damaged pallets, stack interlocking layers (alternating pattern) up to the height limit, react to a robot-cell jam (LOTO) |
| Logistics | logistics manager | **Truck loading**: pre-loading checklist, balance 6 pallets so the centre of gravity lands in the target zone, secure the load. A **phone-call event** also fires while you walk past moving trucks |

   Every zone follows the scenario's 3-part meeting: a **process** explanation, a **safety rule**, then a **question** followed by the **mini-mission**. Each zone also has **2–3 fact cards** ("i" markers).
   At the entrance of each noisy or dusty zone, **hazard signs** appear and you must choose the right extra PPE (earmuffs / respirator). Missing or unnecessary PPE is a mistake. The chosen PPE is then drawn on the character.
6. **Final test**: 10 questions on production and safety, with option order shuffled and an explanation after each answer.
7. **Results**: score in %, pass/fail, time played, a points bar per zone, and the **most frequent mistake topics**. If you pass, you get a **certificate with a badge** that can be downloaded as PNG. You can retake only the test or restart the whole tour.

### Scoring

All values are configurable in [`src/config.js`](src/config.js).

| Item | Points |
|---|---|
| Wardrobe / PPE check | 10 (−2 per wrong/missing item, accumulated across attempts) |
| KPP rules question | 5 (first answer only) |
| Zone PPE choice (5 hazardous zones) | 4 each (−2 per wrong attempt) |
| Zone question (×8) | 5 (first answer only; wrong answers are explained and re-asked) |
| Mini-mission (×8) | 15 (−3 per mistake) |
| Phone-call event | 5 |
| Final test | 10 × 3 |

The total is normalised to 0–100. The result is **passed** only when all zones are done **and** the score is ≥ `PASS_THRESHOLD` (80%). Replaying a zone does not add points: the first result for each item is kept.

### UI and accessibility

- Top HUD: current location, progress bar, score, and buttons for **map**, **equipment**, **settings** and **help**.
- Dialog window at the bottom with the NPC portrait, name and title, and choice buttons.
- Schematic **plant map** showing completed, available and locked zones. Click a zone to travel there.
- Settings: background music on/off, sound effects on/off, text size (normal/large), text speed (animated/instant). Every dialog is always shown as text.
- **Keyboard**: arrows/WASD to move, `E` to interact, `Space`/`Enter` to advance dialogs, `1–4` to pick answers, `Tab`/arrows + `Enter` for every menu and button, `Esc` to close. Shortcuts: `M` map, `I` equipment, `H`/`F1` help, `P` settings.
- **Touch/mouse**: tap the floor to walk there (hold to steer), tap a person or object to walk up and interact, or use the on-screen "ქმედება" (action) button.
- Scales to any screen with a 16:9 letterbox. The base resolution is 1280×720.

### Content and localisation

All player-facing text lives in **[`src/i18n/ka.js`](src/i18n/ka.js)** (Georgian). Data files only reference ids. To add English, copy `ka.js` to `en.js`, translate the values and register it in [`src/i18n/index.js`](src/i18n/index.js).

## Project structure

```
src/
  main.js              game config, font loading, scene list
  config.js            resolution, colours, scoring, pass threshold
  Router.js            travelling between locations, modal overlays, mission launch/return
  i18n/                t() helper + ka.js (all texts)
  data/                zones (order, NPC, hazards, layouts), PPE, missions, final test (ids + answers only)
  state/               GameState (progress/score/mistakes; pluggable storage adapter), Settings
  audio/Sound.js       Web Audio synthesiser: background music + sound effects (no audio files)
  art/                 procedural Canvas2D art: characters, machines, zone backgrounds, boards, certificate
  ui/                  Button, FocusManager (keyboard nav), DialogBox, QuizCard, Toast, Tile
  world/Player.js      top-down movement (keyboard + tap/hold to walk)
  scenes/              Boot, Menu, Character, Wardrobe, Zone, Hud, Modals, FinalTest, Result
  scenes/missions/     Path, Spot, Decision, Alarm, Match, Pallet, Loading missions
```

For QA, the browser console exposes `window.__state` (progress), `window.__router` (for example `__router.goTo('kiln')`) and `window.__game`.

## Not implemented (yet)

- **SCORM / LMS integration.** There is no `imsmanifest.xml` or zip packaging, and no `cmi.*` communication (`lesson_status`, `score.raw/min/max`, `session_time`, `suspend_data`, `lesson_location`, `interactions`). Progress is saved to the browser's `localStorage` instead. The code is prepared for this:
  - `GameState` uses a storage adapter (`read`/`write`/`clear`), so a SCORM adapter can store the same JSON in `cmi.suspend_data`. SCORM 1.2 limits this to 4096 characters, which the current state fits.
  - `GameState.percent()`, `lessonStatus()` (`incomplete`/`passed`/`failed`), `data.location` and `data.timeMs` map directly to `score.raw`, `lesson_status`, `lesson_location` and `session_time`.
  - Per-question answers (`data.final.answers`, `data.scores`) are ready to report as `cmi.interactions`.
- **Final art and branding.** All graphics are procedurally drawn placeholders (flat vector style). There is no company logo, brand colours or photos (these need approval from the communications team), and the zone layouts are not modelled on the real plant.
- **Real content validation.**
  - NPC names are fictional placeholders.
  - The PPE list, safety rules, questions and facts are drafts written from the scenario and still need sign-off by the H&S department.
  - The zone order and list should be adjusted to the actual plant.
  - The scenario gives no mission for the kiln, so the kiln scenarios are our own proposal.
- **Voice-over and recorded audio.** Music and sound effects are synthesised. There is no recorded voice, so there is no separate subtitles toggle (text is always on).
- **English (or other) translation.** The architecture is ready, but only Georgian is written.
- **Free walking between zones.** Each zone is a separate scene connected by exit gates and the map. There is no continuous plant overworld.
- **Gender selection.** There are 4 appearance variants, but no separate gender option.
- **Admin/analytics report** beyond the in-game "topics to review" list.
- **Screen-reader support.** The game renders to a canvas. Keyboard navigation, text contrast and size options are implemented.
- **Portrait-phone layout.** The game is landscape-only and is letterboxed on portrait screens; there is no "rotate your device" prompt.
- **Automated tests.**
