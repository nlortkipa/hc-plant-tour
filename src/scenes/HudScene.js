import Phaser from 'phaser';
import { W, HUD_H, CSS, COLORS } from '../config.js';
import { t } from '../i18n/index.js';
import { txt } from '../ui/theme.js';
import { IconButton } from '../ui/Button.js';
import { GameState } from '../state/GameState.js';
import { Router } from '../Router.js';

/** Persistent top bar: location, progress, score and menu buttons. Also tracks play time. */
export class HudScene extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  create() {
    const g = this.add.graphics();
    g.fillStyle(0x0d141d, 0.94);
    g.fillRect(0, 0, W, HUD_H);
    g.fillStyle(COLORS.accent, 1);
    g.fillRect(0, HUD_H - 3, W, 3);
    // block clicks on the bar from reaching the world
    this.add.rectangle(0, 0, W, HUD_H, 0, 0.001).setOrigin(0).setInteractive();

    this.loc = txt(this, 18, HUD_H / 2, '', 19, { bold: true }).setOrigin(0, 0.5);
    this.progLabel = txt(this, 470, HUD_H / 2, t('hud.progress'), 15, { color: CSS.dim }).setOrigin(1, 0.5);
    this.bar = this.add.graphics();
    this.progText = txt(this, 700, HUD_H / 2, '', 15, { bold: true }).setOrigin(0, 0.5);
    this.score = txt(this, 900, HUD_H / 2, '', 19, { bold: true, color: CSS.accent }).setOrigin(1, 0.5);

    const btns = [
      ['ui_map', () => Router.openModal('Map'), t('hud.map')],
      ['ui_bag', () => Router.openModal('Inventory'), t('hud.inventory')],
      ['ui_gear', () => Router.openModal('Settings'), t('hud.settings')],
      ['ui_help', () => Router.openModal('Help'), t('hud.help')],
    ];
    this.tooltip = txt(this, 0, HUD_H + 8, '', 14, { color: CSS.text }).setOrigin(0.5, 0).setVisible(false);
    btns.forEach(([icon, fn, tip], i) => {
      const b = new IconButton(this, 1020 + i * 64, HUD_H / 2 - 1, icon, { onClick: fn, width: 54, height: 42 });
      b.on('pointerover', () => this.tooltip.setText(tip).setPosition(b.x, HUD_H + 6).setVisible(true));
      b.on('pointerout', () => this.tooltip.setVisible(false));
    });

    // keyboard shortcuts
    this.input.keyboard.on('keydown-M', () => Router.openModal('Map'));
    this.input.keyboard.on('keydown-I', () => Router.openModal('Inventory'));
    this.input.keyboard.on('keydown-H', () => Router.openModal('Help'));
    this.input.keyboard.on('keydown-F1', () => Router.openModal('Help'));
    this.input.keyboard.on('keydown-P', () => Router.openModal('Settings'));

    this.unsub = GameState.onChange(() => this.refresh());
    this.events.once('shutdown', () => this.unsub());
    this.saveTimer = 0;
    this.refresh();
  }

  refresh() {
    const d = GameState.data;
    this.loc.setText(t(`locations.${d.location}`) || '');
    const { done, total } = GameState.progress();
    const x = 482;
    const w = 200;
    this.bar.clear();
    this.bar.fillStyle(0x2b3a4e, 1);
    this.bar.fillRoundedRect(x, HUD_H / 2 - 8, w, 16, 8);
    this.bar.fillStyle(COLORS.good, 1);
    if (done > 0) this.bar.fillRoundedRect(x, HUD_H / 2 - 8, Math.max(16, (w * done) / total), 16, 8);
    this.progText.setText(`${done}/${total}`);
    this.score.setText(t('hud.score', { n: GameState.earned() }));
  }

  update(time, delta) {
    GameState.addTime(delta);
    this.saveTimer += delta;
    if (this.saveTimer > 10000) {
      this.saveTimer = 0;
      GameState.save();
    }
  }
}
