import Phaser from 'phaser';
import { createTouchOverlay } from '../ui/touchOverlay.js';

function makeToScreen(sw, sh) {
  const s = Math.min(sw / 650, sh / 650, 1);
  const ox = (sw - s * 650) / 2;
  const oy = (sh - s * 650) / 2;
  return (x650, y650) => ({ x: x650 * s + ox, y: y650 * s + oy, s });
}

export class ControlsScene extends Phaser.Scene {
  constructor() {
    super('ControlsScene');
  }

  create() {
    const { width: sw, height: sh } = this.scale;
    const ts = makeToScreen(sw, sh);
    const center = ts(325, 325);

    // Animated background, same as main/level menus
    if (!this.anims.exists('mainbkg_anim')) {
      this.anims.create({
        key: 'mainbkg_anim',
        frames: this.anims.generateFrameNumbers('mainbkg', { start: 0, end: 11 }),
        frameRate: 4,
        repeat: -1
      });
    }
    this.add.sprite(center.x, center.y, 'mainbkg', 0)
      .setDisplaySize(center.s * 650, center.s * 650)
      .play('mainbkg_anim');

    this._ensureBgm();

    // Port of ControlMenu.cs: three items, selecting KB/Xbox launches a level
    this._items = [
      { id: 'keyboard', onKey: 'keyboardOn', offKey: 'keyboardOff' },
      { id: 'xbox',     onKey: 'xboxOn',     offKey: 'xboxOff' },
      { id: 'back',     onKey: 'mainmenuOn', offKey: 'mainmenuOff' },
    ];
    this._current = 0;
    this._sprites = [];

    let y650 = 216;
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
      onUp:      () => { this._move(-1); },
      onDown:    () => { this._move(1); },
      onConfirm: () => { this._select(); },
      onBack:    () => { this.scene.start('MainMenuScene'); },
      onMenu:    () => { this.scene.start('MainMenuScene'); },
    });
    this.events.once('shutdown', () => _to.destroy());
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

  _ensureBgm() {
    try {
      if (!this.sound.get('meadows')?.isPlaying) {
        this.sound.stopAll();
        this.sound.play('meadows', { loop: true });
      }
    } catch { /* ignore */ }
  }

  update() {
    const { JustDown } = Phaser.Input.Keyboard;
    const prev = this._current;

    if (JustDown(this.escKey))                              { this.scene.start('MainMenuScene'); return; }
    if (JustDown(this.enterKey) || JustDown(this.spaceKey)) { this._select(); return; }
    if (JustDown(this.cursors.up))   this._move(-1);
    if (JustDown(this.cursors.down)) this._move(1);
  }

  _select() {
    try { this.sound.play('click'); } catch { /* ignore */ }
    const id = this._items[this._current].id;
    if (id === 'keyboard') {
      this.scene.start('GameScene', { levelFile: 'keyboard_controls.xml', levelIdx: -1 });
    } else if (id === 'xbox') {
      this.scene.start('GameScene', { levelFile: 'xbox_controls.xml', levelIdx: -1 });
    } else if (id === 'back') {
      this.scene.start('MainMenuScene');
    }
  }
}
