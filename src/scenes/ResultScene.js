import Phaser from 'phaser';
import { W, H, CSS } from '../config.js';
import { t } from '../i18n/index.js';
import { txt } from '../ui/theme.js';

// End of the game: a plain black screen saying the remaining levels aren't available yet.
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create() {
    this.cameras.main.setBackgroundColor('#000000');
    txt(this, W / 2, H / 2, t('result.notImplemented'), 28, { wrap: 900, align: 'center', color: CSS.text }).setOrigin(0.5);
  }
}
