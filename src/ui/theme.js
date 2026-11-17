import { FONT, CSS, W, H } from '../config.js';
import { getRenderScale } from '../display.js';
import { Settings } from '../state/Settings.js';

/** Create a text object with the game font. `opts.scalable` applies the player's text-size setting. */
export function txt(scene, x, y, str, size = 20, opts = {}) {
  const scale = opts.scalable ? Settings.get('textScale') : 1;
  const style = {
    fontFamily: FONT,
    fontSize: `${Math.round(size * scale)}px`,
    color: opts.color || CSS.text,
    fontStyle: opts.bold ? 'bold' : 'normal',
    align: opts.align || 'left',
    lineSpacing: opts.lineSpacing ?? Math.round(size * 0.25),
    resolution: getRenderScale(),
  };
  if (opts.wrap) style.wordWrap = { width: opts.wrap, useAdvancedWrap: true };
  if (opts.stroke) {
    style.stroke = opts.stroke;
    style.strokeThickness = opts.strokeThickness || 4;
  }
  if (opts.shadow) style.shadow = { offsetX: 0, offsetY: 2, color: '#000', blur: 4, fill: true };
  const t = scene.add.text(x, y, str, style);
  if (opts.origin !== undefined) t.setOrigin(...[].concat(opts.origin));
  return t;
}

/** Rounded panel drawn with Graphics, origin top-left. */
export function panel(scene, x, y, w, h, opts = {}) {
  const g = scene.add.graphics();
  const fill = opts.fill ?? 0x1f2a38;
  const alpha = opts.alpha ?? 0.97;
  const radius = opts.radius ?? 14;
  if (opts.shadow !== false) {
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(x + 4, y + 6, w, h, radius);
  }
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x, y, w, h, radius);
  if (opts.border !== false) {
    g.lineStyle(opts.borderWidth ?? 2, opts.border ?? 0x3d5170, 1);
    g.strokeRoundedRect(x, y, w, h, radius);
  }
  return g;
}

/** Full-screen dimmer that swallows input beneath a modal. */
export function blocker(scene, alpha = 0.6, onClick) {
  const r = scene.add.rectangle(0, 0, W, H, 0x05080c, alpha).setOrigin(0);
  r.setInteractive();
  if (onClick) r.on('pointerdown', onClick);
  return r;
}
