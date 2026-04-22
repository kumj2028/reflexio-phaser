import Phaser from 'phaser';
import { LEVEL_LIST } from '../loader/levelList.js';
import { progress } from '../state/ProgressState.js';

// Coordinate helper: 650-unit design space → screen pixels
function makeToScreen(sw, sh) {
  const s = Math.min(sw / 650, sh / 650, 1);
  const ox = (sw - s * 650) / 2;
  const oy = (sh - s * 650) / 2;
  return (x650, y650) => ({ x: x650 * s + ox, y: y650 * s + oy, s });
}

// Thumbnail display size in 650-space units
const THUMB_SIZE = 72;
// Column x positions for a 4-wide grid starting at x=150, spacing=85
const COL_X = [150, 235, 320, 405];
const ROW1_Y = 425;
const ROW2_Y = 535;
// Large preview position (top-left in 650-space)
const PREVIEW_TL_X = 175;
const PREVIEW_TL_Y = 25;
const PREVIEW_SIZE = 260;

export class WorldMenuScene extends Phaser.Scene {
  constructor() {
    super('WorldMenuScene');
  }

  init(data) {
    this._startIdx = data?.startIdx ?? 0;
  }

  create() {
    const { width: sw, height: sh } = this.scale;
    this._ts = makeToScreen(sw, sh);
    const ts = this._ts;
    const center = ts(325, 325);

    // Background
    const bgPos = ts(0, 0);
    this.add.image(bgPos.x + center.s * 325, bgPos.y + center.s * 325, 'lvlselbkg')
      .setDisplaySize(center.s * 650, center.s * 650);

    this._ensureBgm();

    // Build level entries for this world (up to 8)
    this._levels = [];
    for (let i = this._startIdx; i < this._startIdx + 8 && i < LEVEL_LIST.length; i++) {
      this._levels.push({ idx: i, entry: LEVEL_LIST[i] });
    }
    this._len = this._levels.length;
    this._current = 0;

    // Large preview image
    const previewPos = ts(PREVIEW_TL_X + PREVIEW_SIZE / 2, PREVIEW_TL_Y + PREVIEW_SIZE / 2);
    this._previewImg = this.add.image(previewPos.x, previewPos.y, this._getPreviewKey(0))
      .setDisplaySize(center.s * PREVIEW_SIZE, center.s * PREVIEW_SIZE);

    // Title text image (shown below preview)
    const titlePos = ts(325, 350);
    this._titleImg = this.add.image(titlePos.x, titlePos.y, this._getTitleKey(0))
      .setOrigin(0.5)
      .setScale(center.s);

    // Thumbnail sprites
    this._thumbs = [];
    for (let i = 0; i < 8; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const y650 = row === 0 ? ROW1_Y : ROW2_Y;
      const pos = ts(COL_X[col], y650);

      if (i < this._len) {
        const thumbKey = this._getThumbKey(i);
        const sp = this.add.image(pos.x, pos.y, thumbKey)
          .setOrigin(0.5)
          .setDisplaySize(center.s * THUMB_SIZE, center.s * THUMB_SIZE);
        this._thumbs.push(sp);
      } else {
        this._thumbs.push(null);
      }
    }

    // Selection highlight box
    this._selBox = this.add.rectangle(0, 0, center.s * THUMB_SIZE + 6, center.s * THUMB_SIZE + 6, 0xffffff, 0)
      .setStrokeStyle(3, 0xffffff);
    this._moveSelBox(0);

    // Back button text
    const backPos = ts(325, 615);
    this._backText = this.add.text(backPos.x, backPos.y, '< Back', {
      color: '#eeeeee', fontFamily: 'monospace', fontSize: `${Math.round(center.s * 18)}px`
    }).setOrigin(0.5);

    this._backHighlight = false;

    this.cursors  = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey('ENTER');
    this.spaceKey = this.input.keyboard.addKey('SPACE');
    this.escKey   = this.input.keyboard.addKey('ESC');
  }

  _getPreviewKey(localIdx) {
    if (localIdx < 0 || localIdx >= this._len) return 'lvlselbkg';
    const { entry, idx } = this._levels[localIdx];
    if (progress.isCompleted(idx)) return entry.title;
    return entry.title;
  }

  _getThumbKey(localIdx) {
    if (localIdx >= this._len) return null;
    const { entry, idx } = this._levels[localIdx];
    const done = progress.isCompleted(idx);
    return done ? `${entry.title}_small_check` : `${entry.title}_bw`;
  }

  _getTitleKey(localIdx) {
    if (localIdx < 0 || localIdx >= this._len) return 'lvlselbkg';
    return `${this._levels[localIdx].entry.title}_text`;
  }

  _moveSelBox(localIdx) {
    const col = localIdx % 4;
    const row = Math.floor(localIdx / 4);
    const y650 = row === 0 ? ROW1_Y : ROW2_Y;
    const pos = this._ts(COL_X[col], y650);
    this._selBox.setPosition(pos.x, pos.y);
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
    const prevCurrent = this._current;
    const prevBack = this._backHighlight;

    if (JustDown(this.escKey)) {
      this.scene.start('LevelMenuScene');
      return;
    }

    if (JustDown(this.enterKey) || JustDown(this.spaceKey)) {
      this._select();
      return;
    }

    if (this._backHighlight) {
      if (JustDown(this.cursors.up)) {
        this._backHighlight = false;
        this._current = Math.min(4, this._len - 1); // top of row 2
        this._updateUI(prevCurrent, prevBack);
      }
    } else {
      if (JustDown(this.cursors.left)) {
        const row = Math.floor(this._current / 4);
        const col = this._current % 4;
        const newCol = (col - 1 + 4) % 4;
        this._current = row * 4 + newCol;
        if (this._current >= this._len) this._current = row * 4;
        this._updateUI(prevCurrent, prevBack);
      } else if (JustDown(this.cursors.right)) {
        const row = Math.floor(this._current / 4);
        const col = this._current % 4;
        const newCol = (col + 1) % 4;
        const candidate = row * 4 + newCol;
        if (candidate < this._len) this._current = candidate;
        else this._current = row * 4;
        this._updateUI(prevCurrent, prevBack);
      } else if (JustDown(this.cursors.up)) {
        if (this._current >= 4) {
          this._current -= 4;
          this._updateUI(prevCurrent, prevBack);
        }
      } else if (JustDown(this.cursors.down)) {
        const next = this._current + 4;
        if (next < this._len) {
          this._current = next;
          this._updateUI(prevCurrent, prevBack);
        } else if (this._current < 4) {
          this._backHighlight = true;
          this._updateUI(prevCurrent, prevBack);
        } else {
          this._backHighlight = true;
          this._updateUI(prevCurrent, prevBack);
        }
      }
    }
  }

  _updateUI(prevCurrent, prevBack) {
    if (this._current !== prevCurrent || this._backHighlight !== prevBack) {
      try { this.sound.play('click'); } catch { /* ignore */ }
    }

    if (this._backHighlight) {
      this._selBox.setVisible(false);
      this._backText.setStyle({ color: '#ffff44' });
    } else {
      this._selBox.setVisible(true);
      this._backText.setStyle({ color: '#eeeeee' });
      this._moveSelBox(this._current);

      // Update preview and title
      const previewKey = this._getPreviewKey(this._current);
      if (this.textures.exists(previewKey)) this._previewImg.setTexture(previewKey);

      const titleKey = this._getTitleKey(this._current);
      if (this.textures.exists(titleKey)) this._titleImg.setTexture(titleKey);
    }
  }

  _select() {
    try { this.sound.play('click'); } catch { /* ignore */ }
    if (this._backHighlight) {
      this.scene.start('LevelMenuScene');
      return;
    }
    if (this._current < this._len) {
      const { entry, idx } = this._levels[this._current];
      this.scene.start('GameScene', { levelFile: entry.file, levelIdx: idx });
    }
  }
}
