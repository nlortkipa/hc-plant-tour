import { W, H, HUD_H, CSS, COLORS } from '../../config.js';
import { t } from '../../i18n/index.js';
import { txt } from '../../ui/theme.js';
import { MissionBase } from './MissionBase.js';
import { ALARMS } from '../../data/missions.js';
import { QuizCard } from '../../ui/QuizCard.js';
import { shuffle } from '../../ui/DialogBox.js';
import { Sound } from '../../audio/Sound.js';

const ICON = { fire: 'warn_fire', siren: 'warn_noise', gas: 'warn_gas', camera: 'warn_bang' };

/** CCR simulation: alarms pop up on the control screen; react correctly before the timer runs out. */
export class AlarmMission extends MissionBase {
  constructor() {
    super('AlarmMission');
  }

  create() {
    this.setupBase(t('missions.alarm.title'), null, { bg: 0x0d1420 });
    this.drawRoom();
    this.alarmBar = this.add.rectangle(W / 2, this.headerBottom + 30, W - 24, 44, COLORS.bad, 1).setDepth(5).setVisible(false);
    this.alarmText = txt(this, W / 2, this.headerBottom + 30, '', 20, { bold: true }).setOrigin(0.5).setDepth(6);
    this.timerBg = this.add.rectangle(140, H - 30, 1000, 14, 0x2b3a4e).setOrigin(0, 0.5).setDepth(5).setVisible(false);
    this.timerFill = this.add.rectangle(140, H - 30, 1000, 14, COLORS.accent).setOrigin(0, 0.5).setDepth(6).setVisible(false);
    this.timerText = txt(this, 1150, H - 30, '', 15, { bold: true }).setOrigin(0, 0.5).setDepth(6);
    this.run();
  }

  drawRoom() {
    const g = this.add.graphics().setDepth(-90);
    g.fillStyle(0x0f1826, 1);
    g.fillRect(0, HUD_H, W, H - HUD_H);
    // side monitors with trends
    for (let i = 0; i < 2; i++) {
      const x = i ? W - 120 : 12;
      g.fillStyle(0x111111, 1);
      g.fillRoundedRect(x, 200, 108, 380, 6);
      for (let k = 0; k < 4; k++) {
        g.fillStyle(0x18324a, 1);
        g.fillRect(x + 8, 210 + k * 92, 92, 80);
        g.lineStyle(2, k === 2 ? COLORS.bad : COLORS.good, 1);
        g.beginPath();
        for (let p = 0; p < 8; p++) g.lineTo(x + 12 + p * 12, 250 + k * 92 + Math.sin(p + k * 2 + i) * 18);
        g.strokePath();
      }
    }
  }

  async run() {
    const list = ALARMS.list;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      const base = `missions.alarm.alarms.${a.id}`;
      // alarm banner
      this.alarmBar.setVisible(true);
      this.alarmText.setText(t(base + '.label'));
      this.flashTween = this.tweens.add({ targets: this.alarmBar, alpha: { from: 1, to: 0.35 }, yoyo: true, repeat: -1, duration: 300 });
      Sound.play(a.kind === 'siren' ? 'siren' : 'alarm');
      const options = shuffle(['a', 'b', 'c'].map((id) => ({ id, text: t(`${base}.options.${id}`) })));
      const card = new QuizCard(this, this.focus, {
        x: 140,
        y: this.headerBottom + 70,
        w: 1000,
        kicker: t('missions.alarm.progress', { i: i + 1, n: list.length }),
        prompt: t(base + '.label'),
        options,
        icon: ICON[a.kind],
      });
      const picked = await this.withTimer(card, ALARMS.seconds * 1000);
      this.flashTween.stop();
      this.alarmBar.setAlpha(1).setFillStyle(0x3d5170);
      const ok = picked === a.correct;
      card.reveal(a.correct, picked);
      if (!ok) this.addMistake('emergency', picked === null ? t('ui.timeUp') : null);
      await card.explainAndNext(t(base + '.explain'), ok, i === list.length - 1 ? t('missions.common.finish') : t('ui.next'));
      card.destroy();
      this.alarmBar.setFillStyle(COLORS.bad).setVisible(false);
      this.alarmText.setText('');
    }
    this.complete();
  }

  withTimer(card, ms) {
    this.timerBg.setVisible(true);
    this.timerFill.setVisible(true).setFillStyle(COLORS.accent);
    return new Promise((resolve) => {
      let left = ms;
      let done = false;
      const tick = this.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
          left -= 100;
          this.timerFill.width = Math.max(0, (1000 * left) / ms);
          if (left < ms * 0.3) this.timerFill.setFillStyle(COLORS.bad);
          this.timerText.setText(t('missions.alarm.timer', { s: Math.ceil(left / 1000) }));
          if (left <= 0 && !done) {
            done = true;
            tick.remove();
            card.abort();
            this.hideTimer();
            resolve(null);
          }
        },
      });
      card.ask().then((id) => {
        if (done) return;
        done = true;
        tick.remove();
        this.hideTimer();
        resolve(id);
      });
    });
  }

  hideTimer() {
    this.timerBg.setVisible(false);
    this.timerFill.setVisible(false);
    this.timerText.setText('');
  }
}
