import Phaser from 'phaser';
import { txt } from './theme.js';

/** Simple rectangular focusable tile (used by mission boards). Origin is the centre. */
export class Tile extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, opts = {}) {
    super(scene, x, y);
    scene.add.existing(this);
    this.w = w;
    this.h = h;
    this.enabled = true;
    this.fill = opts.fill ?? 0x223044;
    this.border = opts.border ?? 0x3d5170;
    this.g = scene.add.graphics();
    this.add(this.g);
    this.label = txt(scene, 0, 0, opts.text || '', opts.size || 18, { bold: true, align: 'center', color: opts.color }).setOrigin(0.5);
    this.add(this.label);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerup', () => this.activate());
    this.on('pointerover', () => {
      this.hover = true;
      this.redraw();
    });
    this.on('pointerout', () => {
      this.hover = false;
      this.redraw();
    });
    this.onClick = opts.onClick || null;
    this.redraw();
  }

  setStyle(fill, border) {
    this.fill = fill;
    if (border !== undefined) this.border = border;
    this.redraw();
    return this;
  }

  redraw() {
    const g = this.g;
    g.clear();
    g.fillStyle(this.fill, this.hover ? 0.85 : 1);
    g.fillRoundedRect(-this.w / 2, -this.h / 2, this.w, this.h, 8);
    g.lineStyle(2, this.border, 1);
    g.strokeRoundedRect(-this.w / 2, -this.h / 2, this.w, this.h, 8);
    if (this.focused) {
      g.lineStyle(3, 0xffffff, 1);
      g.strokeRoundedRect(-this.w / 2 - 4, -this.h / 2 - 4, this.w + 8, this.h + 8, 10);
    }
  }

  setFocused(f) {
    this.focused = f;
    this.redraw();
  }

  activate() {
    if (this.enabled && this.onClick) this.onClick(this);
  }
}
