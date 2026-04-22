import Phaser from 'phaser';
import { progress } from '../state/ProgressState.js';
import { LEVEL_LIST } from '../loader/levelList.js';

// Convert 650-unit reference space to screen pixels.
function makeToScreen(sw, sh) {
  const s = Math.min(sw / 650, sh / 650, 1);
  const ox = (sw - s * 650) / 2;
  const oy = (sh - s * 650) / 2;
  return (x650, y650) => ({ x: x650 * s + ox, y: y650 * s + oy, s });
}

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  create() {
    const { width: sw, height: sh } = this.scale;
    const ts = makeToScreen(sw, sh);
    const center = ts(325, 325);

    // Animated background
    this.bgSprite = this.add.sprite(center.x, center.y, 'mainbkg', 0)
      .setDisplaySize(center.s * 650, center.s * 650);

    if (!this.anims.exists('mainbkg_anim')) {
      this.anims.create({
        key: 'mainbkg_anim',
        frames: this.anims.generateFrameNumbers('mainbkg', { start: 0, end: 11 }),
        frameRate: 4,
        repeat: -1
      });
    }
    this.bgSprite.play('mainbkg_anim');

    this._startBgm();

    const hasProgress = progress.hasProgress();
    this._items = [
      { id: 'start',    onKey: hasProgress ? 'continueOn'      : 'startOn',    offKey: hasProgress ? 'continueOff'      : 'startOff' },
      { id: 'levels',   onKey: 'levelselectOn',  offKey: 'levelselectOff' },
      { id: 'controls', onKey: 'controlsOn',     offKey: 'controlsOff' },
      { id: 'achieve',  onKey: 'achievementsOn', offKey: 'achievementsOff' },
      { id: 'credits',  onKey: 'creditsOn',      offKey: 'creditsOff' },
      { id: 'exit',     onKey: 'exitOn',         offKey: 'exitOff' },
    ];
    this._current = 0;
    this._sprites = [];

    // Layout: items centered at x=325, stacked from y=216 with padding=20
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
  }

  _startBgm() {
    try {
      const existing = this.sound.get('meadows');
      if (!existing?.isPlaying) {
        this.sound.stopAll();
        this.sound.play('meadows', { loop: true });
      }
    } catch { /* audio unavailable */ }
  }

  update() {
    const { JustDown } = Phaser.Input.Keyboard;
    const prev = this._current;

    if (JustDown(this.cursors.up)) {
      this._current = (this._current - 1 + this._items.length) % this._items.length;
    } else if (JustDown(this.cursors.down)) {
      this._current = (this._current + 1) % this._items.length;
    } else if (JustDown(this.enterKey) || JustDown(this.spaceKey)) {
      this._select();
      return;
    }

    if (this._current !== prev) {
      this._sprites[prev].setTexture(this._items[prev].offKey);
      this._sprites[this._current].setTexture(this._items[this._current].onKey);
      this._playClick();
    }
  }

  _playClick() {
    try { this.sound.play('click'); } catch { /* ignore */ }
  }

  _select() {
    this._playClick();
    const id = this._items[this._current].id;
    if (id === 'start') {
      const idx = progress.getStartingLevel();
      const entry = LEVEL_LIST[Math.min(idx, LEVEL_LIST.length - 1)];
      this.scene.start('GameScene', { levelFile: entry.file, levelIdx: idx });
    } else if (id === 'levels') {
      this.scene.start('LevelMenuScene');
    } else if (id === 'controls') {
      this.scene.start('ControlsScene');
    } else if (id === 'achieve') {
      this.scene.start('AchievementsScene');
    } else if (id === 'credits') {
      this.scene.start('GameScene', { levelFile: 'credits_level.xml', levelIdx: -1 });
    } else if (id === 'exit') {
      this.scene.start('SplashScene');
    }
  }
}
