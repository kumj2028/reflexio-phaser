import Phaser from 'phaser';
import { TEXTURE_REGISTRY } from '../loader/textureRegistry.js';
import { SPRITESHEET_REGISTRY } from '../loader/spritesheetRegistry.js';
import { AUDIO_REGISTRY } from '../loader/audioRegistry.js';

/**
 * PreloadScene: loads every texture in the registry up front.
 *
 * Phaser's loader keys map 1:1 to our texture registry names, so game code
 * can do `scene.add.image(x, y, 'block_orange')` using the same string the
 * level XML uses.
 *
 * Textures listed in SPRITESHEET_REGISTRY are loaded as spritesheets so we
 * can address individual animation frames (e.g. frame 0 of the walk strip
 * for a static player sprite).
 *
 * Session 1 loads everything eagerly. A later pass could split into per-world
 * bundles if load time becomes a concern.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    // Simple progress text on a black background
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0);
    const progressText = this.add.text(width / 2, height / 2, 'Loading...', {
      color: '#eeeeee',
      fontFamily: 'monospace',
      fontSize: '24px'
    }).setOrigin(0.5);

    this.load.on('progress', (v) => {
      progressText.setText(`Loading... ${Math.round(v * 100)}%`);
    });

    for (const [key, path] of Object.entries(TEXTURE_REGISTRY)) {
      const sheet = SPRITESHEET_REGISTRY[key];
      if (sheet) {
        this.load.spritesheet(key, path, {
          frameWidth:  sheet.frameW,
          frameHeight: sheet.frameH
        });
      } else {
        this.load.image(key, path);
      }
    }

    for (const [key, path] of Object.entries(AUDIO_REGISTRY)) {
      this.load.audio(key, path);
    }

    this.load.on('loaderror', (file) => {
      console.warn('Asset failed to load:', file.key, file.src);
    });
  }

  create() {
    this.scene.start('SplashScene');
  }
}
