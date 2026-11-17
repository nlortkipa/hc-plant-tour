import { W, H, CSS, COLORS } from '../../config.js';
import { t } from '../../i18n/index.js';
import { txt, panel } from '../../ui/theme.js';
import { Button } from '../../ui/Button.js';
import { Tile } from '../../ui/Tile.js';
import { MissionBase } from './MissionBase.js';
import { LOADING } from '../../data/missions.js';
import { QuizCard } from '../../ui/QuizCard.js';
import { shuffle } from '../../ui/DialogBox.js';
import { toast } from '../../ui/Toast.js';
import { Sound } from '../../audio/Sound.js';

const X0 = 330; // trailer bed origin
const Y0 = 330;
const SW = 130; // slot pitch
const SH = 100;

/** Logistics: prepare the truck, balance the load, secure it. */
export class LoadingMission extends MissionBase {
  constructor() {
    super('LoadingMission');
  }

  create() {
    this.setupBase(t('missions.loading.title'), null);
    this.stepText = txt(this, 40, this.headerBottom + 16, '', 19, { wrap: W - 80, scalable: true });
    this.step1();
  }

  async step1() {
    this.stepText.setText(t('missions.loading.step1'));
    const sel = new Set();
    const btns = LOADING.checks.map((c, i) => {
      const b = new Button(this, W / 2, this.headerBottom + 110 + i * 74, `☐  ${t(`missions.loading.checks.${c.id}`)}`, { width: 760, height: 62, align: 'left', size: 19 });
      b.checkId = c.id;
      b.onClick = () => {
        if (sel.has(c.id)) sel.delete(c.id);
        else sel.add(c.id);
        const on = sel.has(c.id);
        b.setText(`${on ? '☑' : '☐'}  ${t(`missions.loading.checks.${c.id}`)}`);
        b.setVariant(on ? 'selected' : 'secondary');
      };
      return b;
    });
    const confirm = new Button(this, W / 2, H - 70, t('missions.loading.confirm'), { width: 300, variant: 'primary', bold: true });
    const group = this.focus.push([...btns, confirm]);
    for (;;) {
      await new Promise((r) => (confirm.onClick = r));
      const ok = LOADING.checks.every((c) => sel.has(c.id) === c.correct);
      if (ok) break;
      this.addMistake('loads');
      await this.explain(t('missions.loading.checksWrong'));
    }
    Sound.play('correct');
    toast(this, t('missions.loading.checksGood'), 'good');
    this.focus.pop(group);
    [...btns, confirm].forEach((b) => b.destroy());
    this.step2();
  }

  slotPos(r, c) {
    return { x: X0 + r * SW + SW / 2, y: Y0 + c * SH + SH / 2 };
  }

  async step2() {
    this.stepText.setText(t('missions.loading.step2'));
    const { rows, cols, target } = LOADING;
    const g = this.add.graphics();
    // cab (front) + trailer bed
    g.fillStyle(0xc0392b, 1);
    g.fillRoundedRect(X0 - 130, Y0 + 10, 110, cols * SH - 20, 14);
    g.fillStyle(0xa9d6f2, 1);
    g.fillRoundedRect(X0 - 110, Y0 + 30, 40, cols * SH - 60, 6);
    g.fillStyle(0x3a6ea5, 1);
    g.fillRoundedRect(X0 - 10, Y0 - 10, rows * SW + 20, cols * SH + 20, 8);
    g.fillStyle(0x1b1b1b, 1);
    for (const wx of [X0 - 90, X0 + rows * SW - 140, X0 + rows * SW - 60]) {
      g.fillRoundedRect(wx, Y0 - 26, 50, 16, 4);
      g.fillRoundedRect(wx, Y0 + cols * SH + 10, 50, 16, 4);
    }
    const frontLabel = txt(this, X0 - 75, Y0 + (cols * SH) / 2, t('missions.loading.front'), 15, { bold: true }).setOrigin(0.5).setAngle(-90);
    // target zone for centre of gravity
    const tx1 = X0 + SW / 2 + target.longMin * SW;
    const tx2 = X0 + SW / 2 + target.longMax * SW;
    const ty1 = Y0 + SH / 2 + ((1 - target.lat) / 2) * (cols - 1) * SH;
    const ty2 = Y0 + SH / 2 + ((1 + target.lat) / 2) * (cols - 1) * SH;
    const tz = this.add.rectangle(tx1, ty1, tx2 - tx1, ty2 - ty1, COLORS.good, 0.25).setOrigin(0).setStrokeStyle(3, COLORS.good).setDepth(5);

    const grid = [];
    const queue = [...LOADING.pallets];
    const tiles = [];
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        const p = this.slotPos(r, c);
        const tile = new Tile(this, p.x, p.y, SW - 12, SH - 12, { fill: 0x2b4a6e, border: 0x5b7fa8, size: 22 });
        tile.r = r;
        tile.c = c;
        grid[r][c] = null;
        tiles.push(tile);
      }
    }
    const cog = this.add.circle(0, 0, 13, 0xffffff).setStrokeStyle(4, 0x111111).setDepth(10).setVisible(false);
    const nextText = txt(this, 1000, Y0 - 40, '', 20, { bold: true }).setOrigin(0.5, 0);
    const queueIcons = this.add.container(1000, Y0 + 20);
    const refresh = () => {
      let sum = 0;
      let lon = 0;
      let lat = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const w = grid[r][c];
          if (!w) continue;
          sum += w;
          lon += w * r;
          lat += w * (c === 0 ? -1 : 1);
        }
      }
      if (sum > 0) {
        this.cogLong = lon / sum;
        this.cogLat = lat / sum;
        cog.setVisible(true).setPosition(X0 + SW / 2 + this.cogLong * SW, Y0 + SH / 2 + ((this.cogLat + 1) / 2) * (cols - 1) * SH);
        const inside = Math.abs(this.cogLat) <= target.lat && this.cogLong >= target.longMin && this.cogLong <= target.longMax;
        cog.setFillStyle(inside ? COLORS.good : COLORS.bad);
      } else cog.setVisible(false);
      for (const tile of tiles) {
        const w = grid[tile.r][tile.c];
        tile.label.setText(w ? t(w === 2 ? 'missions.loading.heavy' : 'missions.loading.light') : '');
        tile.setStyle(w ? (w === 2 ? 0xb07d3e : 0xd8c9a3) : 0x2b4a6e, w ? 0x5a3c18 : 0x5b7fa8);
        tile.label.setColor(w ? '#1b1b1b' : '#ffffff');
      }
      nextText.setText(queue.length ? t('missions.loading.next', { w: t(queue[0] === 2 ? 'missions.loading.heavy' : 'missions.loading.light') }) : t('missions.loading.allPlaced'));
      queueIcons.removeAll(true);
      queue.forEach((w, i) => {
        const r = this.add.rectangle((i % 3) * 64 - 64, Math.floor(i / 3) * 64, 56, 56, w === 2 ? 0xb07d3e : 0xd8c9a3).setStrokeStyle(2, 0x5a3c18);
        const l = txt(this, r.x, r.y, t(w === 2 ? 'missions.loading.heavy' : 'missions.loading.light'), 15, { bold: true, color: '#1b1b1b' }).setOrigin(0.5);
        queueIcons.add([r, l]);
      });
    };
    for (const tile of tiles) {
      tile.onClick = () => {
        const cur = grid[tile.r][tile.c];
        if (cur) {
          queue.unshift(cur);
          grid[tile.r][tile.c] = null;
        } else if (queue.length) {
          grid[tile.r][tile.c] = queue.shift();
        }
        Sound.play('click');
        refresh();
      };
    }
    refresh();
    const check = new Button(this, 1000, H - 90, t('missions.loading.check'), { width: 280, variant: 'primary', bold: true });
    const group = this.focus.push([...tiles, check], { columns: 2 });
    for (;;) {
      await new Promise((r) => (check.onClick = r));
      if (queue.length) {
        toast(this, t('missions.loading.notAll'), 'info');
        continue;
      }
      const inside = Math.abs(this.cogLat) <= target.lat && this.cogLong >= target.longMin && this.cogLong <= target.longMax;
      if (inside) break;
      this.addMistake('loads');
      await this.explain(t('missions.loading.unbalanced'));
    }
    Sound.play('correct');
    toast(this, t('missions.loading.balanced'), 'good');
    this.focus.pop(group);
    check.destroy();
    nextText.destroy();
    queueIcons.destroy();
    tiles.forEach((tile) => tile.disableInteractive());
    this.loadObjs = [g, tz, cog, frontLabel, ...tiles];
    this.step3();
  }

  async step3() {
    this.stepText.setText('');
    const S = LOADING.straps;
    const options = shuffle(S.options.map((id) => ({ id, text: t(`missions.loading.straps.${id}`) })));
    const hidden = this.loadObjs;
    hidden.forEach((o) => o.setVisible(false));
    const card = new QuizCard(this, this.focus, { x: 140, y: this.headerBottom + 30, w: 1000, prompt: t('missions.loading.step3'), options, icon: 'warn_truck' });
    const picked = await card.ask();
    const ok = picked === S.correct;
    card.reveal(S.correct, picked);
    if (!ok) this.addMistake('loads');
    await card.explainAndNext(t('missions.loading.strapsExplain'), ok, t('ui.next'));
    card.destroy();
    // straps + departure
    hidden.forEach((o) => o.setVisible(true));
    const straps = this.add.graphics().setDepth(20);
    straps.lineStyle(6, 0xf2b705, 1);
    for (let r = 0; r < LOADING.rows; r++) {
      const x = X0 + r * SW + SW / 2;
      straps.lineBetween(x, Y0 - 12, x, Y0 + LOADING.cols * SH + 12);
    }
    const cog = hidden[2];
    cog.setVisible(false);
    hidden[1].setVisible(false);
    Sound.play('horn');
    const all = [...hidden, straps];
    await new Promise((r) => this.tweens.add({ targets: all, x: `+=${W}`, duration: 2200, delay: 400, ease: 'Cubic.easeIn', onComplete: r }));
    toast(this, t('missions.loading.departed'), 'good');
    this.complete();
  }
}
