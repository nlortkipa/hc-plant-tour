import Phaser from 'phaser';
import { W, H, CSS } from '../config.js';
import { t } from '../i18n/index.js';
import { txt, panel } from '../ui/theme.js';
import { Button } from '../ui/Button.js';
import { FocusManager } from '../ui/Focus.js';
import { GameState } from '../state/GameState.js';
import { Router } from '../Router.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    this.focus = new FocusManager(this);
    this.add.image(0, -40, 'bg_kpp').setOrigin(0).setAlpha(0.55);
    this.add.rectangle(0, 0, W, H, 0x0b1118, 0.55).setOrigin(0);
    // decorative characters
    const npcs = ['hs', 'crushing', 'kiln', 'ccr', 'packing'];
    npcs.forEach((n, i) => {
      const img = this.add.image(70 + i * 50, 640 - (i % 2) * 10, `npc_${n}`).setOrigin(0.5, 1).setScale(1.6);
      this.tweens.add({ targets: img, y: img.y - 4, yoyo: true, repeat: -1, duration: 900 + i * 120, ease: 'Sine.easeInOut' });
    });

    panel(this, W / 2 - 330, 90, 660, 540, { fill: 0x121a24, alpha: 0.92, border: 0xf2b705 });
    // logo mark (helmet)
    const g = this.add.graphics();
    g.fillStyle(0xf2b705, 1);
    g.fillEllipse(W / 2, 168, 110, 80);
    g.fillStyle(0x121a24, 1);
    g.fillRect(W / 2 - 60, 168, 120, 50);
    g.fillStyle(0xf2b705, 1);
    g.fillRoundedRect(W / 2 - 70, 164, 140, 12, 6);
    txt(this, W / 2, 200, t('ui.title'), 48, { bold: true, color: CSS.accent }).setOrigin(0.5, 0);
    txt(this, W / 2, 264, t('ui.subtitle'), 19, { color: CSS.dim, wrap: 560, align: 'center' }).setOrigin(0.5, 0);

    const hasSave = GameState.hasSave();
    const buttons = [];
    let y = 350;
    if (hasSave) {
      GameState.load();
      const b = new Button(this, W / 2, y, t('ui.continue'), {
        width: 400,
        variant: 'primary',
        bold: true,
        size: 22,
        onClick: () => this.continueGame(),
      });
      buttons.push(b);
      y += 64;
      const loc = t(`locations.${GameState.data.location}`);
      txt(this, W / 2, y - 30, t('ui.savedProgress', { p: GameState.percent(), loc }), 15, { color: CSS.dim }).setOrigin(0.5);
      y += 6;
    }
    buttons.push(
      new Button(this, W / 2, y, t('ui.newGame'), {
        width: 400,
        variant: hasSave ? 'secondary' : 'primary',
        bold: true,
        size: 22,
        onClick: () => this.newGame(hasSave),
      }),
    );
    y += 64;
    buttons.push(new Button(this, W / 2 - 102, y, t('ui.settings'), { width: 196, onClick: () => Router.openModal('Settings') }));
    buttons.push(new Button(this, W / 2 + 102, y, t('ui.help'), { width: 196, onClick: () => Router.openModal('Help') }));
    this.focus.push(buttons);

    txt(this, W / 2, 596, t('ui.keyboardHint'), 14, { color: CSS.dim }).setOrigin(0.5);
    txt(this, W - 16, H - 14, t('ui.version'), 13, { color: CSS.dim }).setOrigin(1, 1);
  }

  continueGame() {
    const d = GameState.data;
    if (!d.kppCleared && d.wardrobeAttempts === 0) {
      Router.goTo('wardrobe');
      return;
    }
    Router.goTo(d.location || 'kpp');
  }

  newGame(hasSave) {
    const go = () => {
      GameState.newGame();
      Router.start('Character', {}, { hud: false });
    };
    if (hasSave) Router.openModal('Confirm', { text: t('ui.confirmNew'), onYes: go });
    else go();
  }
}
