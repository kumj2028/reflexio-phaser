import Phaser from 'phaser';

// Timing constants ported from GameEngine.cs
const FADE_IN   = 1000;  // 60 frames at 60fps
const STAY      = 3000;  // 180 frames
const FADE_OUT  = 2000;  // 120 frames
const WAIT      = 1000;  // 60 frames

export class SplashScene extends Phaser.Scene {
  constructor() {
    super('SplashScene');
  }

  create() {
    const { width: sw, height: sh } = this.scale;
    const size = Math.min(sw, sh);
    const ox = (sw - size) / 2;
    const oy = (sh - size) / 2;

    this.add.rectangle(0, 0, sw, sh, 0x000000).setOrigin(0);

    this.jellyfish = this.add.image(ox + size / 2, oy + size / 2, 'box_jellyfish')
      .setDisplaySize(size, size)
      .setAlpha(0);

    // Browser blocks audio until first user gesture — show a prompt and wait.
    const promptFs = Math.round(Math.min(sw, sh) / 30);
    this._prompt = this.add.text(sw / 2, sh - promptFs * 2, 'Click or press any key to start', {
      color: '#555555', fontFamily: 'monospace', fontSize: `${promptFs}px`
    }).setOrigin(0.5);

    const onGesture = () => {
      this._prompt.destroy();
      this._prompt = null;
      try { this.sound.play('box_jellyfish_music'); } catch { /* audio unavailable */ }
      this._startFade();
    };

    this.input.once('pointerdown', onGesture);
    this.input.keyboard.once('keydown', onGesture);
  }

  _startFade() {
    this.tweens.add({
      targets: this.jellyfish,
      alpha: 1,
      duration: FADE_IN,
      onComplete: () => {
        this.time.delayedCall(STAY, () => {
          this.tweens.add({
            targets: this.jellyfish,
            alpha: 0,
            duration: FADE_OUT,
            onComplete: () => {
              this.time.delayedCall(WAIT, () => this._advance());
            }
          });
        });
      }
    });

    // After gesture: skip to main menu on next click/key
    this.input.once('pointerdown', () => this._skip());
    this.input.keyboard.once('keydown', () => this._skip());
  }

  _skip() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this._advance();
  }

  _advance() {
    this.scene.start('MainMenuScene');
  }
}
