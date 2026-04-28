import Phaser from 'phaser';
import { progress } from '../state/ProgressState.js';
import { createTouchOverlay, syncEyeBtn } from '../ui/touchOverlay.js';
import { eyeTracking } from '../state/EyeTrackingState.js';

function makeToScreen(sw, sh) {
  const s = Math.min(sw / 650, sh / 650, 1);
  const ox = (sw - s * 650) / 2;
  const oy = (sh - s * 650) / 2;
  return (x650, y650) => ({ x: x650 * s + ox, y: y650 * s + oy, s });
}

const WORLDS = [
  { num: 1, scene: 'WorldMenuScene', startIdx: 0 },
  { num: 2, scene: 'WorldMenuScene', startIdx: 8 },
  { num: 3, scene: 'WorldMenuScene', startIdx: 16 },
  { num: 4, scene: 'WorldMenuScene', startIdx: 24 },
  { num: 5, scene: 'WorldMenuScene', startIdx: 32 },
  { num: 6, scene: 'WorldMenuScene', startIdx: 40 },
  { num: 7, scene: 'WorldMenuScene', startIdx: 48 },
];

export class LevelMenuScene extends Phaser.Scene {
  constructor() {
    super('LevelMenuScene');
  }

  create() {
    const { width: sw, height: sh } = this.scale;
    const ts = makeToScreen(sw, sh);
    const center = ts(325, 325);

    // Animated background
    if (!this.anims.exists('mainbkg_anim')) {
      this.anims.create({
        key: 'mainbkg_anim',
        frames: this.anims.generateFrameNumbers('mainbkg', { start: 0, end: 11 }),
        frameRate: 4,
        repeat: -1
      });
    }
    this.bgSprite = this.add.sprite(center.x, center.y, 'mainbkg', 0)
      .setDisplaySize(center.s * 650, center.s * 650);
    this.bgSprite.play('mainbkg_anim');

    this._ensureBgm();

    // Build items: World 1-7 + Back
    this._items = [];
    for (const w of WORLDS) {
      const unlocked = progress.isWorldUnlocked(w.num);
      this._items.push({
        id: `world${w.num}`,
        startIdx: w.startIdx,
        unlocked,
        onKey:  unlocked ? `world${w.num}On`  : `world${w.num}OnLocked`,
        offKey: unlocked ? `world${w.num}Off` : `world${w.num}OffLocked`,
      });
    }
    this._items.push({ id: 'back', onKey: 'mainmenuOn', offKey: 'mainmenuOff' });

    this._current = 0;
    this._sprites = [];

    let y650 = 216;
    const padding650 = 20;
    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i];
      const key = i === this._current ? item.onKey : item.offKey;
      const pos = ts(325, y650);
      const sp = this.add.image(pos.x, pos.y, key).setOrigin(0.5).setScale(pos.s);
      this._sprites.push(sp);
      y650 += (sp.height + padding650);
    }

    this.cursors  = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey('ENTER');
    this.spaceKey = this.input.keyboard.addKey('SPACE');
    this.escKey   = this.input.keyboard.addKey('ESC');

    const _to = createTouchOverlay(this.game.canvas, 'menu', {
      initialEyeOn: eyeTracking.isEnabled(),
      onUp:         () => { this._move(-1); },
      onDown:       () => { this._move(1); },
      onConfirm:    () => { this._select(); },
      onBack:       () => { this.scene.start('MainMenuScene'); },
      onMenu:       () => { this.scene.start('MainMenuScene'); },
      onToggleEye:  (el) => { syncEyeBtn(el, eyeTracking.toggle()); },
      onCalibrate:  () => { /* calibration only available in-game */ },
    });
    this._touch = _to;
    this.events.once('shutdown', () => this._touch?.destroy());
  }

  _ensureBgm() {
    try {
      if (!this.sound.get('meadows')?.isPlaying) {
        this.sound.stopAll();
        this.sound.play('meadows', { loop: true });
      }
    } catch { /* ignore */ }
  }

  _move(delta) {
    const prev = this._current;
    this._current = (this._current + delta + this._items.length) % this._items.length;
    if (this._current !== prev) {
      this._sprites[prev].setTexture(this._items[prev].offKey);
      this._sprites[this._current].setTexture(this._items[this._current].onKey);
      try { this.sound.play('click'); } catch { /* ignore */ }
    }
  }

  update() {
    const { JustDown } = Phaser.Input.Keyboard;
    if (JustDown(this.cursors.up))   { this._move(-1); return; }
    if (JustDown(this.cursors.down)) { this._move(1);  return; }
    if (JustDown(this.escKey))       { this.scene.start('MainMenuScene'); return; }
    if (JustDown(this.enterKey) || JustDown(this.spaceKey)) { this._select(); }
  }

  _select() {
    try { this.sound.play('click'); } catch { /* ignore */ }
    const item = this._items[this._current];
    if (item.id === 'back') {
      this.scene.start('MainMenuScene');
    } else if (item.unlocked) {
      this.scene.start('WorldMenuScene', { startIdx: item.startIdx });
    }
  }
}
