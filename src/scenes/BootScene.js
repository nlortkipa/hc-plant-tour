import Phaser from 'phaser';
import { generateAll } from '../art/textures.js';
import { GameState } from '../state/GameState.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    generateAll(this);
    GameState.load();
    this.scene.start('Menu');
  }
}
