import Phaser from 'phaser';
import { W, H, CSS, COLORS } from '../config.js';
import { t } from '../i18n/index.js';
import { txt, panel } from '../ui/theme.js';
import { Button } from '../ui/Button.js';
import { FocusManager } from '../ui/Focus.js';
import { GameState } from '../state/GameState.js';
import { AVATARS } from '../art/characters.js';
import { playerTexture } from '../art/textures.js';
import { CharAnimator } from '../world/CharAnimator.js';
import { getRenderScale } from '../display.js';
import { Router } from '../Router.js';
import { FONT } from '../config.js';

class AvatarCard extends Phaser.GameObjects.Container {
  constructor(scene, x, y, index, onPick) {
    super(scene, x, y);
    scene.add.existing(this);
    this.index = index;
    this.enabled = true;
    this.onPick = onPick;
    this.bg = scene.add.graphics();
    this.add(this.bg);
    const key = playerTexture(scene, index, [], 'pose', Math.min(6, Math.ceil(2 * getRenderScale())));
    const fig = scene.add.sprite(0, 10 + 84, key).setOrigin(0.5, 1);
    new CharAnimator(fig, { size: 2, auto: true });
    this.add(fig);
    this.add(txt(scene, 0, 112, t('character.avatar', { n: index + 1 }), 16, { color: CSS.dim }).setOrigin(0.5));
    this.setSize(170, 260);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerup', () => this.activate());
    this.selected = false;
    this.focused = false;
    this.redraw();
  }

  redraw() {
    const g = this.bg;
    g.clear();
    g.fillStyle(this.selected ? 0x2d5a8a : 0x223044, 1);
    g.fillRoundedRect(-85, -130, 170, 260, 14);
    g.lineStyle(this.selected ? 4 : 2, this.selected ? COLORS.accent : 0x3d5170, 1);
    g.strokeRoundedRect(-85, -130, 170, 260, 14);
    if (this.focused) {
      g.lineStyle(3, 0xffffff, 1);
      g.strokeRoundedRect(-91, -136, 182, 272, 16);
    }
  }

  setSelected(s) {
    this.selected = s;
    this.redraw();
  }

  setFocused(f) {
    this.focused = f;
    this.redraw();
  }

  activate() {
    this.onPick(this.index);
  }
}

export class CharacterScene extends Phaser.Scene {
  constructor() {
    super('Character');
  }

  create() {
    this.focus = new FocusManager(this);
    this.add.image(0, 0, 'bg_kpp').setOrigin(0).setAlpha(0.35);
    panel(this, 90, 40, W - 180, H - 80, { fill: 0x121a24, alpha: 0.95 });
    txt(this, W / 2, 70, t('character.title'), 34, { bold: true, color: CSS.accent }).setOrigin(0.5, 0);

    txt(this, 160, 150, t('character.nameLabel'), 19).setOrigin(0, 0.5);
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 40;
    input.placeholder = t('character.namePlaceholder');
    input.value = GameState.data.name || '';
    input.setAttribute('aria-label', t('character.nameLabel'));
    Object.assign(input.style, {
      width: '420px',
      height: '44px',
      fontSize: '20px',
      fontFamily: FONT,
      padding: '0 14px',
      borderRadius: '10px',
      border: '2px solid #4a6386',
      background: '#0f1720',
      color: '#f0f3f6',
      outline: 'none',
      boxSizing: 'border-box',
    });
    this.inputEl = input;
    this.add.dom(870, 150, input);
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') input.blur();
    });
    input.addEventListener('keyup', (e) => e.stopPropagation());

    txt(this, 160, 220, t('character.avatarLabel'), 19).setOrigin(0, 0.5);
    this.avatar = GameState.data.avatar || 0;
    this.cards = AVATARS.map((_, i) => new AvatarCard(this, 280 + i * 240, 400, i, (idx) => this.pick(idx)));
    this.pick(this.avatar);

    const go = new Button(this, W / 2, H - 90, t('character.continue'), {
      width: 380,
      variant: 'primary',
      bold: true,
      size: 22,
      onClick: () => this.proceed(),
    });
    this.focus.push([...this.cards, go], { columns: 1 });
  }

  pick(i) {
    this.avatar = i;
    this.cards.forEach((c) => c.setSelected(c.index === i));
  }

  proceed() {
    const name = (this.inputEl.value || '').trim().slice(0, 40) || t('character.defaultName');
    GameState.data.name = name;
    GameState.data.avatar = this.avatar;
    GameState.save();
    Router.goTo('wardrobe');
  }
}
