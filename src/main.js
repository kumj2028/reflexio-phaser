import Phaser from 'phaser';
import { PreloadScene }      from './scenes/PreloadScene.js';
import { SplashScene }       from './scenes/SplashScene.js';
import { MainMenuScene }     from './scenes/MainMenuScene.js';
import { LevelMenuScene }    from './scenes/LevelMenuScene.js';
import { WorldMenuScene }    from './scenes/WorldMenuScene.js';
import { ControlsScene }     from './scenes/ControlsScene.js';
import { AchievementsScene } from './scenes/AchievementsScene.js';
import { PauseScene }        from './scenes/PauseScene.js';
import { WinScene }          from './scenes/WinScene.js';
import { GameScene }         from './scenes/GameScene.js';
import { TestScene }         from './scenes/TestScene.js';

/**
 * Reflexio render surface: the original game window is a 650x650 play area
 * (13 meters * 50 px/m) plus some chrome. We target 800x700 to leave room
 * for HUD text around the edges.
 */
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 800,
  height: 700,
  backgroundColor: '#000000',
  physics: {
    default: 'matter',
    matter: {
      // Gravity set per-level from XML. debug:true shows body outlines.
      gravity: { x: 0, y: 1 },
      debug: false
    }
  },
  scene: [
    PreloadScene,
    SplashScene,
    MainMenuScene,
    LevelMenuScene,
    WorldMenuScene,
    ControlsScene,
    AchievementsScene,
    PauseScene,
    WinScene,
    GameScene,
    TestScene
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);
