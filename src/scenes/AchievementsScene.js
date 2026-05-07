import Phaser from 'phaser';
import { ACHIEVEMENTS, achievements } from '../state/AchievementState.js';
import { createTouchOverlay } from '../ui/touchOverlay.js';

function makeToScreen(sw, sh) {
  const s = Math.min(sw / 650, sh / 650, 1);
  const ox = (sw - s * 650) / 2;
  const oy = (sh - s * 650) / 2;
  return (x650, y650) => ({ x: x650 * s + ox, y: y650 * s + oy, s });
}

// Layout constants ported from SingleItemMenu.cs
const IMG_X       = 325;
const IMG_Y       = 200;
const LEFT_ARR_X  = 150;
const LEFT_ARR_Y  = 250;
const RIGHT_ARR_X = 500;
const RIGHT_ARR_Y = 250;
const DESC_X      = 325;
const DESC_Y      = 425;
const MENU_X      = 325;
const MENU_Y      = 575;

export class AchievementsScene extends Phaser.Scene {
  constructor() {
    super('AchievementsScene');
  }

  create() {
    const { width: sw, height: sh } = this.scale;
    const ts = makeToScreen(sw, sh);

    // Background
    const center = ts(325, 325);
    this.add.image(center.x, center.y, 'lvlselbkg')
      .setDisplaySize(center.s * 650, center.s * 650)
      .setOrigin(0.5);

    // Achievement icon (swapped per selection)
    const imgPos = ts(IMG_X, IMG_Y);
    this._icon = this.add.image(imgPos.x, imgPos.y, 'ach_locked')
      .setOrigin(0.5).setScale(imgPos.s);

    // Description image (swapped per selection)
    const descPos = ts(DESC_X, DESC_Y);
    this._desc = this.add.image(descPos.x, descPos.y, 'n00b_desc')
      .setOrigin(0.5).setScale(descPos.s);

    // Left / right arrows
    const lPos = ts(LEFT_ARR_X, LEFT_ARR_Y);
    this.add.image(lPos.x, lPos.y, 'ach_left_arrow').setOrigin(0.5).setScale(lPos.s)
      .setInteractive().on('pointerdown', () => this._move(-1));

    const rPos = ts(RIGHT_ARR_X, RIGHT_ARR_Y);
    this.add.image(rPos.x, rPos.y, 'ach_right_arrow').setOrigin(0.5).setScale(rPos.s)
      .setInteractive().on('pointerdown', () => this._move(1));

    // Main menu button
    const mPos = ts(MENU_X, MENU_Y);
    this._menuBtn = this.add.image(mPos.x, mPos.y, 'mainmenuOn')
      .setOrigin(0.5).setScale(mPos.s);
    this._menuBtn.setInteractive().on('pointerdown', () => this.scene.start('MainMenuScene'));

    this._current = 0;
    this._refresh();

    this.cursors  = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey('ENTER');
    this.spaceKey = this.input.keyboard.addKey('SPACE');
    this.escKey   = this.input.keyboard.addKey('ESC');

    const _to = createTouchOverlay(this.game.canvas, 'menu', {
      onUp:      () => { this._move(-1); },
      onDown:    () => { this._move(1); },
      onConfirm: () => { this.scene.start('MainMenuScene'); },
      onBack:    () => { this.scene.start('MainMenuScene'); },
      onMenu:    () => { this.scene.start('MainMenuScene'); },
    });
    this.events.once('shutdown', () => _to.destroy());
  }

  _move(delta) {
    const prev = this._current;
    this._current = (this._current + delta + ACHIEVEMENTS.length) % ACHIEVEMENTS.length;
    if (this._current !== prev) {
      this._refresh();
      try { this.sound.play('click'); } catch { /* ignore */ }
    }
  }

  update() {
    const { JustDown } = Phaser.Input.Keyboard;

    if (JustDown(this.escKey) || JustDown(this.enterKey) || JustDown(this.spaceKey)) {
      this.scene.start('MainMenuScene'); return;
    }
    if (JustDown(this.cursors.left)  || JustDown(this.cursors.up))   this._move(-1);
    if (JustDown(this.cursors.right) || JustDown(this.cursors.down)) this._move(1);
  }

  _refresh() {
    const ach = ACHIEVEMENTS[this._current];
    const unlocked = achievements.isUnlocked(ach.id);
    this._icon.setTexture(unlocked ? ach.icon : 'ach_locked');
    this._desc.setTexture(`${ach.id}_desc`);
  }
}
