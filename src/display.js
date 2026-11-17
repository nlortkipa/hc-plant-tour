// High-DPI rendering.
//
// Scenes are laid out in a fixed W x H coordinate space. If the canvas were W x H pixels the
// browser would stretch it to fit the window, which blurs everything (badly on large or
// high-DPI screens). Instead the canvas is sized to the real number of device pixels it
// covers, and every scene's main camera is zoomed by the same factor so scene code keeps
// working in W x H coordinates. Text is rasterised at that factor too.
import Phaser from 'phaser';
import { W, H } from './config.js';

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
// Snap to multiples of 1/80 so W * scale and H * scale (16:9) are whole pixels.
const SNAP = 80;

let renderScale = computeRenderScale();

function computeRenderScale() {
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min(window.innerWidth / W, window.innerHeight / H);
  const s = Math.round(fit * dpr * SNAP) / SNAP;
  return Phaser.Math.Clamp(s || 1, MIN_SCALE, MAX_SCALE);
}

/** Device pixels per scene unit. */
export function getRenderScale() {
  return renderScale;
}

export function canvasSize() {
  return { width: Math.round(W * renderScale), height: Math.round(H * renderScale) };
}

function fitCamera(scene) {
  const cam = scene.cameras?.main;
  if (!cam) return;
  cam.setSize(scene.scale.width, scene.scale.height);
  cam.setZoom(renderScale);
  cam.centerOn(W / 2, H / 2);
}

function updateTextResolution(list) {
  for (const obj of list) {
    if (obj instanceof Phaser.GameObjects.Text) obj.setResolution(renderScale);
    else if (obj.list) updateTextResolution(obj.list);
  }
}

/** Scene plugin: zooms each scene's camera to the render scale as soon as the scene is created. */
export class HiDpiPlugin extends Phaser.Plugins.ScenePlugin {
  boot() {
    this.systems.events.on(Phaser.Scenes.Events.CREATE, () => fitCamera(this.scene));
  }
}

/** Re-size the canvas when the window size or device pixel ratio changes. */
export function watchResize(game) {
  let pending = 0;
  const apply = () => {
    pending = 0;
    const next = computeRenderScale();
    if (next === renderScale) return;
    renderScale = next;
    const { width, height } = canvasSize();
    game.scale.setGameSize(width, height);
    for (const scene of game.scene.getScenes(false)) {
      const status = scene.sys.settings.status;
      if (status < Phaser.Scenes.START || status > Phaser.Scenes.SLEEPING) continue;
      fitCamera(scene);
      updateTextResolution(scene.children.list);
    }
  };
  const schedule = () => {
    if (!pending) pending = requestAnimationFrame(apply);
  };
  window.addEventListener('resize', schedule);
  // Moving the window to a screen with a different pixel ratio doesn't always fire 'resize'.
  const watchDpr = () => {
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mq.addEventListener('change', () => {
      schedule();
      watchDpr();
    }, { once: true });
  };
  watchDpr();
}
