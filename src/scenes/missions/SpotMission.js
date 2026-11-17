import Phaser from 'phaser';
import { W, H, CSS, COLORS } from '../../config.js';
import { t } from '../../i18n/index.js';
import { txt, panel } from '../../ui/theme.js';
import { MissionBase } from './MissionBase.js';
import { SPOT_SETS } from '../../data/missions.js';
import { Sound } from '../../audio/Sound.js';

/** A clickable, keyboard-focusable hotspot. */
class Spot extends Phaser.GameObjects.Container {
  constructor(scene, def, onPick) {
    super(scene, def.x, def.y);
    scene.add.existing(this);
    this.def = def;
    this.enabled = true;
    this.onPick = onPick;
    this.state = 'hidden';
    this.ring = scene.add.graphics();
    this.add(this.ring);
    this.setSize(def.r * 2, def.r * 2);
    this.setInteractive(new Phaser.Geom.Circle(def.r, def.r, def.r), Phaser.Geom.Circle.Contains);
    this.input.cursor = 'pointer';
    this.on('pointerup', () => this.activate());
    this.on('pointerover', () => {
      this.hover = true;
      this.redraw();
    });
    this.on('pointerout', () => {
      this.hover = false;
      this.redraw();
    });
    this.setDepth(500);
  }

  redraw() {
    const g = this.ring;
    const r = this.def.r;
    g.clear();
    if (this.state === 'found') {
      g.lineStyle(5, COLORS.good, 1);
      g.strokeCircle(0, 0, r);
      g.fillStyle(COLORS.good, 0.18);
      g.fillCircle(0, 0, r);
    } else if (this.state === 'wrong') {
      g.lineStyle(4, COLORS.bad, 0.9);
      g.strokeCircle(0, 0, r);
      g.lineBetween(-r * 0.5, -r * 0.5, r * 0.5, r * 0.5);
      g.lineBetween(r * 0.5, -r * 0.5, -r * 0.5, r * 0.5);
    } else if (this.hover) {
      g.lineStyle(2, 0xffffff, 0.35);
      g.strokeCircle(0, 0, r);
    }
    if (this.focused) {
      g.lineStyle(3, 0xffffff, 1);
      g.strokeCircle(0, 0, r + 6);
    }
  }

  setFocused(f) {
    this.focused = f;
    this.redraw();
  }

  activate() {
    this.onPick(this);
  }
}

export class SpotMission extends MissionBase {
  constructor() {
    super('SpotMission');
  }

  create() {
    const set = SPOT_SETS[this.cfg.set];
    this.set = set;
    const base = `missions.spot.${this.cfg.set}`;
    this.base = base;
    this.add.image(0, 0, set.board).setOrigin(0).setDepth(-50);
    this.total = set.spots.filter((s) => s.hazard).length;
    this.found = 0;
    this.setupBase(t(`${base}.title`), t(`${base}.goal`, { n: this.total }), { background: false });
    this.counter = txt(this, W - 230, this.mistakeText.y, '', 17, { bold: true, color: CSS.good }).setOrigin(1, 0).setDepth(901);
    this.updateCounter();

    if (this.cfg.set === 'rawmill') this.animateRawmill();

    this.spots = set.spots.map((d) => new Spot(this, d, (s) => this.pick(s)));
    this.focus.push(this.spots, {});

    // info panel (non-interactive, so spots stay clickable beneath)
    this.info = this.add.container(0, 0).setDepth(950).setVisible(false);
    this.infoBg = this.add.graphics();
    this.infoText = txt(this, 40, H - 92, '', 18, { wrap: W - 80, scalable: true });
    this.info.add([this.infoBg, this.infoText]);
  }

  animateRawmill() {
    const spin = (key, x, y, dur) => {
      const img = this.add.image(x, y, key).setDepth(10);
      this.tweens.add({ targets: img, angle: 360, duration: dur, repeat: -1 });
    };
    const belt = this.add.tileSprite(210, 456, 500, 24, 'belt').setOrigin(0).setDepth(9);
    const fn = () => {
      belt.tilePositionX += 2;
    };
    this.events.on('update', fn);
    this.events.once('shutdown', () => this.events.off('update', fn));
    spin('disk_pulley', 214, 468, 900);
    spin('disk_coupling', 560, 542, 500);
    spin('disk_sprocket', 872, 556, 700);
    spin('disk_sprocket', 962, 486, 700);
    // elevator buckets moving inside the open hatch
    for (let i = 0; i < 3; i++) {
      const b = this.add.rectangle(1100, 296, 40, 14, 0x8a8f94).setDepth(10);
      this.tweens.add({ targets: b, y: 374, duration: 1200, repeat: -1, delay: i * 400 });
    }
  }

  updateCounter() {
    this.counter.setText(t('missions.spot.found', { f: this.found, n: this.total }));
  }

  showInfo(name, text, good) {
    const msg = `${name}: ${text}`;
    this.infoText.setText(msg);
    const h = this.infoText.height + 24;
    this.infoText.setY(H - h - 6);
    this.infoBg.clear();
    this.infoBg.fillStyle(0x0d141d, 0.9);
    this.infoBg.fillRoundedRect(20, H - h - 18, W - 40, h + 8, 12);
    this.infoBg.lineStyle(3, good ? COLORS.good : COLORS.bad, 1);
    this.infoBg.strokeRoundedRect(20, H - h - 18, W - 40, h + 8, 12);
    this.info.setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.info);
    this.tweens.add({ targets: this.info, alpha: 0, delay: 5000, duration: 400 });
  }

  pick(spot) {
    if (this.finished || spot.state !== 'hidden') return;
    const d = spot.def;
    const name = t(`${this.base}.spots.${d.id}.name`);
    const text = t(`${this.base}.spots.${d.id}.text`);
    if (d.hazard) {
      spot.state = 'found';
      this.found++;
      Sound.play('correct');
      this.updateCounter();
    } else {
      spot.state = 'wrong';
      this.addMistake(this.cfg.topic);
    }
    spot.redraw();
    this.showInfo(name, text, d.hazard);
    if (this.found === this.total) this.time.delayedCall(1200, () => this.complete());
  }
}
