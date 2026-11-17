import Phaser from 'phaser';
import { W, H, HUD_H, CSS, SCORING } from '../config.js';
import { t } from '../i18n/index.js';
import { txt, panel } from '../ui/theme.js';
import { Button } from '../ui/Button.js';
import { FocusManager } from '../ui/Focus.js';
import { QuizCard } from '../ui/QuizCard.js';
import { shuffle } from '../ui/DialogBox.js';
import { FINAL_QUESTIONS, FINAL_OPTIONS } from '../data/finalTest.js';
import { GameState } from '../state/GameState.js';
import { Router } from '../Router.js';
import { Sound } from '../audio/Sound.js';

export class FinalTestScene extends Phaser.Scene {
  constructor() {
    super('FinalTest');
  }

  create() {
    GameState.setLocation('final');
    this.focus = new FocusManager(this);
    this.add.image(0, 0, 'bg_kpp').setOrigin(0).setAlpha(0.25);
    this.add.rectangle(0, HUD_H, W, H - HUD_H, 0x0b1118, 0.7).setOrigin(0);
    if (!GameState.allZonesDone()) {
      txt(this, W / 2, H / 2 - 40, t('final.locked'), 24, { wrap: 800, align: 'center' }).setOrigin(0.5);
      const b = new Button(this, W / 2, H / 2 + 50, t('hud.map'), { width: 240, variant: 'primary', onClick: () => Router.openModal('Map') });
      this.focus.push([b]);
      return;
    }
    this.intro();
  }

  intro() {
    const objs = [];
    objs.push(panel(this, W / 2 - 400, 170, 800, 340, { fill: 0x16202c, border: 0xf2b705 }));
    objs.push(txt(this, W / 2, 210, t('final.title'), 36, { bold: true, color: CSS.accent }).setOrigin(0.5, 0));
    objs.push(txt(this, W / 2, 290, t('final.intro'), 20, { wrap: 680, align: 'center', scalable: true }).setOrigin(0.5, 0));
    const b = new Button(this, W / 2, 450, t('final.start'), {
      width: 300,
      variant: 'primary',
      bold: true,
      onClick: () => {
        this.focus.pop(group);
        objs.forEach((o) => o.destroy());
        b.destroy();
        this.runTest();
      },
    });
    const group = this.focus.push([b], { autoFocus: true });
  }

  async runTest() {
    GameState.resetFinal();
    const qs = FINAL_QUESTIONS;
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      const base = `final.questions.${q.id}`;
      const options = shuffle(FINAL_OPTIONS.map((id) => ({ id, text: t(`${base}.options.${id}`) })));
      const card = new QuizCard(this, this.focus, {
        x: 140,
        y: HUD_H + 24,
        w: 1000,
        kicker: t('final.progress', { i: i + 1, n: qs.length }),
        prompt: t(`${base}.prompt`),
        options,
        size: 23,
      });
      const picked = await card.ask();
      const ok = picked === q.correct;
      card.reveal(q.correct, picked);
      GameState.data.final.answers[q.id] = picked;
      GameState.award(`final.${q.id}`, ok ? SCORING.finalQuestion.max : 0, SCORING.finalQuestion.max, q.topic);
      if (!ok) GameState.mistake(q.topic);
      await card.explainAndNext(t(`${base}.explain`), ok, i === qs.length - 1 ? t('missions.common.finish') : t('ui.next'));
      card.destroy();
    }
    const f = GameState.data.final;
    f.done = true;
    f.attempts += 1;
    GameState.data.finishedAt = Date.now();
    GameState.save();
    Sound.play('win');
    Router.start('Result', {}, { hud: false });
  }
}
