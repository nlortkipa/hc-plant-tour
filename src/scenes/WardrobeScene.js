import Phaser from 'phaser';
import { W, H, HUD_H, CSS, COLORS } from '../config.js';
import { t } from '../i18n/index.js';
import { txt, panel } from '../ui/theme.js';
import { Button } from '../ui/Button.js';
import { FocusManager } from '../ui/Focus.js';
import { GameState } from '../state/GameState.js';
import { PPE_BY_ID, WARDROBE_ORDER } from '../data/ppe.js';
import { playerTexture } from '../art/textures.js';
import { CharAnimator } from '../world/CharAnimator.js';
import { getRenderScale } from '../display.js';

const PREVIEW_SIZE = 4;
const PREVIEW_RES = Math.min(8, Math.ceil(PREVIEW_SIZE * getRenderScale()));
import { Router } from '../Router.js';

class ItemCard extends Phaser.GameObjects.Container {
  constructor(scene, x, y, id, onToggle) {
    super(scene, x, y);
    scene.add.existing(this);
    this.id = id;
    this.enabled = true;
    this.onToggle = onToggle;
    this.bg = scene.add.graphics();
    this.add(this.bg);
    this.add(scene.add.image(0, -22, `ppe_${id}`).setDisplaySize(58, 58));
    this.add(txt(scene, 0, 30, t(`ppe.${id}.name`), 14, { wrap: 160, align: 'center' }).setOrigin(0.5, 0.5));
    this.check = txt(scene, 68, -58, '✓', 22, { bold: true, color: CSS.good }).setOrigin(0.5);
    this.add(this.check);
    this.setSize(180, 140);
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
    this.selected = false;
    this.focused = false;
    this.redraw();
  }

  redraw() {
    const g = this.bg;
    g.clear();
    g.fillStyle(this.selected ? 0x234d3a : this.hover ? 0x2b3a4e : 0x223044, 1);
    g.fillRoundedRect(-90, -70, 180, 140, 12);
    g.lineStyle(this.selected ? 3 : 2, this.selected ? COLORS.good : 0x3d5170, 1);
    g.strokeRoundedRect(-90, -70, 180, 140, 12);
    if (this.focused) {
      g.lineStyle(3, 0xffffff, 1);
      g.strokeRoundedRect(-95, -75, 190, 150, 14);
    }
    this.check.setVisible(this.selected);
  }

  setSelected(s) {
    this.selected = s;
    this.redraw();
  }

  setFocused(f) {
    this.focused = f;
    this.redraw();
  }

  activate() {
    this.onToggle(this.id);
  }
}

export class WardrobeScene extends Phaser.Scene {
  constructor() {
    super('Wardrobe');
  }

  create() {
    this.focus = new FocusManager(this);
    this.cameras.main.setBackgroundColor('#1a222c');
    // room
    const g = this.add.graphics();
    g.fillStyle(0x2a3442, 1);
    g.fillRect(0, HUD_H, W, 260);
    g.fillStyle(0x6b5b4a, 1);
    g.fillRect(0, HUD_H + 260, W, H);
    g.fillStyle(0x4f5d6c, 1);
    for (let i = 0; i < 8; i++) g.fillRoundedRect(20 + i * 160, HUD_H + 30, 140, 220, 6);
    g.fillStyle(0x3d4a58, 1);
    for (let i = 0; i < 8; i++) g.fillRect(88 + i * 160, HUD_H + 40, 4, 200);

    this.selected = new Set(GameState.data.wardrobe || []);

    // character preview
    panel(this, 30, HUD_H + 20, 330, H - HUD_H - 40, { fill: 0x16202c, alpha: 0.96 });
    txt(this, 195, HUD_H + 44, t('wardrobe.preview'), 20, { bold: true, color: CSS.accent }).setOrigin(0.5, 0);
    this.preview = this.add.sprite(195, H - 120, playerTexture(this, GameState.data.avatar, [], 'pose', PREVIEW_RES)).setOrigin(0.5, 1);
    this.previewAnim = new CharAnimator(this.preview, { size: PREVIEW_SIZE, auto: true });
    this.countText = txt(this, 195, H - 100, '', 16, { color: CSS.dim }).setOrigin(0.5, 0);
    this.attemptText = txt(this, 195, H - 74, t('wardrobe.attempts', { n: GameState.data.wardrobeAttempts }), 14, { color: CSS.dim }).setOrigin(0.5, 0);

    // items
    panel(this, 380, HUD_H + 20, W - 410, H - HUD_H - 40, { fill: 0x16202c, alpha: 0.96 });
    txt(this, 404, HUD_H + 36, t('wardrobe.title'), 26, { bold: true, color: CSS.accent });
    txt(this, 404, HUD_H + 76, t('wardrobe.hint'), 16, { wrap: W - 460, color: CSS.dim });
    this.cards = WARDROBE_ORDER.map((id, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      return new ItemCard(this, 500 + col * 196, HUD_H + 220 + row * 150, id, (pid) => this.toggle(pid));
    });
    this.proceedBtn = new Button(this, 500 + 3 * 196, HUD_H + 220 + 2 * 150, t('wardrobe.proceed'), {
      width: 180,
      height: 140,
      size: 19,
      variant: 'primary',
      bold: true,
      onClick: () => this.proceed(),
    });
    this.focus.push([...this.cards, this.proceedBtn], { columns: 4 });
    this.refresh();
  }

  toggle(id) {
    if (this.selected.has(id)) {
      this.selected.delete(id);
    } else {
      const slot = PPE_BY_ID[id].slot;
      for (const other of [...this.selected]) if (PPE_BY_ID[other].slot === slot) this.selected.delete(other);
      this.selected.add(id);
    }
    this.refresh();
  }

  refresh() {
    for (const c of this.cards) c.setSelected(this.selected.has(c.id));
    const old = this.preview.texture.key;
    const key = playerTexture(this, GameState.data.avatar, [...this.selected], 'pose', PREVIEW_RES);
    if (key !== old) {
      this.previewAnim.setTexture(key);
      // these big previews are only needed here; don't let every combination pile up
      this.textures.remove(old);
    }
    this.countText.setText(t('wardrobe.selected', { n: this.selected.size }));
  }

  proceed() {
    GameState.data.wardrobe = [...this.selected];
    GameState.data.wardrobeAttempts += 1;
    GameState.save();
    Router.goTo('kpp');
  }
}
