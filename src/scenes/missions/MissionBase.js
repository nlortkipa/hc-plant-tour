import Phaser from 'phaser';
import { W, H, HUD_H, CSS, COLORS } from '../../config.js';
import { t } from '../../i18n/index.js';
import { txt, panel, blocker } from '../../ui/theme.js';
import { Button } from '../../ui/Button.js';
import { FocusManager } from '../../ui/Focus.js';
import { DialogBox } from '../../ui/DialogBox.js';
import { toast } from '../../ui/Toast.js';
import { Sound } from '../../audio/Sound.js';
import { ZONES } from '../../data/zones.js';

/** Shared mission plumbing: header, mistake counter, explanation dialog and completion panel. */
export class MissionBase extends Phaser.Scene {
  init(data) {
    this.cfg = data || {};
    this.mistakes = 0;
    this.topics = {};
    this.finished = false;
    this.npcId = ZONES[this.cfg.zoneId]?.npc || null;
  }

  setupBase(title, goal, opts = {}) {
    this.focus = new FocusManager(this);
    if (opts.background !== false) this.add.rectangle(0, 0, W, H, opts.bg ?? 0x121a24, 1).setOrigin(0).setDepth(-100);
    const y = opts.headerY ?? HUD_H + 6;
    const w = opts.headerW ?? W - 24;
    const x = opts.headerX ?? 12;
    this.header = this.add.container(0, 0).setDepth(900);
    const label = txt(this, x + 16, y + 8, title, 18, { bold: true, color: CSS.accent });
    const goalText = goal ? txt(this, x + 16, y + 34, goal, 15, { wrap: w - 220, color: CSS.text }) : null;
    const h = Math.max(46, 42 + (goalText ? goalText.height : 0));
    const bg = panel(this, x, y, w, h, { fill: 0x0d141d, alpha: 0.88, radius: 12, shadow: false });
    this.mistakeText = txt(this, x + w - 16, y + 10, t('missions.common.mistakes', { n: 0 }), 17, { bold: true, color: CSS.bad }).setOrigin(1, 0);
    this.header.add([bg, label, this.mistakeText]);
    if (goalText) this.header.add(goalText);
    this.headerBottom = y + h;
    this.dialog = new DialogBox(this, this.focus, { depth: 1500 });
  }

  addMistake(topic, message) {
    this.mistakes++;
    const tp = topic || this.cfg.topic;
    this.topics[tp] = (this.topics[tp] || 0) + 1;
    this.mistakeText.setText(t('missions.common.mistakes', { n: this.mistakes }));
    this.tweens.add({ targets: this.mistakeText, scale: { from: 1.4, to: 1 }, duration: 300 });
    Sound.play('wrong');
    this.cameras.main.shake(180, 0.006);
    if (message) toast(this, message, 'bad', 2600);
  }

  /** Show the completion panel, then hand the result back to the zone. */
  async complete(message) {
    if (this.finished) return;
    this.finished = true;
    Sound.play('win');
    await new Promise((resolve) => {
      const block = blocker(this, 0.55).setDepth(2000);
      const w = 560;
      const h = 250;
      const x = (W - w) / 2;
      const y = (H - h) / 2;
      const objs = [
        block,
        panel(this, x, y, w, h, { fill: 0x16202c, border: COLORS.good }).setDepth(2001),
        txt(this, W / 2, y + 36, message || t('missions.common.done'), 28, { bold: true, color: CSS.good, wrap: w - 40, align: 'center' }).setOrigin(0.5, 0).setDepth(2001),
        txt(this, W / 2, y + 110, t('missions.common.mistakes', { n: this.mistakes }), 22, { color: this.mistakes ? CSS.bad : CSS.text }).setOrigin(0.5, 0).setDepth(2001),
      ];
      const btn = new Button(this, W / 2, y + h - 46, t('missions.common.continue'), { width: 240, variant: 'primary', bold: true, onClick: () => resolve() }).setDepth(2002);
      objs.push(btn);
      this.focus.push([btn], { autoFocus: true });
    });
    this.cfg.onDone?.({ mistakes: this.mistakes, topics: this.topics });
  }

  /** Explanation spoken by the zone manager. */
  async explain(lines) {
    await this.dialog.say(this.npcId, lines);
    this.dialog.hide();
  }
}
