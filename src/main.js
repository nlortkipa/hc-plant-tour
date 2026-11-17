import Phaser from 'phaser';
import '@fontsource/noto-sans-georgian/400.css';
import '@fontsource/noto-sans-georgian/700.css';
import { W, H, COLORS } from './config.js';
import { Router } from './Router.js';
import { Sound } from './audio/Sound.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { CharacterScene } from './scenes/CharacterScene.js';
import { WardrobeScene } from './scenes/WardrobeScene.js';
import { ZoneScene } from './scenes/ZoneScene.js';
import { HudScene } from './scenes/HudScene.js';
import { MapScene, SettingsScene, HelpScene, InventoryScene, ConfirmScene } from './scenes/Modals.js';
import { FinalTestScene } from './scenes/FinalTestScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { PathMission } from './scenes/missions/PathMission.js';
import { SpotMission } from './scenes/missions/SpotMission.js';
import { DecisionMission } from './scenes/missions/DecisionMission.js';
import { AlarmMission } from './scenes/missions/AlarmMission.js';
import { MatchMission } from './scenes/missions/MatchMission.js';
import { PalletMission } from './scenes/missions/PalletMission.js';
import { LoadingMission } from './scenes/missions/LoadingMission.js';

async function loadFonts() {
  if (!document.fonts) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('400 20px "Noto Sans Georgian"', 'ქარხანა Aa1'),
        document.fonts.load('700 20px "Noto Sans Georgian"', 'ქარხანა Aa1'),
      ]),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
  } catch (e) {
    /* fall back to system fonts */
  }
}

async function start() {
  await loadFonts();
  document.getElementById('loading')?.remove();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: COLORS.bg,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    dom: { createContainer: true },
    physics: { default: 'arcade', arcade: { debug: false } },
    input: { activePointers: 2 },
    scene: [
      BootScene, MenuScene, CharacterScene, WardrobeScene, ZoneScene,
      PathMission, SpotMission, DecisionMission, AlarmMission, MatchMission, PalletMission, LoadingMission,
      FinalTestScene, ResultScene, HudScene,
      MapScene, SettingsScene, HelpScene, InventoryScene, ConfirmScene,
    ],
  });
  Router.init(game);
  // Debug handles (handy for QA from the browser console).
  window.__game = game;
  window.__router = Router;
  window.__state = (await import('./state/GameState.js')).GameState;

  // Browsers only allow audio after a user gesture.
  const unlock = () => Sound.unlock();
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

start();
