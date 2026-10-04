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

const game = new Phaser.Game(config);

/**
 * iOS standalone web apps resume with stale viewport metrics: vh and dvh can
 * still report the pre-background orientation. Scale.FIT then sizes the canvas
 * to a #game parent larger than the screen and the game looks zoomed in. The
 * scale manager polls the parent rect, but the rect is consistently wrong, so
 * polling never corrects it.
 *
 * Drive the parent from measured pixels instead of CSS units, and re-measure on
 * every event that can follow a resume.
 */
const parent = document.getElementById('game');

function viewportSize() {
  const vv = window.visualViewport;
  let w = window.innerWidth;
  let h = window.innerHeight;
  // visualViewport is authoritative only when the page is not pinch-zoomed.
  // Under zoom it reports the magnified sub-rect, which must not drive layout.
  if (vv && Math.abs(vv.scale - 1) < 0.01) {
    w = Math.min(w, vv.width);
    h = Math.min(h, vv.height);
  }
  return { w: Math.round(w), h: Math.round(h) };
}

function syncViewport() {
  if (!parent || !game.scale) return;
  const { w, h } = viewportSize();
  if (!w || !h) return;
  parent.style.width  = `${w}px`;
  parent.style.height = `${h}px`;
  game.scale.setParentSize(w, h);
  game.scale.refresh();
}

// iOS reports the old metrics for a frame or two after a resume, so measure
// again on the next frame and once more after the orientation settles.
function resyncViewport() {
  window.scrollTo(0, 0);
  syncViewport();
  requestAnimationFrame(syncViewport);
  setTimeout(syncViewport, 350);
}

window.addEventListener('resize',            resyncViewport);
window.addEventListener('orientationchange', resyncViewport);
window.addEventListener('pageshow',          resyncViewport);
window.addEventListener('focus',             resyncViewport);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) resyncViewport();
});
window.visualViewport?.addEventListener('resize', resyncViewport);
window.visualViewport?.addEventListener('scroll', resyncViewport);

game.events.once(Phaser.Core.Events.READY, resyncViewport);
