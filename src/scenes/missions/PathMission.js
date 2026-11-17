import Phaser from 'phaser';
import { W, H, HUD_H, CSS, COLORS } from '../../config.js';
import { t } from '../../i18n/index.js';
import { txt } from '../../ui/theme.js';
import { MissionBase } from './MissionBase.js';
import { Player } from '../../world/Player.js';
import { GameState } from '../../state/GameState.js';
import { playerTexture } from '../../art/textures.js';
import { PPE_BY_ID } from '../../data/ppe.js';
import { Sound } from '../../audio/Sound.js';

// Must match pathBoard() in art/textures.js
const WALK = [
  { x: 40, y: 620, w: 200, h: 80 },
  { x: 160, y: 460, w: 80, h: 240 },
  { x: 160, y: 290, w: 80, h: 90 },
  { x: 160, y: 290, w: 840, h: 80 },
  { x: 920, y: 240, w: 80, h: 130 },
  { x: 880, y: 70, w: 180, h: 90 },
];
const GOAL = { x: 880, y: 70, w: 180, h: 90 };
const CROSSINGS = [
  { x: 160, y: 380, w: 80, h: 80, lane: 0, signal: { x: 128, y: 500 } },
  { x: 920, y: 160, w: 80, h: 80, lane: 1, signal: { x: 1032, y: 268 } },
];
const LANES = [
  { y: 420, dir: 1, key: 'truck_dumper_r', stopX: 138 }, // road 1, moving right, stops before x=138
  { y: 200, dir: -1, key: 'truck_dumper_l', stopX: 1022 }, // road 2, moving left, stops after x=1022
];
const TRUCK_SPEED = 170;
const CHECKPOINTS = [
  { x: 150, y: 668 },
  { x: 230, y: 336 },
  { x: 960, y: 320 },
];

const inRect = (r, x, y, pad = 0) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;

export class PathMission extends MissionBase {
  constructor() {
    super('PathMission');
  }

  create() {
    this.add.image(0, 0, 'board_path').setOrigin(0).setDepth(-50);
    this.setupBase(t('missions.path.title'), t('missions.path.goal'), { background: false, headerX: 520, headerY: H - 130, headerW: 748 });
    this.physics.world.setBounds(0, HUD_H, W, H - HUD_H);

    // goal marker
    const arrow = this.add.image(GOAL.x + GOAL.w / 2, GOAL.y + 50, 'mk_exit').setDepth(800);
    this.tweens.add({ targets: arrow, y: arrow.y - 8, yoyo: true, repeat: -1, duration: 500 });
    txt(this, GOAL.x + GOAL.w / 2, GOAL.y + 6, t('missions.path.goalLabel'), 14, { bold: true, color: CSS.dark }).setOrigin(0.5, 0).setDepth(800);

    // crossings + signals
    this.crossings = CROSSINGS.map((c, i) => {
      const g = this.add.graphics().setDepth(700);
      return { ...c, state: 'red', timer: 2500 + i * 3000, gfx: g };
    });

    // trucks
    this.trucks = [];
    LANES.forEach((lane, li) => {
      for (let k = 0; k < 2; k++) {
        const startX = lane.dir > 0 ? -150 - k * 700 : W + 150 + k * 700;
        const s = this.add.image(startX, lane.y + 38, lane.key).setOrigin(0.5, 1).setDepth(lane.y + 38);
        this.trucks.push({ sprite: s, lane: li, speed: TRUCK_SPEED });
      }
    });

    const items = (GameState.data.wardrobe || []).filter((id) => !PPE_BY_ID[id]?.carry).concat(['earmuffs', 'respirator']);
    this.player = new Player(this, CHECKPOINTS[0].x, CHECKPOINTS[0].y, playerTexture(this, GameState.data.avatar, items), { dust: true });
    this.stage = 0;
    this.invuln = 0;

    this.input.on('pointerdown', (p, over) => {
      if (this.finished || over.length) return;
      this.dragWalk = true;
      this.player.walkTo(p.worldX, p.worldY);
    });
    this.input.on('pointermove', (p) => {
      if (p.isDown && this.dragWalk && !this.finished) this.player.walkTo(p.worldX, p.worldY);
    });
    this.input.on('pointerup', () => {
      this.dragWalk = false;
    });
    this.flash = this.add.rectangle(0, 0, W, H, 0xe5534b, 0).setOrigin(0).setDepth(1400);
  }

  crossingOccupied(c) {
    return inRect(c, this.player.x, this.player.y, 4);
  }

  updateSignals(delta) {
    for (const c of this.crossings) {
      c.timer -= delta;
      if (c.state === 'red' && c.timer <= 0) {
        c.state = 'clearing';
      } else if (c.state === 'clearing') {
        const busy = this.trucks.some((tr) => tr.lane === c.lane && this.truckInCrossing(tr, c));
        if (!busy) {
          c.state = 'green';
          c.timer = 4500;
          Sound.play('click');
        }
      } else if (c.state === 'green' && c.timer <= 0) {
        c.state = 'red';
        c.timer = 4500;
      }
      // draw pedestrian signal
      const g = c.gfx;
      const { x, y } = c.signal;
      g.clear();
      g.fillStyle(0x222222, 1);
      g.fillRoundedRect(x - 14, y - 34, 28, 60, 6);
      g.fillStyle(c.state === 'green' ? 0x223322 : 0xe5534b, 1);
      g.fillCircle(x, y - 18, 9);
      g.fillStyle(c.state === 'green' ? 0x3fb950 : 0x223322, 1);
      g.fillCircle(x, y + 8, 9);
      g.fillStyle(0x555555, 1);
      g.fillRect(x - 3, y + 26, 6, 26);
      // crossing tint while green
      g.fillStyle(c.state === 'green' ? 0x3fb950 : 0xe5534b, 0.18);
      g.fillRect(c.x, c.y, c.w, c.h);
    }
  }

  truckBounds(tr) {
    const s = tr.sprite;
    return { x: s.x - s.width / 2 + 8, y: s.y - 60, w: s.width - 16, h: 56 };
  }

  truckInCrossing(tr, c) {
    const b = this.truckBounds(tr);
    return b.x < c.x + c.w + 10 && b.x + b.w > c.x - 10;
  }

  updateTrucks(delta) {
    const dt = delta / 1000;
    for (const tr of this.trucks) {
      const lane = LANES[tr.lane];
      const c = this.crossings.find((cc) => cc.lane === tr.lane);
      const s = tr.sprite;
      const half = s.width / 2;
      const mustStop = c.state !== 'red' || this.crossingOccupied(c);
      let nx = s.x + lane.dir * TRUCK_SPEED * dt;
      if (lane.dir > 0) {
        const front = s.x + half;
        const nfront = nx + half;
        if (mustStop && front <= lane.stopX + 1 && nfront > lane.stopX) nx = lane.stopX - half;
        // keep distance to the truck ahead
        for (const o of this.trucks) {
          if (o === tr || o.lane !== tr.lane || o.sprite.x <= s.x) continue;
          const gap = o.sprite.x - o.sprite.width / 2 - (nx + half);
          if (gap < 40) nx = Math.min(nx, o.sprite.x - o.sprite.width / 2 - 40 - half);
        }
        nx = Math.max(nx, s.x); // never reverse
        if (nx - half > W + 40) nx = -half - 200 - Math.random() * 400;
      } else {
        const front = s.x - half;
        const nfront = nx - half;
        if (mustStop && front >= lane.stopX - 1 && nfront < lane.stopX) nx = lane.stopX + half;
        for (const o of this.trucks) {
          if (o === tr || o.lane !== tr.lane || o.sprite.x >= s.x) continue;
          const gap = nx - half - (o.sprite.x + o.sprite.width / 2);
          if (gap < 40) nx = Math.max(nx, o.sprite.x + o.sprite.width / 2 + 40 + half);
        }
        nx = Math.min(nx, s.x);
        if (nx + half < -40) nx = W + half + 200 + Math.random() * 400;
      }
      s.x = nx;
    }
  }

  violation(key) {
    if (this.invuln > 0) return;
    this.invuln = 900;
    this.addMistake('traffic', t(`missions.path.${key}`));
    this.flash.setAlpha(0.35);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 500 });
    const cp = CHECKPOINTS[this.stage];
    this.player.freeze(true);
    this.player.setPosition(cp.x, cp.y);
    this.player.body.reset(cp.x, cp.y);
    this.time.delayedCall(250, () => this.player.freeze(false));
  }

  update(time, delta) {
    if (this.finished) return;
    this.updateSignals(delta);
    this.updateTrucks(delta);
    this.player.update(time, delta);
    if (this.invuln > 0) {
      this.invuln -= delta;
      this.player.setAlpha(Math.floor(this.invuln / 100) % 2 ? 0.4 : 1);
      return;
    }
    this.player.setAlpha(1);
    const px = this.player.x;
    const py = this.player.y;

    if (inRect(GOAL, px, py, 0)) {
      this.player.freeze(true);
      this.complete(t('missions.path.reached'));
      return;
    }
    // checkpoints
    if (this.stage === 0 && py < 372 && px < 600) this.stage = 1;
    if (this.stage <= 1 && px > 910 && py < 372) this.stage = 2;

    // truck contact
    for (const tr of this.trucks) {
      const b = this.truckBounds(tr);
      if (inRect(b, px, py, 6)) {
        this.violation('hit');
        return;
      }
    }
    // crossing rules
    for (const c of this.crossings) {
      const inside = inRect(c, px, py, 2);
      if (inside && !c.wasInside && c.state !== 'green') {
        c.wasInside = true;
        this.violation('redLight');
        return;
      }
      c.wasInside = inside;
      if (inside) return;
    }
    // walkway
    if (!WALK.some((r) => inRect(r, px, py, 6))) this.violation('offPath');
  }
}
