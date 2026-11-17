import Phaser from 'phaser';
import { COLORS, CSS } from '../config.js';
import { txt } from './theme.js';
import { Sound } from '../audio/Sound.js';

const VARIANTS = {
  primary: { fill: COLORS.accent, hover: 0xffcc33, text: CSS.dark, border: COLORS.accentDark },
  secondary: { fill: COLORS.panelLight, hover: 0x38506b, text: CSS.text, border: COLORS.panelBorder },
  choice: { fill: 0x26364a, hover: 0x33506e, text: CSS.text, border: 0x4a6386 },
  good: { fill: 0x1f6f3a, hover: 0x26864a, text: CSS.text, border: COLORS.good },
  bad: { fill: 0x7a2420, hover: 0x8f2c27, text: CSS.text, border: COLORS.bad },
  selected: { fill: 0x2d5a8a, hover: 0x356aa1, text: CSS.text, border: COLORS.info },
  ghost: { fill: 0x000000, hover: 0x1f2a38, text: CSS.text, border: 0x3d5170, alpha: 0.35 },
};

/**
 * Clickable, keyboard-focusable button. Position is the button centre.
 * opts: { width, height, size, variant, icon, iconSize, align, wrap, onClick, sound }
 */
export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, label, opts = {}) {
    super(scene, x, y);
    scene.add.existing(this);
    this.opts = { width: 260, height: 0, size: 20, variant: 'secondary', align: 'center', sound: 'click', ...opts };
    this.enabled = true;
    this.focused = false;
    this.hovered = false;
    this.variant = this.opts.variant;
    this.onClick = opts.onClick || null;

    this.bg = scene.add.graphics();
    this.add(this.bg);
    const pad = 18;
    const iconW = this.opts.icon ? (this.opts.iconSize || 40) + 12 : 0;
    const textWidth = this.opts.width - pad * 2 - iconW;
    this.label = txt(scene, 0, 0, label, this.opts.size, {
      wrap: textWidth > 60 ? textWidth : undefined,
      align: this.opts.align,
      bold: this.opts.bold,
      scalable: this.opts.scalable,
    });
    const h = Math.max(this.opts.height, this.label.height + 22);
    this.w = this.opts.width;
    this.h = h;
    if (this.opts.align === 'left') {
      this.label.setOrigin(0, 0.5).setPosition(-this.w / 2 + pad + iconW, 0);
    } else {
      this.label.setOrigin(0.5).setPosition(iconW / 2, 0);
    }
    this.add(this.label);
    if (this.opts.icon) {
      const is = this.opts.iconSize || 40;
      this.icon = scene.add.image(-this.w / 2 + pad + is / 2, 0, this.opts.icon).setDisplaySize(is, is);
      this.add(this.icon);
    }
    if (this.opts.badge) {
      this.badge = txt(scene, this.w / 2 - 14, 0, this.opts.badge, 18, { bold: true }).setOrigin(1, 0.5);
      this.add(this.badge);
    }

    this.setSize(this.w, this.h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => {
      this.hovered = true;
      this.redraw();
    });
    this.on('pointerout', () => {
      this.hovered = false;
      this.redraw();
    });
    this.on('pointerup', (pointer) => {
      if (pointer && pointer.wasCanceled) return;
      this.activate();
    });
    this.redraw();
  }

  activate() {
    if (!this.enabled || !this.visible) return;
    if (this.opts.sound) Sound.play(this.opts.sound);
    this.scene.tweens.add({ targets: this, scale: { from: 0.96, to: 1 }, duration: 120 });
    if (this.onClick) this.onClick(this);
  }

  setFocused(f) {
    this.focused = f;
    this.redraw();
    return this;
  }

  setEnabled(e) {
    this.enabled = e;
    this.setAlpha(e ? 1 : 0.45);
    if (this.input) this.input.cursor = e ? 'pointer' : 'default';
    this.redraw();
    return this;
  }

  setVariant(v) {
    this.variant = v;
    this.redraw();
    return this;
  }

  setBadge(str, color) {
    if (this.badge) {
      this.badge.setText(str);
      if (color) this.badge.setColor(color);
    }
    return this;
  }

  setText(str) {
    this.label.setText(str);
    return this;
  }

  redraw() {
    const v = VARIANTS[this.variant] || VARIANTS.secondary;
    const g = this.bg;
    g.clear();
    const hot = (this.hovered || this.focused) && this.enabled;
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(-this.w / 2 + 2, -this.h / 2 + 4, this.w, this.h, 10);
    g.fillStyle(hot ? v.hover : v.fill, v.alpha ?? 1);
    g.fillRoundedRect(-this.w / 2, -this.h / 2, this.w, this.h, 10);
    g.lineStyle(2, v.border, 1);
    g.strokeRoundedRect(-this.w / 2, -this.h / 2, this.w, this.h, 10);
    if (this.focused) {
      g.lineStyle(3, 0xffffff, 1);
      g.strokeRoundedRect(-this.w / 2 - 5, -this.h / 2 - 5, this.w + 10, this.h + 10, 13);
    }
    this.label.setColor(v.text);
  }
}

/** Small square icon button (HUD). */
export class IconButton extends Button {
  constructor(scene, x, y, iconKey, opts = {}) {
    super(scene, x, y, '', { width: 44, height: 40, variant: 'ghost', ...opts });
    this.img = scene.add.image(0, 0, iconKey).setDisplaySize(26, 26);
    this.add(this.img);
  }
}
