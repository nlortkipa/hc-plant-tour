// Modal overlay scenes: plant map, settings, help, equipment and confirmation.
import Phaser from 'phaser';
import { W, H, CSS, COLORS, PASS_THRESHOLD } from '../config.js';
import { t, tl } from '../i18n/index.js';
import { txt, panel, blocker } from '../ui/theme.js';
import { Button } from '../ui/Button.js';
import { FocusManager } from '../ui/Focus.js';
import { Router } from '../Router.js';
import { GameState } from '../state/GameState.js';
import { Settings } from '../state/Settings.js';
import { LOCATIONS } from '../data/zones.js';
import { PPE_ITEMS, PPE_BY_ID } from '../data/ppe.js';

class Modal extends Phaser.Scene {
  init(data) {
    this.args = data || {};
  }

  frame(w, h, title) {
    this.focus = new FocusManager(this);
    blocker(this, 0.65);
    const x = (W - w) / 2;
    const y = (H - h) / 2;
    this.box = { x, y, w, h };
    panel(this, x, y, w, h, { fill: 0x16202c, border: 0x4a6386, radius: 18 });
    txt(this, x + 28, y + 22, title, 28, { bold: true, color: CSS.accent });
    this.closeBtn = new Button(this, x + w - 40, y + 38, '✕', { width: 48, height: 44, size: 22, onClick: () => this.close() });
    this.group = this.focus.push([], { onCancel: () => this.close() });
    return this.box;
  }

  addFocus(...items) {
    for (const it of items) this.focus.add(this.group, it);
  }

  close() {
    Router.closeModal(this);
  }
}

// ---------------------------------------------------------------------------- map
class MapNode extends Phaser.GameObjects.Container {
  constructor(scene, x, y, loc, state, here, onPick) {
    super(scene, x, y);
    scene.add.existing(this);
    this.loc = loc;
    this.state = state;
    this.enabled = state !== 'locked';
    this.onPick = onPick;
    const color = { done: COLORS.good, open: COLORS.accent, locked: COLORS.locked }[state];
    this.ring = scene.add.graphics();
    this.add(this.ring);
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.35);
    g.fillCircle(2, 4, 36);
    g.fillStyle(color, 1);
    g.fillCircle(0, 0, 36);
    g.lineStyle(3, 0xffffff, here ? 1 : 0.25);
    g.strokeCircle(0, 0, 36);
    this.add(g);
    const idx = LOCATIONS.indexOf(loc);
    const sym = state === 'done' ? '✓' : idx === LOCATIONS.length - 1 ? '★' : String(idx);
    if (state === 'locked') {
      this.add(scene.add.image(0, 2, 'mk_lock').setDisplaySize(30, 36));
    } else {
      this.add(txt(scene, 0, 0, sym, 30, { bold: true, color: state === 'open' ? CSS.dark : '#fff' }).setOrigin(0.5));
    }
    this.add(txt(scene, 0, 50, t(`locations.${loc}`), 16, { bold: here, color: state === 'locked' ? CSS.dim : CSS.text, wrap: 170, align: 'center' }).setOrigin(0.5, 0));
    if (here) {
      const tag = txt(scene, 0, -62, t('map.here'), 14, { bold: true, color: CSS.accent }).setOrigin(0.5);
      this.add(tag);
      scene.tweens.add({ targets: tag, y: -68, yoyo: true, repeat: -1, duration: 500 });
    }
    this.setSize(110, 110);
    if (this.enabled) {
      this.setInteractive({ useHandCursor: true });
      this.on('pointerup', () => this.activate());
      this.on('pointerover', () => this.setScale(1.06));
      this.on('pointerout', () => this.setScale(1));
    }
  }

  setFocused(f) {
    this.ring.clear();
    if (f) {
      this.ring.lineStyle(4, 0xffffff, 1);
      this.ring.strokeCircle(0, 0, 44);
    }
  }

  activate() {
    if (this.enabled) this.onPick(this.loc);
  }
}

export class MapScene extends Modal {
  constructor() {
    super('Map');
  }

  create() {
    const b = this.frame(1160, 620, t('map.title'));
    const top = [190, 400, 610, 820, 1030];
    const pos = {};
    LOCATIONS.forEach((loc, i) => {
      pos[loc] = i < 5 ? { x: top[i], y: b.y + 190 } : { x: top[9 - i], y: b.y + 420 };
    });
    const g = this.add.graphics();
    for (let i = 0; i < LOCATIONS.length - 1; i++) {
      const a = pos[LOCATIONS[i]];
      const c = pos[LOCATIONS[i + 1]];
      const done = GameState.isComplete(LOCATIONS[i]);
      g.lineStyle(8, done ? COLORS.good : 0x3d5170, done ? 0.8 : 1);
      g.beginPath();
      g.moveTo(a.x, a.y);
      if (a.y !== c.y) {
        g.lineTo(a.x + 70, a.y);
        g.lineTo(a.x + 70, c.y);
      }
      g.lineTo(c.x, c.y);
      g.strokePath();
    }
    const here = GameState.data.location;
    const nodes = LOCATIONS.map((loc) => {
      const state = GameState.isComplete(loc) ? 'done' : GameState.isUnlocked(loc) ? 'open' : 'locked';
      return new MapNode(this, pos[loc].x, pos[loc].y, loc, state, loc === here, (l) => this.travel(l));
    });
    this.addFocus(...nodes, this.closeBtn);
    // legend
    const ly = b.y + b.h - 48;
    [['done', COLORS.good], ['open', COLORS.accent], ['locked', COLORS.locked]].forEach(([k, c], i) => {
      const lg = this.add.graphics();
      lg.fillStyle(c, 1);
      lg.fillCircle(b.x + 44 + i * 190, ly, 10);
      txt(this, b.x + 62 + i * 190, ly, t(`map.${k}`), 16, { color: CSS.dim }).setOrigin(0, 0.5);
    });
    txt(this, b.x + b.w - 28, ly, t('map.hint'), 15, { color: CSS.dim }).setOrigin(1, 0.5);
    txt(this, b.x + 28, b.y + 70, t('map.flow'), 15, { color: CSS.dim });
  }

  travel(loc) {
    if (loc === 'kpp' && !GameState.data.kppCleared && GameState.data.wardrobeAttempts === 0) loc = 'wardrobe';
    Router.goTo(loc);
  }
}

// ---------------------------------------------------------------------------- settings
export class SettingsScene extends Modal {
  constructor() {
    super('Settings');
  }

  create() {
    const b = this.frame(720, 560, t('settings.title'));
    const rows = [
      { key: 'music', label: t('settings.music'), values: [[true, t('settings.on')], [false, t('settings.off')]] },
      { key: 'sfx', label: t('settings.sfx'), values: [[true, t('settings.on')], [false, t('settings.off')]] },
      { key: 'textScale', label: t('settings.textSize'), values: [[1, t('settings.normal')], [1.15, t('settings.large')]] },
      { key: 'textSpeed', label: t('settings.textSpeed'), values: [['animated', t('settings.animated')], ['instant', t('settings.instant')]] },
    ];
    let y = b.y + 110;
    const items = [];
    for (const row of rows) {
      txt(this, b.x + 36, y, row.label, 20).setOrigin(0, 0.5);
      const btns = row.values.map(([val, lab], i) => {
        const btn = new Button(this, b.x + 400 + i * 200, y, lab, { width: 190, height: 46, size: 18 });
        btn.onClick = () => {
          Settings.set(row.key, val);
          btns.forEach((o, j) => o.setVariant(row.values[j][0] === val ? 'selected' : 'secondary'));
        };
        btn.setVariant(Settings.get(row.key) === val ? 'selected' : 'secondary');
        return btn;
      });
      items.push(...btns);
      y += 70;
    }
    txt(this, b.x + 36, y - 10, t('settings.subtitlesNote'), 15, { color: CSS.dim, wrap: b.w - 72 });
    if (GameState.data.name) {
      const reset = new Button(this, b.x + b.w / 2, b.y + b.h - 50, t('settings.reset'), {
        width: 300,
        variant: 'bad',
        size: 17,
        onClick: () =>
          Router.openModal('Confirm', {
            text: t('settings.resetConfirm'),
            onYes: () => {
              GameState.wipe();
              Router.start('Menu', {}, { hud: false });
            },
          }),
      });
      items.push(reset);
    }
    this.addFocus(...items, this.closeBtn);
  }
}

// ---------------------------------------------------------------------------- help
export class HelpScene extends Modal {
  constructor() {
    super('Help');
  }

  create() {
    const b = this.frame(1040, 660, t('help.title'));
    let y = b.y + 76;
    const section = (title, lines) => {
      txt(this, b.x + 32, y, title, 20, { bold: true, color: CSS.accent });
      y += 30;
      for (const line of lines) {
        const tx = txt(this, b.x + 48, y, `•  ${line}`, 16, { wrap: b.w - 90, lineSpacing: 3 });
        y += tx.height + 6;
      }
      y += 8;
    };
    section(t('help.goalTitle'), [t('help.goal', { t: PASS_THRESHOLD })]);
    section(t('help.controlsTitle'), tl('help.controls'));
    section(t('help.iconsTitle'), tl('help.icons'));
    this.addFocus(this.closeBtn);
  }
}

// ---------------------------------------------------------------------------- inventory
export class InventoryScene extends Modal {
  constructor() {
    super('Inventory');
  }

  create() {
    const b = this.frame(760, 560, t('inventory.title'));
    const items = GameState.data.wardrobe;
    if (!items.length) {
      txt(this, b.x + 40, b.y + 110, t('inventory.empty'), 20, { color: CSS.dim });
    }
    const worn = new Set(GameState.worn || []);
    const ordered = PPE_ITEMS.filter((p) => items.includes(p.id));
    ordered.forEach((p, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = b.x + 40 + col * 350;
      const y = b.y + 86 + row * 104;
      panel(this, x, y, 330, 94, { fill: 0x223044, border: 0x3d5170, radius: 12, shadow: false });
      this.add.image(x + 44, y + 47, `ppe_${p.id}`).setDisplaySize(56, 56);
      txt(this, x + 84, y + 8, t(`ppe.${p.id}.name`), 15, { bold: true, wrap: 236, lineSpacing: 2 });
      const carried = PPE_BY_ID[p.id].carry && !worn.has(p.id);
      txt(this, x + 84, y + 80, carried ? t('inventory.carried') : t('inventory.worn'), 13, {
        color: carried ? CSS.dim : CSS.good,
        wrap: 236,
      }).setOrigin(0, 0.5);
    });
    this.addFocus(this.closeBtn);
  }
}

// ---------------------------------------------------------------------------- confirm
export class ConfirmScene extends Modal {
  constructor() {
    super('Confirm');
  }

  create() {
    const b = this.frame(620, 280, '');
    txt(this, W / 2, b.y + 100, this.args.text || '', 21, { wrap: 540, align: 'center' }).setOrigin(0.5);
    const yes = new Button(this, W / 2 - 110, b.y + b.h - 60, t('ui.yes'), {
      width: 190,
      variant: 'primary',
      onClick: () => {
        const cb = this.args.onYes;
        this.close();
        if (cb) cb();
      },
    });
    const no = new Button(this, W / 2 + 110, b.y + b.h - 60, t('ui.no'), { width: 190, onClick: () => this.close() });
    this.addFocus(yes, no, this.closeBtn);
  }
}
