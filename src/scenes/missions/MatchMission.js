import { W, H, CSS, COLORS } from '../../config.js';
import { t } from '../../i18n/index.js';
import { txt, panel } from '../../ui/theme.js';
import { Button } from '../../ui/Button.js';
import { MissionBase } from './MissionBase.js';
import { MATCH_IDS } from '../../data/missions.js';
import { shuffle } from '../../ui/DialogBox.js';
import { Sound } from '../../audio/Sound.js';

/** Match cement bag markings (CEM I, 42,5, R …) with their meaning. Click left, then right. */
export class MatchMission extends MissionBase {
  constructor() {
    super('MatchMission');
  }

  create() {
    this.setupBase(t('missions.match.title'), t('missions.match.goal'));
    this.drawBag();
    this.matched = 0;
    this.selected = null;
    const top = this.headerBottom + 110;
    const step = 78;
    this.lines = this.add.graphics().setDepth(1);
    this.left = MATCH_IDS.map((id, i) => {
      const b = new Button(this, 250, top + i * step, t(`missions.match.left.${id}`), { width: 260, height: 62, size: 22, bold: true });
      b.pairId = id;
      b.onClick = () => this.pickLeft(b);
      return b;
    });
    this.right = shuffle(MATCH_IDS).map((id, i) => {
      const b = new Button(this, 860, top + i * step, t(`missions.match.right.${id}`), { width: 640, height: 62, size: 17, align: 'left' });
      b.pairId = id;
      b.onClick = () => this.pickRight(b);
      return b;
    });
    this.counter = txt(this, W - 230, this.mistakeText.y, '', 17, { bold: true, color: CSS.good }).setOrigin(1, 0).setDepth(901);
    this.updateCounter();
    this.focus.push([...this.left, ...this.right]);
  }

  drawBag() {
    const y = this.headerBottom + 14;
    const x = W / 2 - 170;
    panel(this, x, y, 340, 64, { fill: 0xd8c9a3, border: 0x9b8a62, radius: 10 });
    txt(this, W / 2, y + 32, t('missions.match.bag'), 26, { bold: true, color: '#1f3c5a' }).setOrigin(0.5);
    this.add.image(x - 40, y + 32, 'bag').setDisplaySize(56, 56);
  }

  updateCounter() {
    this.counter.setText(t('missions.match.matched', { f: this.matched, n: MATCH_IDS.length }));
  }

  pickLeft(b) {
    if (b.done) return;
    for (const o of this.left) if (!o.done) o.setVariant('secondary');
    this.selected = b;
    b.setVariant('selected');
  }

  pickRight(b) {
    if (b.done) return;
    if (!this.selected) {
      // nudge: choose a marking first
      this.tweens.add({ targets: this.left.filter((l) => !l.done), x: '+=6', yoyo: true, duration: 80, repeat: 1 });
      return;
    }
    const l = this.selected;
    if (l.pairId === b.pairId) {
      Sound.play('correct');
      for (const x of [l, b]) {
        x.done = true;
        x.setVariant('good');
        x.disableInteractive();
        x.enabled = false;
      }
      this.lines.lineStyle(4, COLORS.good, 0.8);
      this.lines.lineBetween(l.x + l.w / 2, l.y, b.x - b.w / 2, b.y);
      this.matched++;
      this.updateCounter();
      this.selected = null;
      if (this.matched === MATCH_IDS.length) this.time.delayedCall(700, () => this.complete());
    } else {
      this.addMistake('production');
      b.setVariant('bad');
      this.time.delayedCall(450, () => {
        if (!b.done) b.setVariant('secondary');
      });
    }
  }
}
