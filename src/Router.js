// Scene navigation helpers: travelling between locations, modal overlays and missions.
import { GameState } from './state/GameState.js';
import { Sound } from './audio/Sound.js';

let game = null;
const HUD = 'Hud';

function mgr() {
  return game.scene;
}

function sceneForLocation(loc) {
  if (loc === 'final') return GameState.data.final.done ? ['Result', {}] : ['FinalTest', {}];
  if (loc === 'wardrobe') return ['Wardrobe', {}];
  return ['Zone', { id: loc }];
}

export const Router = {
  init(g) {
    game = g;
  },

  /** Stop everything (except the HUD) and start the scene for a location id. */
  goTo(loc, { hud = true } = {}) {
    const [key, data] = sceneForLocation(loc);
    this.start(key, data, { hud: hud && key !== 'Result' });
  },

  start(key, data = {}, { hud = true } = {}) {
    const m = mgr();
    for (const s of m.getScenes(false)) {
      const k = s.sys.settings.key;
      if (k === HUD) continue;
      if (s.sys.settings.status > 0 && s.sys.settings.status < 8) m.stop(k);
    }
    m.start(key, data);
    if (hud) {
      const h = m.getScene(HUD);
      if (!h || !h.sys.isActive()) {
        if (h && h.sys.isPaused()) m.resume(HUD);
        else m.start(HUD);
      }
      m.bringToTop(HUD);
    } else {
      m.stop(HUD);
    }
  },

  /** Open a modal scene above everything; pauses whatever was running. */
  openModal(key, data = {}) {
    const m = mgr();
    if (m.isActive(key)) return;
    const paused = [];
    for (const s of m.getScenes(true)) {
      const k = s.sys.settings.key;
      if (k === key) continue;
      m.pause(k);
      paused.push(k);
    }
    Sound.play('open');
    m.run(key, { ...data, _paused: paused });
    m.bringToTop(key);
  },

  closeModal(scene) {
    const m = mgr();
    const paused = scene.sys.settings.data?._paused || [];
    Sound.play('close');
    m.stop(scene.sys.settings.key);
    for (const k of paused) if (m.isPaused(k)) m.resume(k);
  },

  /** Launch a mission scene on top of a zone. Resolves with the mission result. */
  runMission(zoneScene, key, data) {
    return new Promise((resolve) => {
      const m = mgr();
      m.run(key, {
        ...data,
        onDone: (result) => {
          m.stop(key);
          if (m.isPaused(zoneScene.sys.settings.key)) m.resume(zoneScene.sys.settings.key);
          resolve(result);
        },
      });
      m.pause(zoneScene.sys.settings.key);
      m.bringToTop(key);
      if (m.getScene(HUD)) m.bringToTop(HUD);
    });
  },
};
