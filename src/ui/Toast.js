import { W, HUD_H, CSS } from '../config.js';
import { txt, panel } from './theme.js';

/** Small floating notification under the HUD. kind: 'good' | 'bad' | 'info' */
export function toast(scene, message, kind = 'info', duration = 1800) {
  const color = { good: CSS.good, bad: CSS.bad, info: CSS.text, accent: CSS.accent }[kind] || CSS.text;
  const border = { good: 0x3fb950, bad: 0xe5534b, info: 0x4a6386, accent: 0xf2b705 }[kind] || 0x4a6386;
  scene.__toastY = scene.__toastY || 0;
  const container = scene.add.container(W / 2, HUD_H + 34 + scene.__toastY).setDepth(5000);
  const label = txt(scene, 0, 0, message, 19, { bold: true, color, wrap: 760, align: 'center' }).setOrigin(0.5);
  const w = Math.min(820, label.width + 44);
  const h = label.height + 20;
  const bg = panel(scene, -w / 2, -h / 2, w, h, { fill: 0x121a24, border, radius: 12 });
  container.add([bg, label]);
  container.setAlpha(0);
  scene.__toastY += h + 8;
  scene.tweens.add({
    targets: container,
    alpha: 1,
    y: '+=6',
    duration: 180,
    onComplete: () => {
      scene.time.delayedCall(duration, () => {
        scene.tweens.add({
          targets: container,
          alpha: 0,
          duration: 250,
          onComplete: () => {
            container.destroy();
            scene.__toastY = Math.max(0, scene.__toastY - (h + 8));
          },
        });
      });
    },
  });
  return container;
}

/** Floating "+N" text rising from a world position. */
export function floatText(scene, x, y, message, color = CSS.good) {
  const t = txt(scene, x, y, message, 22, { bold: true, color, stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(5000);
  scene.tweens.add({ targets: t, y: y - 50, alpha: { from: 1, to: 0 }, duration: 1200, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
}

