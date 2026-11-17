import Phaser from 'phaser';
import { W, H, CSS, COLORS, PASS_THRESHOLD } from '../config.js';
import { t } from '../i18n/index.js';
import { txt, panel } from '../ui/theme.js';
import { Button } from '../ui/Button.js';
import { FocusManager } from '../ui/Focus.js';
import { GameState } from '../state/GameState.js';
import { TOUR_ZONES } from '../data/zones.js';
import { certificateCanvas, downloadCanvas } from '../art/certificate.js';
import { Router } from '../Router.js';
import { Sound } from '../audio/Sound.js';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create() {
    this.focus = new FocusManager(this);
    this.add.image(0, 0, 'bg_kpp').setOrigin(0).setAlpha(0.25);
    this.add.rectangle(0, 0, W, H, 0x0b1118, 0.75).setOrigin(0);
    const d = GameState.data;
    const percent = GameState.percent();
    const passed = GameState.passed();

    // ---- left: score + breakdown
    panel(this, 30, 24, 600, H - 120, { fill: 0x16202c });
    txt(this, 60, 44, t('result.title'), 30, { bold: true, color: CSS.accent });
    txt(this, 60, 92, t('result.scoreLabel'), 17, { color: CSS.dim });
    const big = txt(this, 60, 112, t('result.score', { p: 0 }), 64, { bold: true, color: passed ? CSS.good : CSS.bad });
    this.tweens.addCounter({ from: 0, to: percent, duration: 1200, onUpdate: (tw) => big.setText(t('result.score', { p: Math.round(tw.getValue()) })) });
    txt(this, 250, 128, passed ? t('result.passed') : t('result.failed', { t: PASS_THRESHOLD }), 18, { wrap: 360, color: passed ? CSS.good : CSS.text });
    txt(this, 60, 196, t('result.time', { m: Math.max(1, Math.round(d.timeMs / 60000)) }), 15, { color: CSS.dim });

    txt(this, 60, 230, t('result.breakdown'), 18, { bold: true });
    const groups = [['kpp', t('result.kpp')], ...TOUR_ZONES.map((z) => [z, t(`locations.${z}`)]), ['final', t('result.test')]];
    const g = this.add.graphics();
    groups.forEach(([key, name], i) => {
      const y = 266 + i * 23;
      const { earned, max } = GameState.groupScore(key);
      txt(this, 60, y, name, 14, { color: CSS.text }).setOrigin(0, 0.5);
      g.fillStyle(0x2b3a4e, 1);
      g.fillRoundedRect(330, y - 6, 200, 12, 6);
      const ratio = max ? earned / max : 0;
      g.fillStyle(ratio >= 0.8 ? COLORS.good : ratio >= 0.5 ? COLORS.accent : COLORS.bad, 1);
      if (ratio > 0) g.fillRoundedRect(330, y - 6, Math.max(12, 200 * ratio), 12, 6);
      txt(this, 540, y, `${earned}/${max}`, 14, { color: CSS.dim }).setOrigin(0, 0.5);
    });

    const weakY = 266 + groups.length * 23 + 14;
    txt(this, 60, weakY, t('result.weakTitle'), 18, { bold: true });
    const weak = GameState.topMistakes(3);
    if (!weak.length) txt(this, 60, weakY + 30, t('result.weakNone'), 15, { color: CSS.good });
    weak.forEach(([topic, n], i) => {
      txt(this, 60, weakY + 30 + i * 24, `•  ${t('result.weakItem', { topic: t(`topics.${topic}`), n })}`, 15, { color: CSS.bad, wrap: 540 });
    });

    // ---- right: certificate
    const buttons = [];
    if (passed) {
      const dt = new Date(d.finishedAt || Date.now());
      const date = `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
      const cert = certificateCanvas({
        name: d.name || t('character.defaultName'),
        percent,
        date,
        texts: {
          heading: t('result.certificate.heading'),
          confirms: t('result.certificate.confirms'),
          text: t('result.certificate.text'),
          score: t('result.certificate.score', { p: percent }),
          date: t('result.certificate.date', { d: date }),
          badge: t('result.certificate.badge'),
        },
      });
      if (this.textures.exists('certificate')) this.textures.remove('certificate');
      this.textures.addCanvas('certificate', cert);
      const img = this.add.image(950, 290, 'certificate').setDisplaySize(580, 411);
      img.setAlpha(0).setScale(img.scaleX * 0.9);
      this.tweens.add({ targets: img, alpha: 1, scaleX: img.scaleX / 0.9, scaleY: img.scaleY / 0.9, duration: 600, ease: 'Back.easeOut' });
      buttons.push(new Button(this, 950, 540, t('result.download'), { width: 380, variant: 'primary', bold: true, onClick: () => downloadCanvas(cert, 'certificate.png') }));
      Sound.play('win');
    } else {
      panel(this, 660, 24, 590, 420, { fill: 0x16202c });
      txt(this, 955, 120, t('result.failed', { t: PASS_THRESHOLD }), 22, { wrap: 500, align: 'center' }).setOrigin(0.5, 0);
      if (!GameState.allZonesDone()) txt(this, 955, 260, t('result.incomplete'), 18, { color: CSS.bad, wrap: 500, align: 'center' }).setOrigin(0.5, 0);
    }

    // ---- bottom actions
    const y = H - 56;
    buttons.push(
      new Button(this, 250, y, t('result.retakeTest'), {
        width: 340,
        onClick: () => {
          GameState.resetFinal();
          Router.start('FinalTest');
        },
      }),
    );
    buttons.push(
      new Button(this, 640, y, t('result.restart'), {
        width: 340,
        onClick: () =>
          Router.openModal('Confirm', {
            text: t('ui.confirmNew'),
            onYes: () => {
              GameState.newGame(true);
              Router.goTo('wardrobe');
            },
          }),
      }),
    );
    buttons.push(new Button(this, 1030, y, t('result.menu'), { width: 340, onClick: () => Router.start('Menu', {}, { hud: false }) }));
    this.focus.push(buttons);
  }
}
