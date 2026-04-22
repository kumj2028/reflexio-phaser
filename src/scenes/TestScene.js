import Phaser from 'phaser';
import { loadLevel } from '../loader/levelLoader.js';
import '../objects/index.js';  // triggers registerClass side effects
import { Spike } from '../objects/Spike.js';
import { Door } from '../objects/Door.js';
import { Player } from '../objects/Player.js';
import { SPRITESHEET_REGISTRY } from '../loader/spritesheetRegistry.js';

/**
 * TestScene: Session 1 deliverable.
 *
 * Loads block_intro.xml and renders every object as a static sprite at its
 * correct screen position. No physics, no input, no reflection - just a
 * visual sanity check that:
 *   (a) the XML loader instantiates every tag type
 *   (b) the coordinate system converts tile -> meters -> pixels correctly
 *   (c) every texture the level references is in the registry
 *
 * Also renders a faint grid overlay and tile coordinates so we can verify
 * positions match the XML.
 */
export class TestScene extends Phaser.Scene {
  constructor() {
    super('TestScene');
    this.level = null;
    this.levelFile = 'block_intro.xml';  // overridable via init() data
  }

  init(data) {
    if (data && data.levelFile) this.levelFile = data.levelFile;
  }

  async create() {
    // Placeholder while the XML loads
    const { width: sw, height: sh } = this.scale;
    const loadingText = this.add.text(sw / 2, sh / 2, `Parsing ${this.levelFile}...`, {
      color: '#eeeeee',
      fontFamily: 'monospace',
      fontSize: '18px'
    }).setOrigin(0.5);

    let level;
    try {
      level = await loadLevel(this.levelFile);
    } catch (e) {
      loadingText.setText(`Load failed: ${e.message}`);
      console.error(e);
      return;
    }
    loadingText.destroy();
    this.level = level;

    this.renderLevel(level);
  }

  renderLevel(level) {
    const dims = level.dims;
    const screen = dims.screenSizePx();

    // Center the play area in the canvas
    const { width: sw, height: sh } = this.scale;
    const offsetX = Math.floor((sw - screen.w) / 2);
    const offsetY = Math.floor((sh - screen.h) / 2);

    // Root container so everything positions relative to the play area corner
    const root = this.add.container(offsetX, offsetY);

    // Background
    if (level.bkgImage && this.textures.exists(level.bkgImage)) {
      const bkg = this.add.image(0, 0, level.bkgImage).setOrigin(0);
      bkg.setDisplaySize(screen.w, screen.h);
      root.add(bkg);
    } else {
      const bkg = this.add.rectangle(0, 0, screen.w, screen.h, 0x1a1a2a).setOrigin(0);
      root.add(bkg);
    }

    // Grid overlay
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x334455, 0.4);
    const tileW = dims.rowScale * dims.scale;
    const tileH = dims.colScale * dims.scale;
    for (let i = 0; i <= dims.numRows; i++) {
      const x = i * tileW;
      grid.beginPath(); grid.moveTo(x, 0); grid.lineTo(x, screen.h); grid.strokePath();
    }
    for (let j = 0; j <= dims.numCols; j++) {
      const y = j * tileH;
      grid.beginPath(); grid.moveTo(0, y); grid.lineTo(screen.w, y); grid.strokePath();
    }
    root.add(grid);

    // Objects
    for (const obj of level.objects) {
      const sprite = this.renderObject(obj, dims);
      if (sprite) root.add(sprite);
    }

    // HUD outside the play area
    this.add.text(8, 8, `${this.levelFile}  |  ${dims.numRows}x${dims.numCols} grid  |  ${level.objects.length} objects`, {
      color: '#eeeeee',
      fontFamily: 'monospace',
      fontSize: '12px'
    });
    if (level.bkgText) {
      this.add.text(8, sh - 20, level.bkgText, {
        color: '#ffff88',
        fontFamily: 'monospace',
        fontSize: '12px'
      });
    }

    // Keyboard: press 1..9 to jump to a specific well-known level for quick testing
    this.input.keyboard.on('keydown', (ev) => {
      const shortcuts = {
        '1': 'tutorial_movement.xml',
        '2': 'tutorial_vertical.xml',
        '3': 'tutorial_horizontal.xml',
        '4': 'block_intro.xml',
        '5': 'switch_intro.xml',
        '6': 'hard_spider.xml'
      };
      if (shortcuts[ev.key]) {
        this.scene.restart({ levelFile: shortcuts[ev.key] });
      }
    });
  }

  /**
   * Produce a Phaser GameObject for a single level object.
   * Returns the GameObject so the caller can attach it to the container.
   */
  renderObject(obj, dims) {
    // Player: static render uses frame 0 of the idle strip (not the walk strip)
    // so the koala appears standing, not mid-animation-blur.
    if (obj instanceof Player) {
      return this.makeSprite(
        'idleStrip',
        obj.centerMeters, obj.widthMeters, obj.heightMeters, dims,
        0  // frame index
      );
    }

    // Spikes override texture by direction
    if (obj instanceof Spike) {
      const name = obj.textureNameForDirection() || obj.textureName;
      return this.makeSprite(name, obj.centerMeters, obj.widthMeters, obj.heightMeters, dims);
    }

    // Doors: initialize() already swapped textureName to closeDoorTextureName
    if (obj instanceof Door) {
      return this.makeSprite(obj.textureName, obj.centerMeters, obj.widthMeters, obj.heightMeters, dims);
    }

    // Everything else (Wall, Block, Switch, Key)
    return this.makeSprite(obj.textureName, obj.centerMeters, obj.widthMeters, obj.heightMeters, dims);
  }

  /**
   * Create an Image/Sprite gameobject centered at the given meter-space position,
   * sized to the given meter-space dimensions. For spritesheet textures, renders
   * the given frame index (default 0). Falls back to a magenta placeholder if
   * the texture is missing.
   */
  makeSprite(textureName, centerMeters, widthMeters, heightMeters, dims, frame = 0) {
    const cx = centerMeters.x * dims.scale;
    const cy = centerMeters.y * dims.scale;
    const w = widthMeters  * dims.scale;
    const h = heightMeters * dims.scale;

    if (!textureName || !this.textures.exists(textureName)) {
      const rect = this.add.rectangle(cx, cy, w, h, 0xff00ff, 0.6)
        .setStrokeStyle(1, 0x000000);
      if (textureName) {
        const label = this.add.text(cx, cy, textureName, {
          color: '#000',
          fontFamily: 'monospace',
          fontSize: '8px'
        }).setOrigin(0.5);
        const container = this.add.container(0, 0, [rect, label]);
        return container;
      }
      return rect;
    }
    // Spritesheet vs single image: use add.sprite with a frame for strips,
    // add.image for singles. add.sprite also works for non-strip textures but
    // paying the extra animation machinery is wasteful.
    const isStrip = !!SPRITESHEET_REGISTRY[textureName];
    const img = isStrip
      ? this.add.sprite(cx, cy, textureName, frame)
      : this.add.image(cx, cy, textureName);
    img.setDisplaySize(w, h);
    return img;
  }
}
