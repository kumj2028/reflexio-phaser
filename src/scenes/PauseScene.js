import Phaser from 'phaser';
import { createTouchOverlay, syncEyeBtn } from '../ui/touchOverlay.js';
import { eyeTracking } from '../state/EyeTrackingState.js';

function makeToScreen(sw, sh) {
  const s = Math.min(sw / 650, sh / 650, 1);
  const ox = (sw - s * 650) / 2;
  const oy = (sh - s * 650) / 2;
  return (x650, y650) => ({ x: x650 * s + ox, y: y650 * s + oy, s });
}

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  init(data) {
    this._gameSceneKey = data?.gameSceneKey ?? 'GameScene';
    this._levelFile    = data?.levelFile;
    this._levelIdx     = data?.levelIdx ?? 0;
    this._noResume     = data?.noResume  ?? false;
  }

  create() {
    const { width: sw, height: sh } = this.scale;
    const ts = makeToScreen(sw, sh);

    this.add.rectangle(sw / 2, sh / 2, sw, sh, 0x000000, 0.65).setOrigin(0.5);

    this._items = [];
    if (!this._noResume) {
      this._items.push({ id: 'resume',  onKey: 'resumeOn',  offKey: 'resumeOff' });
    }
    this._items.push({ id: 'restart', onKey: 'restartOn', offKey: 'restartOff' });
    this._items.push({ id: 'quit',    onKey: 'quitOn',    offKey: 'quitOff' });

    this._current = 0;
    this._sprites = [];

    let y650 = 230;
    const padding650 = 20;
    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i];
      const key = i === this._current ? item.onKey : item.offKey;
      const pos = ts(325, y650);
      const sp = this.add.image(pos.x, pos.y, key).setOrigin(0.5).setScale(pos.s);
      sp.setInteractive().on('pointerdown', () => { this._current = i; this._select(); });
      this._sprites.push(sp);
      y650 += (sp.height + padding650);
    }

    this.cursors  = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey('ENTER');
    this.spaceKey = this.input.keyboard.addKey('SPACE');
    this.escKey   = this.input.keyboard.addKey('ESC');

    const _to = createTouchOverlay(this.game.canvas, 'menu', {
      initialEyeOn: eyeTracking.isEnabled(),
      topRightOffset: 182,
      onUp:         () => { this._move(-1); },
      onDown:       () => { this._move(1); },
      onConfirm:    () => { this._select(); },
      onBack:       () => { if (!this._noResume) this._resume(); },
      onMenu:       () => { if (!this._noResume) this._resume(); },
      onToggleEye:  (el) => { syncEyeBtn(el, eyeTracking.toggle()); },
      onCalibrate:  () => { /* calibration available in game, not pause */ },
    });
    this._touch = _to;
    this.events.once('shutdown', () => this._touch?.destroy());
  }

  _move(delta) {
    const prev = this._current;
    this._current = (this._current + delta + this._items.length) % this._items.length;
    if (this._current !== prev) {
      this._sprites[prev].setTexture(this._items[prev].offKey);
      this._sprites[this._current].setTexture(this._items[this._current].onKey);
    }
  }

  update() {
    const { JustDown } = Phaser.Input.Keyboard;
    if (JustDown(this.escKey) && !this._noResume) { this._resume(); return; }
    if (JustDown(this.cursors.up))   { this._move(-1); return; }
    if (JustDown(this.cursors.down)) { this._move(1);  return; }
    if (JustDown(this.enterKey) || JustDown(this.spaceKey)) { this._select(); }
  }

  _select() {
    const id = this._items[this._current].id;
    if (id === 'resume') {
      this._resume();
    } else if (id === 'restart') {
      this.scene.stop(this._gameSceneKey);
      this.scene.stop();
      this.scene.start(this._gameSceneKey, { levelFile: this._levelFile, levelIdx: this._levelIdx });
    } else if (id === 'quit') {
      this.scene.stop(this._gameSceneKey);
      this.scene.stop();
      this.scene.start('MainMenuScene');
    }
  }

  _resume() {
    this.scene.resume(this._gameSceneKey);
    this.scene.stop();
  }
}
