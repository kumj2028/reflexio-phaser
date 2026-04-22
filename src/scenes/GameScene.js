import Phaser from 'phaser';
import { loadLevel } from '../loader/levelLoader.js';
import '../objects/index.js';
import { Block } from '../objects/Block.js';
import { Spike } from '../objects/Spike.js';
import { Player } from '../objects/Player.js';
import { Door } from '../objects/Door.js';
import { SPRITESHEET_REGISTRY } from '../loader/spritesheetRegistry.js';
import { LEVEL_LIST } from '../loader/levelList.js';
import { progress } from '../state/ProgressState.js';
import { achievements } from '../state/AchievementState.js';
import { EyeTracker } from '../eye/EyeTracker.js';
import { eyeTracking } from '../state/EyeTrackingState.js';

// Physics constants ported from Player.cs / PlayerController.cs.
// Converted to pixel-space: multiply original m/s or N values by SCALE (50 px/m).
// Velocities are per-frame at 60fps (px/frame = px/s / 60).
const SCALE         = 50;
const MAXSPEED      = (2.0 * SCALE) / 60;  // 1.667 px/frame horizontal cap
const JUMP_COOLDOWN = 30;                   // frames before next jump
const DAMP          = 0.85;                 // velocity multiplier per frame when idle

// Matter.js velocity Verlet: velocity_increment = gravity.y * gravity.scale * deltaTime^2
// where deltaTime is in MILLISECONDS (16.667 at 60fps), so deltaTime^2 = 277.8 ms^2.
// Target acceleration: 9.8 m/s^2 = 490 px/s^2 = 490/(60^2) = 0.136 px/frame^2.
// Solving: 9.8 * scale * 277.8 = 0.136  =>  scale = 0.00005
const GRAVITY_SCALE = 0.00005;

// Target ~3 tiles (97.5 px) peak height: v0 = sqrt(2 * 0.136 * 97.5) = 5.15 px/frame.
// Original PLAYER_MAX_Y_VEL cap (5 m/s = 4.17 px/frame) limits to ~2 tiles; user
// recalls 3, so we use the uncapped value computed from the target height.
const JUMP_SPEED = 4.635; // px/frame — ~3 tile peak height

// Direction transformation tables for each reflection type.
// Horizontal reflection (across horizontal line) flips Y → Up↔Down.
// Vertical reflection (across vertical line) flips X → Left↔Right.
// Main diagonal (y=x swap) maps (0,-1)→(-1,0) etc.
// Anti-diagonal maps (0,-1)→(1,0) etc.
const DIR_FLIP_H    = { Up:'Down', Down:'Up', Left:'Left', Right:'Right' };
const DIR_FLIP_V    = { Up:'Up', Down:'Down', Left:'Right', Right:'Left' };
const DIR_FLIP_DIAG_MAIN = { Up:'Left', Down:'Right', Left:'Up', Right:'Down' };
const DIR_FLIP_DIAG_ANTI = { Up:'Right', Down:'Left', Left:'Down', Right:'Up' };

// D4 (dihedral group) sprite orientation tracking.
// States: s0=identity, s1=flipX, s2=flipY, s3=R180,
//         s4=R90CW, s5=antiDiag, s6=mainDiag, s7=R90CCW
// Verified via 2x2 matrix multiplication (Phaser world matrix = R(angle)*Scale(flip)).
const D4_TRANSITIONS = {
  H:  [2, 3, 0, 1, 5, 4, 7, 6],
  V:  [1, 0, 3, 2, 6, 7, 4, 5],
  D1: [6, 7, 4, 5, 2, 3, 0, 1],
  D2: [5, 4, 7, 6, 1, 0, 3, 2],
};
// [angle, flipX, flipY] to pass to Phaser for each state
const D4_SPRITE_PARAMS = [
  [  0, false, false], // s0: identity
  [  0, true,  false], // s1: flipX
  [  0, false, true ], // s2: flipY
  [  0, true,  true ], // s3: R180
  [ 90, false, false], // s4: R90CW  (90° CW in screen)
  [ 90, true,  false], // s5: anti-diagonal
  [ 90, false, true ], // s6: main diagonal
  [ 90, true,  true ], // s7: R90CCW
];

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.levelFile = 'block_intro.xml';
  }

  init(data) {
    if (data?.levelFile) this.levelFile = data.levelFile;
    this.levelIdx   = data?.levelIdx  ?? LEVEL_LIST.findIndex(e => e.file === this.levelFile);
    if (this.levelIdx < 0) this.levelIdx = 0;
    this._playUnzip = data?.playUnzip ?? false;
  }

  async create() {
    // Null out player refs immediately so update() doesn't operate on destroyed
    // objects from the previous run while the level fetch is in flight.
    this.playerSprite             = null;
    this.playerBody               = null;
    this.playerData               = null;
    this.groundContacts           = 0;
    this.groundedAnimGrace        = 0; // coyote frames for animation only
    this._groundPairs             = new Set();
    this._wallContactX            = 0;
    this._wallPairs               = new Map(); // pairId → normalX for active wall contacts
    this._wallQueue               = []; // filled by buildObject, consumed by buildMergedWalls
    this._mergedWallBodies        = []; // Matter body refs created by buildMergedWalls
    this.reflectionPauseRemaining  = 0;
    this.grabbedBlock              = null;
    this.blockJoint                = null;
    this.gameWon                      = false;
    this.gameDead                     = false;
    this._pendingReflectionDeath      = false;
    this._pendingReflectionDeathType  = 'wall';
    this._levelReflections            = 0;
    this._blocksDestroyed             = 0;
    this._levelStartTime              = Date.now();

    const { width: sw, height: sh } = this.scale;

    const loadingText = this.add.text(sw / 2, sh / 2, `Loading ${this.levelFile}...`, {
      color: '#eee', fontFamily: 'monospace', fontSize: '18px'
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

    // Play level BGM, stopping whatever was playing (e.g. meadows from menus).
    if (level.bkgSound) {
      try {
        if (!this.sound.get(level.bkgSound)?.isPlaying) {
          // Stop only looping BGM tracks, not one-shot SFX that may still be finishing.
          for (const s of [...this.sound.sounds]) { if (s.loop) s.stop(); }
          this.sound.play(level.bkgSound, { loop: true });
        }
      } catch { /* ignore */ }
    }

    const screen = level.dims.screenSizePx();
    this.offsetX = Math.floor((sw - screen.w) / 2);
    this.offsetY = Math.floor((sh - screen.h) / 2);

    // Gravity from level XML, scaled so the physics match the original m/s^2 values.
    this.matter.world.setGravity(level.gravity.x, level.gravity.y, GRAVITY_SCALE);

    // World boundary walls so objects don't fall out of the level.
    this.addWorldBounds(screen);

    // Background
    this.addBackground(level, screen);

    for (const obj of level.objects) {
      this.buildObject(obj, level.dims);
    }
    this.buildMergedWalls();

    this.buildReflectionIndicators(level);

    // Press any switch that a block is already resting on at level start.
    // collisionstart never fires for bodies that begin the level already overlapping.
    for (const sw of level.objects) {
      if (sw.typeName !== 'Switch' || !sw.body || sw.isPressed) continue;
      for (const blk of level.objects) {
        if (blk.typeName !== 'Block' || !blk.body) continue;
        if (blk.discX === sw.discX && blk.discY === sw.discY) {
          this.pressSwitch(sw, blk.body);
          break;
        }
      }
    }

    // Reflection line overlay — created after all objects so it sits on top in the display list.
    this.reflectionLineGfx = this.add.graphics().setDepth(50);

    // Ground sensor collision tracking via Matter collision events.
    this.setupGroundSensor();

    // Keyboard
    this.cursors = this.input.keyboard.createCursorKeys();
    this.rKey    = this.input.keyboard.addKey('R');
    this.escKey  = this.input.keyboard.addKey('ESC');

    // Animations (idempotent - only created once per Phaser instance)
    this.ensureAnimations();

    // Reflection keys
    this.reflectKey = this.input.keyboard.addKey('SPACE');
    this.wKey = this.input.keyboard.addKey('W');
    this.sKey = this.input.keyboard.addKey('S');
    this.aKey = this.input.keyboard.addKey('A');
    this.dKey = this.input.keyboard.addKey('D');
    this.xKey = this.input.keyboard.addKey('X');
    this.eKey = this.input.keyboard.addKey('E');
    this.initReflectionState();

    // Open door immediately if level has no keys
    if (level.keys.length === 0) this.openDoor();

    this.setupObjectCollisions();

    // Level shortcuts (same keys as TestScene for muscle memory)
    const SHORTCUTS = {
      '1': 'tutorial_movement.xml',
      '2': 'tutorial_vertical.xml',
      '3': 'tutorial_horizontal.xml',
      '4': 'block_intro.xml',
      '5': 'switch_intro.xml',
      '6': 'hard_spider.xml'
    };
    this.input.keyboard.on('keydown', (ev) => {
      if (!ev.repeat && SHORTCUTS[ev.key]) {
        const file = SHORTCUTS[ev.key];
        const idx = LEVEL_LIST.findIndex(e => e.file === file);
        this.scene.restart({ levelFile: file, levelIdx: idx });
      }
    });

    if (this._playUnzip) {
      this.reflectionLineGfx.setVisible(false);
      for (const img of this.allIndicatorImages ?? []) img.setVisible(false);
      this._reflectionHidden = true;
      this.playUnzipIntro();
    }

    this._achListener = (ach) => this.showAchievementNotification(ach);
    achievements.onUnlock(this._achListener);
    this.events.once('shutdown', () => {
      achievements.offUnlock(this._achListener);
      this._gazeTracker?.stop();
      this._gazeDebugText?.destroy();
    });

    // Eye tracking
    this._indicatorData   = [];
    this._gazeBuffer      = []; // rolling window of recent canvas-space readings
    this._gazeCooldown    = 0;
    this._gazeProgressGfx = this.add.graphics().setDepth(200);
    this._gazeDebugText   = this.add.text(8, 8, '', {
      color: '#ffff00', fontFamily: 'monospace', fontSize: '12px',
      stroke: '#000', strokeThickness: 2,
    }).setDepth(201).setScrollFactor(0).setVisible(eyeTracking.isEnabled());
    this._gazeTracker     = new EyeTracker();
    this.tKey  = this.input.keyboard.addKey('T');
    this.yKey  = this.input.keyboard.addKey('Y'); // recalibrate
    if (eyeTracking.isEnabled()) {
      await this._gazeTracker.start();
      if (this.levelFile === 'keyboard_controls.xml') {
        this._gazeTracker.calibrate();
      }
    }
  }

  playUnzipIntro() {
    const { w, h } = this.level.dims.screenSizePx();
    const cx = this.offsetX + w / 2, cy = this.offsetY + h / 2;
    const unzip = this.add.sprite(cx, cy, 'unzip', 0)
      .setDisplaySize(w, h)
      .setDepth(100)
      .play('unzip');
    unzip.once('animationcomplete', () => {
      unzip.destroy();
      if (this._reflectionHidden) {
        this._reflectionHidden = false;
        this.reflectionLineGfx.setVisible(true);
        for (const img of this._alwaysIndicatorImages ?? []) img.setVisible(true);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Scene building
  // -------------------------------------------------------------------------

  addWorldBounds() {
    // No world boundaries — objects can fall/slide off any edge.
  }

  addBackground(level, screen) {
    const { offsetX: ox, offsetY: oy } = this;
    if (level.bkgImage && this.textures.exists(level.bkgImage)) {
      this.add.image(ox, oy, level.bkgImage).setOrigin(0).setDisplaySize(screen.w, screen.h);
    } else {
      this.add.rectangle(ox, oy, screen.w, screen.h, 0x1a1a2a).setOrigin(0);
    }
  }

  buildObject(obj, dims) {
    const cx = obj.centerMeters.x * dims.scale + this.offsetX;
    const cy = obj.centerMeters.y * dims.scale + this.offsetY;
    const w  = obj.widthMeters  * dims.scale;
    const h  = obj.heightMeters * dims.scale;

    if (obj instanceof Player) {
      this.buildPlayer(obj, cx, cy, w, h);
      return;
    }

    const isKey    = obj.typeName === 'Key';
    const isSwitch = obj.typeName === 'Switch';
    const isDoor   = obj instanceof Door;
    const isStatic = !(obj instanceof Block);
    const rawTex   = this.resolveTexture(obj);
    const texKey   = rawTex && this.textures.exists(rawTex) ? rawTex : '__DEFAULT';
    const frame    = SPRITESHEET_REGISTRY[texKey] ? 0 : undefined;

    // Scale density from kg/m² (Farseer) to kg/px² (Matter) by dividing by scale².
    const densityPx = (obj.density || 0) / (SCALE * SCALE) || 0.001;

    // Door uses a sprite (not image) so it can play animations.
    // matter.add.image/sprite creates the physics body at the texture's frame dimensions
    // (32×32px), but tiles are 32.5×32.5px. Replace the body with setBody so the
    // physics body exactly matches the tile size and adjacent tiles have no gaps.
    const img = isDoor
      ? this.matter.add.sprite(cx, cy, texKey, frame)
      : this.matter.add.image(cx, cy, texKey, frame);
    img.setDisplaySize(w, h);
    const isWall   = obj.typeName === 'Wall';
    const isSpike  = obj instanceof Spike;
    // Wall and spike collision is handled by merged column/row bodies built after all
    // objects are placed. Individual bodies are sensors so sprites render but don't
    // collide. Spike death detection uses position-based checks, not contact events,
    // so making spike bodies sensors doesn't break it.
    const isSensor = isKey || isSwitch || isDoor || isWall || isSpike;
    const isBlock  = obj instanceof Block;
    // Block friction from XML is 5, which in Matter.js means "glue" (real rubber ~1.0).
    // When a block falls between two walls, both contacts apply friction simultaneously
    // and the combined force exceeds gravity, slowing the fall to a crawl. Cap at 0.3
    // and zero static friction so blocks can always fall freely between walls.
    // Sensor bodies (switch, key, door, wall sprite, spike sprite) get friction:0 —
    // a static sensor at the junction of a dynamic block and a solid wall can still
    // participate in Matter.js's constraint graph and add phantom friction contact forces.
    const bodyFriction       = isSensor ? 0 : isBlock ? Math.min(obj.friction, 0.5) : obj.friction;
    const bodyFrictionStatic = (isSensor || isBlock) ? 0 : undefined;
    img.setBody(
      { type: 'rectangle', width: w, height: h },
      { isStatic, isSensor, friction: bodyFriction, frictionStatic: bodyFrictionStatic,
        density: densityPx, restitution: obj.restitution, label: obj.typeName }
    );
    // Phaser's setBody does not reliably forward friction/frictionStatic/isSensor to
    // the raw Matter body for static bodies. Force-set them directly so the physics
    // engine always sees the correct values.
    if (img.body) {
      img.body.friction       = bodyFriction;
      img.body.frictionStatic = bodyFrictionStatic ?? 0;
      img.body.isSensor       = isSensor;
    }
    if (isWall || isSpike) this._wallQueue.push({ obj, cx, cy, w, h });

    if (obj instanceof Block) img.setFixedRotation();
    obj.body          = img.body;
    obj.sprite        = img;
    obj.displayW      = w;
    obj.displayH      = h;
    img.body.refObj   = obj;
    if (!obj.isReflectable) img.setTint(0x666666);
    if (!(obj instanceof Spike)) {
      let t = 0;
      if (obj.reflectedHorizontal) t = D4_TRANSITIONS.H[t];
      if (obj.reflectedVertical)   t = D4_TRANSITIONS.V[t];
      obj.spriteTransformIdx = t;
      const [a, fx, fy] = D4_SPRITE_PARAMS[t];
      img.setAngle(a).setFlipX(fx).setFlipY(fy);
    }
  }

  // Groups wall tiles into contiguous column and row segments and creates one merged
  // static body per segment. This eliminates the internal vertex at the seam between
  // two adjacent wall tiles, preventing the player circle from getting wedged there.
  buildMergedWalls() {
    // Destroy any previously merged bodies (called again after reflection).
    for (const b of this._mergedWallBodies) this.matter.world.remove(b);
    this._mergedWallBodies = [];

    const queue = this._wallQueue;
    if (!queue.length) return;

    const tileW = queue[0].w;
    const tileH = queue[0].h;

    // Track which tiles have been assigned to a merged body.
    const assigned = new Set();

    const mergeRun = (run) => {
      if (!run.length) return;
      const friction = run[0].obj.friction;
      if (run.length === 1) {
        // Single tile — individual body, no seam issue.
        const { cx, cy } = run[0];
        const b = this.matter.add.rectangle(cx, cy, tileW, tileH,
          { isStatic: true, friction, frictionStatic: 0, restitution: 0, label: 'Wall' });
        this._mergedWallBodies.push(b);
      } else {
        const cxFirst = run[0].cx, cyFirst = run[0].cy;
        const cxLast  = run[run.length-1].cx, cyLast = run[run.length-1].cy;
        const cx = (cxFirst + cxLast) / 2;
        const cy = (cyFirst + cyLast) / 2;
        const totalW = Math.abs(cxLast - cxFirst) + tileW;
        const totalH = Math.abs(cyLast - cyFirst) + tileH;
        const b = this.matter.add.rectangle(cx, cy, totalW, totalH,
          { isStatic: true, friction, frictionStatic: 0, restitution: 0, label: 'Wall' });
        this._mergedWallBodies.push(b);
      }
    };

    // Merge vertical columns (same discX, consecutive discY).
    const byCol = new Map();
    for (const entry of queue) {
      const k = entry.obj.discX;
      if (!byCol.has(k)) byCol.set(k, []);
      byCol.get(k).push(entry);
    }
    for (const tiles of byCol.values()) {
      tiles.sort((a, b) => a.obj.discY - b.obj.discY);
      let run = [tiles[0]];
      assigned.add(tiles[0]);
      for (let i = 1; i < tiles.length; i++) {
        if (tiles[i].obj.discY - tiles[i-1].obj.discY === 1) {
          run.push(tiles[i]);
          assigned.add(tiles[i]);
        } else {
          mergeRun(run);
          run = [tiles[i]];
          assigned.add(tiles[i]);
        }
      }
      mergeRun(run);
    }

    // Any tiles not merged into a column run (isolated tiles already handled above
    // as single-tile runs, so this loop is a safety net for any that slipped through).
    for (const entry of queue) {
      if (!assigned.has(entry)) {
        const b = this.matter.add.rectangle(entry.cx, entry.cy, tileW, tileH,
          { isStatic: true, friction: entry.obj.friction, frictionStatic: 0, restitution: 0, label: 'Wall' });
        this._mergedWallBodies.push(b);
      }
    }
  }

  buildPlayer(player, cx, cy, w, h) {
    // Use matter.add.sprite so Phaser handles sprite-body position sync automatically.
    const sprite = this.matter.add.sprite(cx, cy, 'idleStrip', 0);
    sprite.setDisplaySize(w, h);

    // Circle body: Matter.js uses a distinct circle-vs-polygon algorithm (closest-point,
    // not SAT) that avoids the vertex-wedge problem where a polygon body catches on the
    // seam between two adjacent wall tiles, locking the player in place via a diagonal
    // contact normal. Feel is identical to the 20-gon on square tiles (w ≈ h).
    sprite.setCircle(w / 2);

    const playerDensity = (player.density || 1.5) / (SCALE * SCALE);
    sprite.setDensity(playerDensity);
    sprite.setFriction(0);
    sprite.setFrictionAir(0.01);
    sprite.setFrictionStatic(0);
    sprite.setFixedRotation();
    sprite.body.label = 'player';

    this.playerSprite       = sprite;
    this.playerBody         = sprite.body;
    this.playerData         = player;
    player.body             = sprite.body;
    sprite.body.refObj  = player;
  }

  // -------------------------------------------------------------------------
  // Reflection line indicators
  // -------------------------------------------------------------------------

  buildReflectionIndicators(level) {
    const dims  = level.dims;
    const tileW = (dims.widthMeters  * dims.scale) / dims.numRows;
    const tileH = (dims.heightMeters * dims.scale) / dims.numCols;
    const ox = this.offsetX, oy = this.offsetY;

    // Icons sit on the border-tile column/row, centred between two tiles at the
    // line boundary.  Left border (col 0) hosts H-line icons; bottom border
    // (row numCols-1) hosts V-line icons.
    const leftX   = ox + tileW / 2;
    const bottomY = oy + (dims.numCols - 0.5) * tileH;
    const ICON    = tileW * 0.7;   // ~23 px at default scale

    // H-line icon: canopy points RIGHT (angle 90°, clockwise from up).
    // V-line icon: canopy points UP   (angle  0°, natural orientation).
    this.allIndicatorImages = [];
    this._alwaysIndicatorImages = [];
    this._indicatorData = [];
    const makeIcon = (x, y, key, angle, alwaysVisible = true, orientation = null, linePos = null) => {
      const img = this.add.image(x, y, key).setDisplaySize(ICON, ICON).setAngle(angle).setDepth(49);
      this.allIndicatorImages.push(img);
      if (alwaysVisible) this._alwaysIndicatorImages.push(img);
      if (orientation !== null) this._indicatorData.push({ img, orientation, linePos, size: ICON });
      return img;
    };

    const alwaysH = new Set(level.horizontalLines);
    const alwaysV = new Set(level.verticalLines);
    const alwaysD = new Set(level.diagonalLines);

    // Diagonal icons sit on the left border at the corners.
    // p=1  (main diagonal, top-left→bottom-right): bottom-left corner, canopy points up-right   (45°).
    // p=-1 (anti-diagonal, top-right→bottom-left): top-left corner,    canopy points down-right (135°).

    const diagY     = (p) => p === 1
      ? oy + tileH / 2                        // top-left
      : oy + (dims.numRows - 0.5) * tileH;   // bottom-left
    const diagAngle = (p) => p === 1 ? 135 : 45;

    for (const p of alwaysH)
      makeIcon(leftX, oy + p * tileH, 'reflectionCircle', 90, true, 'HORIZONTAL', p);
    for (const p of alwaysV)
      makeIcon(ox + p * tileW, bottomY, 'reflectionCircle', 0, true, 'VERTICAL', p);
    for (const p of alwaysD)
      makeIcon(leftX, diagY(p), 'reflectionCircle', diagAngle(p), true, 'DIAGONAL', p);

    // Switch-controlled indicators: created hidden, shown only while switch is on.
    for (const obj of level.objects) {
      if (obj.typeName !== 'Switch') continue;
      obj.indicatorImages = [];
      for (const p of obj.horizontalLines) {
        if (alwaysH.has(p)) continue;
        obj.indicatorImages.push(
          makeIcon(leftX, oy + p * tileH, 'reflectionCircleSwitch', 90, false, 'HORIZONTAL', p).setVisible(false)
        );
      }
      for (const p of obj.verticalLines) {
        if (alwaysV.has(p)) continue;
        obj.indicatorImages.push(
          makeIcon(ox + p * tileW, bottomY, 'reflectionCircleSwitch', 0, false, 'VERTICAL', p).setVisible(false)
        );
      }
      for (const p of obj.diagonalLines) {
        if (alwaysD.has(p)) continue;
        obj.indicatorImages.push(
          makeIcon(leftX, diagY(p), 'reflectionCircleSwitch', diagAngle(p), false, 'DIAGONAL', p).setVisible(false)
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // Ground sensor
  // -------------------------------------------------------------------------

  setupGroundSensor() {
    // Track how many non-sensor bodies are currently touching the player.
    // isGrounded is computed in update() using this count + a velocity guard so
    // that jumping upward never counts as grounded even for the brief moment
    // before collisionend fires.
    this.matter.world.on('collisionstart', (event) => {
      for (const { id, bodyA, bodyB, collision } of event.pairs) {
        const aIsPlayer = bodyA.label === 'player';
        const bIsPlayer = bodyB.label === 'player';
        if (aIsPlayer || bIsPlayer) {
          const other = aIsPlayer ? bodyB : bodyA;
          const n = collision.normal;
          if (!other.isSensor) {
            if (Math.abs(n.y) > 0.85) {
              if (!this._groundPairs.has(id)) {
                this._groundPairs.add(id);
                this.groundContacts++;
              }
            } else if (Math.abs(n.x) > 0.5) {
              this._wallPairs.set(id, n.x);
            }
          }
        }
      }
    });

    this.matter.world.on('collisionactive', (event) => {
      for (const { id, bodyA, bodyB, collision } of event.pairs) {
        const aIsPlayer = bodyA.label === 'player';
        const bIsPlayer = bodyB.label === 'player';
        if (aIsPlayer || bIsPlayer) {
          const other = aIsPlayer ? bodyB : bodyA;
          const n = collision.normal;
          if (!other.isSensor) {
            if (Math.abs(n.x) > 0.5) this._wallPairs.set(id, n.x);
          }
        }
      }
    });

    this.matter.world.on('collisionend', (event) => {
      for (const { id } of event.pairs) {
        if (this._groundPairs.has(id)) {
          this._groundPairs.delete(id);
          this.groundContacts = Math.max(0, this.groundContacts - 1);
        }
        this._wallPairs.delete(id);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Animations
  // -------------------------------------------------------------------------

  ensureAnimations() {
    if (!this.anims.exists('walk')) {
      this.anims.create({
        key:       'walk',
        frames:    this.anims.generateFrameNumbers('playerTexture', { start: 0, end: 5 }),
        frameRate: 10,
        repeat:    -1
      });
    }
    if (!this.anims.exists('idle')) {
      this.anims.create({
        key:       'idle',
        frames:    this.anims.generateFrameNumbers('idleStrip', { start: 0, end: 6 }),
        frameRate: 8,
        repeat:    -1
      });
    }
    if (!this.anims.exists('openDoor')) {
      this.anims.create({
        key:       'openDoor',
        frames:    this.anims.generateFrameNumbers('openDoorStrip', { start: 0, end: 4 }),
        frameRate: 10,
        repeat:    0
      });
    }
    if (!this.anims.exists('doorEat')) {
      this.anims.create({
        key:       'doorEat',
        frames:    this.anims.generateFrameNumbers('doorEat', { start: 0, end: 4 }),
        frameRate: 10,
        repeat:    0
      });
    }
    if (!this.anims.exists('reflect')) {
      this.anims.create({
        key:       'reflect',
        frames:    this.anims.generateFrameNumbers('reflectionStrip', { start: 0, end: 9 }),
        frameRate: 40,
        repeat:    -1
      });
    }
    if (!this.anims.exists('zip')) {
      this.anims.create({
        key:       'zip',
        frames:    this.anims.generateFrameNumbers('zip', { start: 0, end: 14 }),
        frameRate: 32,
        repeat:    0
      });
    }
    if (!this.anims.exists('unzip')) {
      this.anims.create({
        key:       'unzip',
        frames:    this.anims.generateFrameNumbers('unzip', { start: 0, end: 14 }),
        frameRate: 32,
        repeat:    0
      });
    }
  }

  // -------------------------------------------------------------------------
  // Update loop
  // -------------------------------------------------------------------------

  update() {
    if (!this.playerBody || !this.playerData) return;

    // Reflection animation always runs to completion, even after death/win,
    // so the player sees the object land on them before the menu appears.
    this._wallContactX = 0;
    for (const nx of this._wallPairs.values()) this._wallContactX += nx;
    this.tickReflectionPause();
    this.drawReflectionLine();

    if (this.reflectionPauseRemaining > 0) return;

    if (Phaser.Input.Keyboard.JustDown(this.escKey) && !this.gameWon && !this.gameDead) {
      this.scene.launch('PauseScene', {
        gameSceneKey: 'GameScene',
        levelFile: this.levelFile,
        levelIdx: this.levelIdx
      });
      this.scene.bringToTop('PauseScene');
      this.scene.pause();
      return;
    }

    if (this.gameWon || this.gameDead) return;

    achievements.incPlayTime(this.game.loop.delta);

    // Grounded = touching something AND not moving upward fast.
    this.playerData.isGrounded =
      this.groundContacts > 0 && this.playerBody.velocity.y > -1.0;
    if (this.playerData.isGrounded) {
      this.groundedAnimGrace = 4;
    } else if (this.groundedAnimGrace > 0) {
      this.groundedAnimGrace--;
    }

    // Fall off bottom of level
    const { h: levelH } = this.level.dims.screenSizePx();
    if (this.playerBody.position.y > this.offsetY + levelH + 60) {
      this.triggerDeath('fall');
      return;
    }

    // Blocks that fall off screen
    for (const obj of this.level.objects) {
      if (obj.typeName !== 'Block' || !obj.body || obj.body.isStatic) continue;
      if (obj.body.position.y > this.offsetY + levelH + 100) this.destroyObject(obj);
    }

    this.handleMovement();
    this.handleBlockGrab();
    this.handleReflectionInput();
    this.updateSwitches();
    this.updateBlocks();
    this.updateGazeDwell();

    if (Phaser.Input.Keyboard.JustDown(this.tKey)) {
      const now = eyeTracking.toggle();
      if (now) { this._gazeTracker.start(); this._gazeDebugText?.setVisible(true); }
      else      { this._gazeTracker.stop(); this._gazeProgressGfx?.clear(); this._gazeBuffer = []; this._gazeDebugText?.setVisible(false).setText(''); }
      this._showGazeToggleNotice(now);
    }
    if (Phaser.Input.Keyboard.JustDown(this.yKey) && this._gazeTracker?.active) {
      this._gazeBuffer = [];
      this._gazeTracker.calibrate();
    }

    // matter.add.sprite auto-syncs position; only flip needs manual update.
    this.playerSprite.setFlipX(!this.playerData.facingRight);

    if (this.playerData.jumpCooldown > 0) this.playerData.jumpCooldown--;
  }

  handleMovement() {
    const { cursors, rKey, playerBody, playerData } = this;
    const vel = playerBody.velocity;
    const Matter = Phaser.Physics.Matter.Matter;

    // Restart
    if (Phaser.Input.Keyboard.JustDown(rKey)) {
      this.scene.restart({ levelFile: this.levelFile });
      return;
    }

    const left  = cursors.left.isDown  && !cursors.right.isDown;
    const right  = cursors.right.isDown && !cursors.left.isDown;
    let newVelX = vel.x;
    let walking  = false;

    // When airborne, block movement into a wall (normal points away from wall,
    // so wall-on-left has n.x > 0, wall-on-right has n.x < 0).
    const blockedLeft  = !playerData.isGrounded && this._wallContactX > 0.3;
    const blockedRight = !playerData.isGrounded && this._wallContactX < -0.3;

    if (left) {
      if (playerData.facingRight) {
        playerData.facingRight = false;
      } else if (!blockedLeft) {
        newVelX = -MAXSPEED;
        walking  = true;
      }
    } else if (right) {
      if (!playerData.facingRight) {
        playerData.facingRight = true;
      } else if (!blockedRight) {
        newVelX = MAXSPEED;
        walking  = true;
      }
    } else {
      newVelX = vel.x * DAMP;
    }

    // Only set x velocity explicitly. Never touch y via setVelocity — Matter.js uses
    // Verlet integration where setVelocity(y) sets positionPrev.y = position.y - vy.
    // If contact resolution zeroes position displacement each frame (wedge case),
    // computed velocity stays 0 and calling setVelocity(y:0) locks positionPrev,
    // preventing gravity from accumulating. Controlling only x avoids this entirely.
    playerBody.velocity.x = newVelX;
    playerBody.positionPrev.x = playerBody.position.x - newVelX;

    // Jump: apply upward velocity; cooldown prevents rapid re-triggering.
    if (cursors.up.isDown && playerData.isGrounded && playerData.jumpCooldown === 0) {
      Matter.Body.setVelocity(playerBody, { x: newVelX, y: -JUMP_SPEED });
      playerData.jumpCooldown = JUMP_COOLDOWN;
      try { this.sound.play('jumpMusic'); } catch { /* ignore */ }
    }

    // Animations
    playerData.isWalking = walking;
    const sprite = this.playerSprite;
    if (!playerData.isGrounded && this.groundedAnimGrace === 0 && Math.abs(vel.y) > 1.0) {
      const jumpTex = vel.y < 0 ? 'jumpUp' : 'jumpDown';
      if (sprite.texture.key !== jumpTex) {
        sprite.anims.stop();
        sprite.setTexture(jumpTex);
      }
    } else {
      const wantAnim = walking ? 'walk' : 'idle';
      const onJumpTex = sprite.texture.key === 'jumpUp' || sprite.texture.key === 'jumpDown';
      if (onJumpTex || sprite.anims.currentAnim?.key !== wantAnim) {
        sprite.play(wantAnim);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Reflection
  // -------------------------------------------------------------------------

  initReflectionState() {
    const level = this.level;
    const lines =
      level.reflectionOrientation === 'HORIZONTAL' ? level.horizontalLines :
      level.reflectionOrientation === 'VERTICAL'   ? level.verticalLines   :
      level.diagonalLines;
    const idx = lines.indexOf(level.reflectionLinePosition);
    if (idx >= 0) level.currentPosInList = idx;
  }

  handleReflectionInput() {
    const JD = Phaser.Input.Keyboard.JustDown;
    if (JD(this.reflectKey)) {
      // Implicit training: the user is looking at the active reflection indicator
      // while pressing Space, so their current gaze is a training sample for that
      // indicator's screen position.
      if (this._gazeTracker?.active) {
        const gaze = this._gazeTracker.getGaze();
        if (gaze) this._gazeTracker.trainAtCurrentGaze(gaze.x, gaze.y);
      }
      this.triggerReflect();
      return;
    }
    if (JD(this.wKey)) this.moveReflectionLine('up');
    else if (JD(this.sKey)) this.moveReflectionLine('down');
    if (JD(this.aKey)) this.moveReflectionLine('left');
    else if (JD(this.dKey)) this.moveReflectionLine('right');
    if (JD(this.xKey)) this.moveReflectionLine('diagonal');
  }

  moveReflectionLine(direction) {
    const level = this.level;
    if (direction === 'left' || direction === 'right') {
      if (!level.canReflectVertical || !level.verticalLines.length) return;
      if (level.reflectionOrientation !== 'VERTICAL') {
        level.reflectionOrientation = 'VERTICAL';
        level.currentPosInList = Math.floor(level.verticalLines.length / 2);
      } else {
        const d = direction === 'right' ? 1 : -1;
        level.currentPosInList = (level.currentPosInList + d + level.verticalLines.length) % level.verticalLines.length;
      }
      level.reflectionLinePosition = level.verticalLines[level.currentPosInList];
    } else if (direction === 'up' || direction === 'down') {
      if (!level.canReflectHorizontal || !level.horizontalLines.length) return;
      if (level.reflectionOrientation !== 'HORIZONTAL') {
        level.reflectionOrientation = 'HORIZONTAL';
        level.currentPosInList = Math.floor(level.horizontalLines.length / 2);
      } else {
        const d = direction === 'down' ? 1 : -1;
        level.currentPosInList = (level.currentPosInList + d + level.horizontalLines.length) % level.horizontalLines.length;
      }
      level.reflectionLinePosition = level.horizontalLines[level.currentPosInList];
    } else if (direction === 'diagonal') {
      if (!level.canReflectDiagonal || !level.diagonalLines.length) return;
      if (level.reflectionOrientation !== 'DIAGONAL') {
        level.reflectionOrientation = 'DIAGONAL';
        level.currentPosInList = 0;
      } else {
        level.currentPosInList = (level.currentPosInList + 1) % level.diagonalLines.length;
      }
      level.reflectionLinePosition = level.diagonalLines[level.currentPosInList];
    }
  }

  triggerReflect() {
    const { level } = this;
    const linePos    = level.reflectionLinePosition;
    const orientation = level.reflectionOrientation;

    if (linePos >= -1 && orientation === 'DIAGONAL') {
      for (const obj of level.objects) this.reflectObject(obj, linePos, linePos, orientation);
    } else if (linePos >= 0) {
      const size = orientation === 'HORIZONTAL' ? level.numCols - 2 : level.numRows - 2;
      const minDist = Math.min(linePos - 1, size - linePos + 1);
      const start = linePos - minDist;
      const end   = linePos + minDist - 1;
      for (const obj of level.objects) this.reflectObject(obj, start, end, orientation);
    }

    this.destroyOverlappedNonReflectables();
    this.checkPlayerCrushedByReflection();

    this.reflectionPauseRemaining = level.reflectionPauseTime;
    this.matter.world.pause();
    if (this.playerSprite) this.playerSprite.play('reflect');
    try { this.sound.play('reflectMusic'); } catch { /* ignore */ }
    achievements.incReflectionCount();
    this._levelReflections++;
  }

  destroyOverlappedNonReflectables() {
    // Build a set of tile positions occupied by objects that were just reflected.
    const reflectedTiles = new Set();
    for (const obj of this.level.objects) {
      if (obj.isBeingReflected) reflectedTiles.add(`${obj.discX},${obj.discY}`);
    }
    if (reflectedTiles.size === 0) return;

    const toDestroy = [];
    for (const obj of this.level.objects) {
      if (!obj.isReflectable && !obj.isBeingReflected && obj.body && obj.sprite) {
        if (reflectedTiles.has(`${obj.discX},${obj.discY}`)) toDestroy.push(obj);
      }
    }
    for (const obj of toDestroy) this.destroyObject(obj);
    if (toDestroy.length > 0) try { this.sound.play('destroy'); } catch { /* ignore */ }
  }

  destroyObject(obj) {
    if (obj.typeName === 'Block') this._blocksDestroyed++;
    obj.sprite?.destroy();
    obj.sprite = null;
    if (obj.body) {
      Phaser.Physics.Matter.Matter.Composite.remove(this.matter.world.localWorld, obj.body);
      obj.body = null;
    }
    this.level.objects = this.level.objects.filter(o => o !== obj);
  }

  checkPlayerCrushedByReflection() {
    if (!this.playerBody) return;
    const { dims } = this.level;
    const tileW = (dims.widthMeters * dims.scale) / dims.numRows;
    const tileH = (dims.heightMeters * dims.scale) / dims.numCols;
    const { x: px, y: py } = this.playerBody.position;
    const safe = new Set(['Key', 'Door', 'Switch']);
    for (const obj of this.level.objects) {
      if (!obj.isBeingReflected || !obj.reflectionEndPosPx) continue;
      if (safe.has(obj.typeName)) continue;
      const { x: ex, y: ey } = obj.reflectionEndPosPx;
      if (Math.abs(px - ex) < tileW / 2 && Math.abs(py - ey) < tileH / 2) {
        this._pendingReflectionDeath = true;
        const n = obj.typeName;
        this._pendingReflectionDeathType = n === 'Block' ? 'block' : n === 'Spike' ? 'spikeCollision' : 'wall';
        return;
      }
    }
  }

  reflectObject(obj, start, end, orientation) {
    if (!obj.isReflectable || !obj.body || !obj.sprite) return;

    const { dims } = this.level;

    // Dynamic bodies (blocks) move freely; sync tile coords from current position
    // before running reflection math so we reflect where the block actually is.
    // Compute tileW via integer arithmetic (650/20=32.5 exact) to avoid float error
    // from rowScale=13/20=0.6499... which is not exactly representable in IEEE 754.
    const tileW = (dims.widthMeters * dims.scale) / dims.numRows;
    const tileH = (dims.heightMeters * dims.scale) / dims.numCols;
    if (!obj.body.isStatic) {
      obj.discX = Math.round((obj.body.position.x - this.offsetX) / tileW - 0.5);
      obj.discY = Math.round((obj.body.position.y - this.offsetY) / tileH - 0.5);
    }

    const origX = obj.discX, origY = obj.discY;
    let reflected = false;

    if (orientation === 'HORIZONTAL') {
      if (obj.discY >= start && obj.discY <= end) {
        obj.discY = (start + end) - obj.discY;
        obj.reflectedHorizontal = !obj.reflectedHorizontal;
        if (obj.direction) obj.direction = DIR_FLIP_H[obj.direction] ?? obj.direction;
        reflected = true;
      }
    } else if (orientation === 'VERTICAL') {
      if (obj.discX >= start && obj.discX <= end) {
        obj.discX = (start + end) - obj.discX;
        obj.reflectedVertical = !obj.reflectedVertical;
        if (obj.direction) obj.direction = DIR_FLIP_V[obj.direction] ?? obj.direction;
        reflected = true;
      }
    } else if (orientation === 'DIAGONAL') {
      if (start === 1) {
        obj.discX = origY;
        obj.discY = origX;
        if (obj.direction) obj.direction = DIR_FLIP_DIAG_MAIN[obj.direction] ?? obj.direction;
      } else if (start === -1) {
        obj.discX = this.level.numCols - origY - 1;
        obj.discY = this.level.numRows - origX - 1;
        if (obj.direction) obj.direction = DIR_FLIP_DIAG_ANTI[obj.direction] ?? obj.direction;
      }
      obj.reflectedHorizontal = !obj.reflectedHorizontal;
      obj.reflectedVertical   = !obj.reflectedVertical;
      reflected = true;
    }

    if (reflected) {
      const endPx = {
        x: obj.discX * tileW + tileW / 2 + this.offsetX,
        y: obj.discY * tileH + tileH / 2 + this.offsetY
      };

      // Store start/end transforms for smooth animation in tickReflectionPause.
      // Spikes swap texture at the midpoint; non-spikes interpolate D4 params.
      if (obj instanceof Spike && obj.direction) {
        obj.reflectionStartTransform = null; // signals spike path
        obj.reflectionEndTexture     = obj.textureNameForDirection();
      } else {
        const opKey = orientation === 'HORIZONTAL' ? 'H'
                    : orientation === 'VERTICAL'   ? 'V'
                    : start === 1                  ? 'D1' : 'D2';
        const startIdx = obj.spriteTransformIdx ?? 0;
        const endIdx   = D4_TRANSITIONS[opKey][startIdx];
        obj.spriteTransformIdx       = endIdx;
        obj.reflectionStartTransform = D4_SPRITE_PARAMS[startIdx];
        obj.reflectionEndTransform   = D4_SPRITE_PARAMS[endIdx];
        // Do NOT apply to sprite yet — tickReflectionPause animates it.
      }

      obj.reflectionStartPosPx = { x: obj.sprite.x, y: obj.sprite.y };
      obj.reflectionEndPosPx   = endPx;
      obj.isBeingReflected     = true;
      // Body teleport deferred to end of pause — world is paused so no simulation runs,
      // and teleporting here causes Phaser's body→sprite sync to flash the end position
      // on the next render frame before the lerp animation starts.
    }
  }

  tickReflectionPause() {
    if (this.reflectionPauseRemaining <= 0) return;
    this.reflectionPauseRemaining--;

    if (this.reflectionPauseRemaining === 0) {
      this.matter.world.resume();
      if (this.playerSprite) this.playerSprite.play('idle');
      for (const obj of this.level.objects) {
        if (!obj.isBeingReflected || !obj.sprite) { obj.isBeingReflected = false; continue; }
        obj.sprite.setPosition(obj.reflectionEndPosPx.x, obj.reflectionEndPosPx.y);
        // Snap to exact final transform and restore display size.
        if (obj.reflectionEndTransform) {
          const [a, fx, fy] = obj.reflectionEndTransform;
          obj.sprite.setAngle(a).setFlipX(fx).setFlipY(fy)
            .setDisplaySize(obj.displayW, obj.displayH);
        } else if (obj.reflectionEndTexture) {
          obj.sprite.setTexture(obj.reflectionEndTexture)
            .setDisplaySize(obj.displayW, obj.displayH);
        }
        // Teleport body to final position now that animation is done.
        const Matter = Phaser.Physics.Matter.Matter;
        Matter.Body.setPosition(obj.body, obj.reflectionEndPosPx);
        Matter.Body.setVelocity(obj.body, { x: 0, y: 0 });
        obj.isBeingReflected = false;
        // Matter.js keeps stale contact pairs active for a few frames after a body
        // teleport, so updateBlocks would see a false floor contact and leave friction
        // on, causing the block to fall slowly. Clear it with a short cooldown.
        if (obj.typeName === 'Block') obj._postReflectFrames = 8;
      }
      // Rebuild merged wall/spike bodies now that reflectable objects are at new positions.
      const dims = this.level.dims;
      this._wallQueue = this.level.objects
        .filter(o => (o.typeName === 'Wall' || o instanceof Spike) && o.sprite)
        .map(o => ({ obj: o, cx: o.sprite.x, cy: o.sprite.y, w: o.widthMeters * dims.scale, h: o.heightMeters * dims.scale }));
      this.buildMergedWalls();

      // Fire any death that was deferred until the animation completed.
      if (this._pendingReflectionDeath) {
        this._pendingReflectionDeath = false;
        this.triggerDeath(this._pendingReflectionDeathType);
      }
      return;
    }

    const pauseTime = this.level.reflectionPauseTime;
    const t = (pauseTime - this.reflectionPauseRemaining) / pauseTime;
    for (const obj of this.level.objects) {
      if (!obj.isBeingReflected || !obj.sprite) continue;
      // Position lerp.
      const { reflectionStartPosPx: s, reflectionEndPosPx: e } = obj;
      obj.sprite.setPosition(s.x + (e.x - s.x) * t, s.y + (e.y - s.y) * t);

      // Transform animation.
      if (obj.reflectionStartTransform && obj.reflectionEndTransform) {
        const [sa, sfx, sfy] = obj.reflectionStartTransform;
        const [ea, efx, efy] = obj.reflectionEndTransform;
        const angleDelta = ea - sa;
        const currentAngle = sa + angleDelta * t;
        const currentFlipX = t >= 0.5 ? efx : sfx;
        const currentFlipY = t >= 0.5 ? efy : sfy;
        obj.sprite.setAngle(currentAngle).setFlipX(currentFlipX).setFlipY(currentFlipY);
        // For pure flips (no angle change), squish the sprite through zero at midpoint
        // to simulate a 3D card flip around the relevant axis.
        if (angleDelta === 0) {
          const squish = Math.abs(Math.cos(t * Math.PI)); // 1 → 0 → 1
          const sw = sfx !== efx ? squish : 1;
          const sh = sfy !== efy ? squish : 1;
          obj.sprite.setDisplaySize(obj.displayW * sw, obj.displayH * sh);
        }
      } else if (obj.reflectionEndTexture && t >= 0.5 && obj.sprite.texture.key !== obj.reflectionEndTexture) {
        // Spike: swap texture at midpoint.
        if (this.textures.exists(obj.reflectionEndTexture)) obj.sprite.setTexture(obj.reflectionEndTexture);
      }
    }
  }

  drawReflectionLine() {
    const gfx = this.reflectionLineGfx;
    this.children.bringToTop(gfx);
    for (const img of this.allIndicatorImages ?? []) this.children.bringToTop(img);
    gfx.clear();
    const { level, offsetX: ox, offsetY: oy } = this;
    const linePos    = level.reflectionLinePosition;
    const orientation = level.reflectionOrientation;
    if (linePos < -1) return;
    if (linePos === -1 && orientation !== 'DIAGONAL') return;

    const { w, h } = level.dims.screenSizePx();
    const tileW = level.dims.rowScale * level.dims.scale;
    const tileH = level.dims.colScale * level.dims.scale;
    const t = (Math.sin((this.time.now / 2000) * Math.PI * 2) + 1) / 2; // 0..1, period 2s
    const r = Math.round(0xff);
    const g = Math.round(0xee + (0xff - 0xee) * t);
    const b = Math.round(0x00 + (0xff - 0x00) * t);
    const color = (r << 16) | (g << 8) | b;
    gfx.lineStyle(2, color, 1.0);

    if (orientation === 'HORIZONTAL') {
      const y = oy + linePos * tileH;
      gfx.beginPath(); gfx.moveTo(ox, y); gfx.lineTo(ox + w, y); gfx.strokePath();
    } else if (orientation === 'VERTICAL') {
      const x = ox + linePos * tileW;
      gfx.beginPath(); gfx.moveTo(x, oy); gfx.lineTo(x, oy + h); gfx.strokePath();
    } else if (orientation === 'DIAGONAL') {
      gfx.beginPath();
      if (linePos === 1) {
        gfx.moveTo(ox, oy); gfx.lineTo(ox + w, oy + h);
      } else {
        gfx.moveTo(ox + w, oy); gfx.lineTo(ox, oy + h);
      }
      gfx.strokePath();
    }
  }

  // -------------------------------------------------------------------------
  // Interactions: keys, door, switches, block grab, spikes, win/lose
  // -------------------------------------------------------------------------

  setupObjectCollisions() {
    this.matter.world.on('collisionstart', (event) => {
      if (this.gameWon || this.gameDead) return;
      for (const { bodyA, bodyB } of event.pairs) {
        this.handleBodyContact(bodyA, bodyB);
      }
    });
  }

  handleBodyContact(bodyA, bodyB) {
    // Switch: pressed by blocks only (not by the player)
    const swBody = bodyA.label === 'Switch' ? bodyA : bodyB.label === 'Switch' ? bodyB : null;
    if (swBody?.refObj) {
      const presser = swBody === bodyA ? bodyB : bodyA;
      if (presser.label === 'Block') {
        const sw = swBody.refObj;
        if (!sw.isPressed) this.pressSwitch(sw, presser);
      }
      return;
    }

    // Player-specific contacts
    const pb = bodyA.label === 'player' ? bodyA : bodyB.label === 'player' ? bodyB : null;

    console.log('Collision:', bodyA.label, bodyB.label);

    if (!pb) return;
    const other = pb === bodyA ? bodyB : bodyA;

    console.log('Other label:', other.label);
    console.log('Other refObj:', other.refObj);

    if (other.label === 'Key') {
      console.log('Key collision detected');
      const k = other.refObj;
      if (k && !k.isDead) this.collectKey(k);
    } else if (other.label === 'Door') {
      console.log('Door collision detected');
      if (this.level.door?.isOpen) this.triggerWin();
    } else if (other.label === 'Spike') {
      console.log('Spike collision detected');
      this.checkSpikeDeath(other.refObj, pb.position);
    }
  }

  collectKey(keyObj) {
    keyObj.isDead = true;
    keyObj.sprite?.destroy();
    keyObj.sprite = null;
    keyObj.body   = null;
    this.level.keys    = this.level.keys.filter(k => k !== keyObj);
    this.level.objects = this.level.objects.filter(o => o !== keyObj);
    try { this.sound.play('zipperFast'); } catch { /* ignore */ }
    if (this.level.keys.length === 0) this.openDoor();
  }

  openDoor() {
    const door = this.level.door;
    if (!door || door.isOpen) return;
    door.isOpen = true;
    if (door.sprite) door.sprite.play('openDoor');
  }

  pressSwitch(sw, presserBody) {
    sw.isPressed    = true;
    sw.pressingBody = presserBody;
    if (sw.sprite && this.textures.exists('switchOnTexture')) sw.sprite.setTexture('switchOnTexture');
    for (const l of sw.horizontalLines) this.level.addHRLine(l);
    for (const l of sw.verticalLines)   this.level.addVRLine(l);
    for (const l of sw.diagonalLines)   this.level.addDLine(l);
    // Auto-select the first line the switch unlocked so the player can reflect immediately.
    if (sw.horizontalLines.length && this.level.canReflectHorizontal) {
      this.level.reflectionOrientation = 'HORIZONTAL';
      this.level.reflectionLinePosition = sw.horizontalLines[0];
    } else if (sw.verticalLines.length && this.level.canReflectVertical) {
      this.level.reflectionOrientation = 'VERTICAL';
      this.level.reflectionLinePosition = sw.verticalLines[0];
    } else if (sw.diagonalLines.length && this.level.canReflectDiagonal) {
      this.level.reflectionOrientation = 'DIAGONAL';
      this.level.reflectionLinePosition = sw.diagonalLines[0];
    }
    for (const img of sw.indicatorImages ?? []) img.setVisible(true);
    this.initReflectionState();
  }

  releaseSwitch(sw) {
    sw.isPressed    = false;
    sw.pressingBody = null;
    if (sw.sprite && sw.textureName) sw.sprite.setTexture(sw.textureName);
    for (const l of sw.horizontalLines) this.level.removeHRLine(l);
    for (const l of sw.verticalLines)   this.level.removeVRLine(l);
    for (const l of sw.diagonalLines)   this.level.removeDLine(l);
    for (const img of sw.indicatorImages ?? []) img.setVisible(false);
    // Clear the line if it came from this switch and is no longer available.
    const pos = this.level.reflectionLinePosition;
    if (sw.horizontalLines.includes(pos) || sw.verticalLines.includes(pos) || sw.diagonalLines.includes(pos)) {
      this.level.reflectionLinePosition = -2;
    }
    this.initReflectionState();
  }

  updateSwitches() {
    const tileW = this.level.dims.tileSizePx().w;
    const tileH = this.level.dims.tileSizePx().h;
    for (const obj of this.level.objects) {
      if (obj.typeName !== 'Switch' || !obj.isPressed || !obj.pressingBody) continue;
      const dx = Math.abs(obj.pressingBody.position.x - obj.body.position.x);
      const dy = Math.abs(obj.pressingBody.position.y - obj.body.position.y);
      if (dx > tileW || dy > tileH) this.releaseSwitch(obj);
    }
  }

  updateBlocks() {
    const pairs = this.matter.world.engine.pairs.list;

    for (const obj of this.level.objects) {
      if (obj.typeName !== 'Block' || !obj.body || !obj.sprite) continue;

      // Zero friction while airborne so wall contacts can't pin the block via
      // perpendicular friction forces. Restore it when the block has a solid floor
      // contact so it doesn't slide around when resting.
      // After a reflection teleport, ignore floor contacts for a few frames while
      // Matter.js clears the now-stale contact pairs from the old position.
      if (obj._postReflectFrames > 0) obj._postReflectFrames--;
      let hasFloor = false;
      if (!obj._postReflectFrames) {
        for (const pair of pairs) {
          if (!pair.isActive || pair.isSensor) continue;
          if (pair.bodyA !== obj.body && pair.bodyB !== obj.body) continue;
          const n   = pair.collision.normal;
          const dot = pair.bodyA === obj.body ? n.y : -n.y;
          if (dot < -0.7) { hasFloor = true; break; }
        }
      }
      obj.body.friction       = hasFloor ? Math.min(obj.friction, 0.5) : 0;
      obj.body.frictionStatic = 0;

      if (obj.textureName !== 'buddyBlock') continue;

      if (obj._flinchTimer === undefined) { obj._flinchTimer = 0; obj._wasFalling = false; }

      const falling = obj.body.velocity.y > 1.0;

      if (obj._flinchTimer > 0) {
        obj._flinchTimer--;
        if (obj._flinchTimer === 0) obj.sprite.setTexture('buddyBlock');
      } else if (falling) {
        obj._wasFalling = true;
        obj.sprite.setTexture('buddyBlockFall');
      } else if (obj._wasFalling) {
        obj._wasFalling = false;
        obj._flinchTimer = 15;
        obj.sprite.setTexture('buddyBlockFlinch');
      }
    }
  }

  handleBlockGrab() {
    if (!Phaser.Input.Keyboard.JustDown(this.eKey)) return;
    if (this.grabbedBlock) {
      this.releaseBlock();
    } else {
      // Require the block to be physically touching: centers within ~1.1 tiles.
      const tileSize  = this.level.dims.tileSizePx().w;
      const threshold = (tileSize * 1.1) ** 2;
      let closest = null, closestDist = Infinity;
      for (const obj of this.level.objects) {
        if (obj.typeName !== 'Block') continue;
        const dx = obj.body.position.x - this.playerBody.position.x;
        const dy = obj.body.position.y - this.playerBody.position.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < threshold && d2 < closestDist) { closest = obj; closestDist = d2; }
      }
      if (closest) {
        this.grabbedBlock   = closest;
        this.blockJoint     = this.matter.add.constraint(
          this.playerBody, closest.body, tileSize, 0.1
        );
        closest.isReflectable = false;
        closest.sprite?.setTint(0x666666);
      }
    }
  }

  releaseBlock() {
    if (!this.grabbedBlock) return;
    Phaser.Physics.Matter.Matter.Composite.remove(
      this.matter.world.localWorld, this.blockJoint
    );
    this.grabbedBlock.isReflectable = this.grabbedBlock.isOriginallyReflectable;
    if (this.grabbedBlock.isOriginallyReflectable) this.grabbedBlock.sprite?.clearTint();
    this.blockJoint   = null;
    this.grabbedBlock = null;
  }

  checkSpikeDeath(spikeObj, playerPos) {
    if (!spikeObj) return;
    const { x: px, y: py } = playerPos;
    const { x: sx, y: sy } = spikeObj.body.position;
    // A small inward margin on the deadly axis prevents corner-grazing kills.
    // The perpendicular-axis range check (within tile half-width/height) prevents
    // deaths when the player's body clips the corner while walking the safe side.
    const M = 4;
    const dims = this.level.dims;
    const hw = (dims.widthMeters  * dims.scale) / dims.numRows  / 2;  // 16.25px
    const hh = (dims.heightMeters * dims.scale) / dims.numCols / 2;  // 16.25px
    let deadly = false;
    switch (spikeObj.direction) {
      case 'Up':    deadly = py <= sy - M && Math.abs(px - sx) <= hw; break;
      case 'Down':  deadly = py >= sy + M && Math.abs(px - sx) <= hw; break;
      case 'Left':  deadly = px <= sx - M && Math.abs(py - sy) <= hh; break;
      case 'Right': deadly = px >= sx + M && Math.abs(py - sy) <= hh; break;
      default:      deadly = true;
    }
    if (deadly) this.triggerDeath('spike');
  }

  triggerWin() {
    if (this.gameWon || this.gameDead) return;
    this.gameWon = true;
    this.matter.world.pause();
    this.releaseBlock();

    achievements.resetConsecutiveFails();
    // Hide player immediately
    if (this.playerSprite) this.playerSprite.setVisible(false);
    try { this.sound.play('zipperSlow'); } catch { /* ignore */ }

    // Play doorEat animation, then zip, then load next level
    const door = this.level.door;
    if (door?.sprite) {
      door.sprite.play('doorEat');
      door.sprite.once('animationcomplete', () => this.playZipTransition());
    } else {
      this.playZipTransition();
    }
  }

  playZipTransition() {
    this.reflectionLineGfx?.setVisible(false);
    for (const img of this.allIndicatorImages ?? []) img.setVisible(false);
    const { w, h } = this.level.dims.screenSizePx();
    const cx = this.offsetX + w / 2, cy = this.offsetY + h / 2;
    const zip = this.add.sprite(cx, cy, 'zip', 0)
      .setDisplaySize(w, h)
      .setDepth(100)
      .play('zip');
    zip.once('animationcomplete', () => {
      progress.markCompleted(this.levelIdx);
      achievements.completeLevel(this.levelIdx, this._levelReflections, this._blocksDestroyed);
      achievements.registerLevelCompleteTime(this.levelIdx, Date.now() - this._levelStartTime);
      const special = ['credits_level.xml', 'keyboard_controls.xml', 'xbox_controls.xml'];
      if (special.includes(this.levelFile)) {
        this.scene.launch('MainMenuScene');
        this.scene.bringToTop('GameScene');
        this.children.each(child => child.setVisible(false));
        const { w, h } = this.level.dims.screenSizePx();
        const ucx = this.offsetX + w / 2, ucy = this.offsetY + h / 2;
        const unzipSpr = this.add.sprite(ucx, ucy, 'unzip', 0)
          .setDisplaySize(w, h).setDepth(100).setVisible(true).play('unzip');
        unzipSpr.once('animationcomplete', () => this.scene.stop('GameScene'));
        return;
      }
      const next = this.getNextLevel();
      if (!next) {
        this.scene.start('WinScene');
        return;
      }
      this.scene.restart({ levelFile: next.file, levelIdx: next.idx, playUnzip: true });
    });
  }

  getNextLevel() {
    if (this.levelIdx < 0) return null;
    const nextIdx = this.levelIdx + 1;
    if (nextIdx >= LEVEL_LIST.length) return null;
    return { file: LEVEL_LIST[nextIdx].file, idx: nextIdx };
  }

  triggerDeath(type = 'fall') {
    if (this.gameDead || this.gameWon) return;
    this.gameDead = true;
    this.matter.world.pause();
    this.releaseBlock();
    achievements.incConsecutiveFails();
    switch (type) {
      case 'spike':           achievements.deathBySpike();           break;
      case 'spikeCollision':  achievements.deathBySpikeCollision();  break;
      case 'block':           achievements.deathByBlock();           break;
      case 'wall':            achievements.deathByWall();            break;
      default:                achievements.deathByFall();            break;
    }
    try { this.sound.play('dunDunDun'); } catch { /* ignore */ }
    this.scene.launch('PauseScene', {
      gameSceneKey: 'GameScene',
      levelFile: this.levelFile,
      levelIdx: this.levelIdx,
      noResume: true
    });
    this.scene.bringToTop('PauseScene');
    this.scene.pause();
  }

  showAchievementNotification(ach) {
    const { width: sw, height: sh } = this.scale;
    const banner = this.add.text(sw / 2, sh * 0.12,
      `Achievement Unlocked!\n${ach.title}`, {
        color: '#ffdd44', fontFamily: 'monospace', fontSize: '18px',
        align: 'center', stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(200);
    this.tweens.add({ targets: banner, alpha: 0, delay: 2500, duration: 800, onComplete: () => banner.destroy() });
  }

  // -------------------------------------------------------------------------
  // Eye tracking gaze dwell
  // -------------------------------------------------------------------------

  updateGazeDwell() {
    // Rolling-buffer dwell: keep the last BUFFER frames of canvas-space gaze.
    // A reflection triggers when at least DWELL_FRAC of those frames landed
    // within HIT_RADIUS of the same indicator. Brief blinks or saccades away
    // no longer reset progress — the count just dips slightly.
    const BUFFER     = 90;   // frames (~1.5s at 60fps)
    const DWELL_FRAC = 0.50; // 50% of buffer must be on-target
    const HIT_RADIUS = 80;   // px — generous to account for tracker noise

    if (!this._gazeTracker?.active) {
      this._gazeProgressGfx?.clear();
      this._gazeDebugText?.setVisible(false).setText('');
      return;
    }

    const gaze = this._gazeTracker.getGaze();
    this._gazeProgressGfx.clear();

    if (!gaze) {
      this._gazeDebugText?.setVisible(true).setText('EYE: active — no gaze yet (check camera / complete calibration)');
      return;
    }

    const rect = this.game.canvas.getBoundingClientRect();
    const cx = gaze.x - rect.left;
    const cy = gaze.y - rect.top;

    this._gazeDebugText?.setText(
      `EYE: active  vp=(${Math.round(gaze.x)},${Math.round(gaze.y)})  cv=(${Math.round(cx)},${Math.round(cy)})`
    );

    // Debug crosshair at current gaze position.
    this._gazeProgressGfx.lineStyle(2, 0xffff00, 0.85);
    this._gazeProgressGfx.strokeCircle(cx, cy, 18);
    this._gazeProgressGfx.beginPath();
    this._gazeProgressGfx.moveTo(cx - 14, cy); this._gazeProgressGfx.lineTo(cx + 14, cy);
    this._gazeProgressGfx.moveTo(cx, cy - 14); this._gazeProgressGfx.lineTo(cx, cy + 14);
    this._gazeProgressGfx.strokePath();

    // Push to rolling buffer.
    this._gazeBuffer.push({ x: cx, y: cy });
    if (this._gazeBuffer.length > BUFFER) this._gazeBuffer.shift();

    if (this._gazeCooldown > 0) { this._gazeCooldown--; return; }

    // Find the indicator with the most readings in the buffer.
    let bestHit = null, bestCount = 0;
    for (const d of this._indicatorData) {
      if (!d.img.visible) continue;
      let count = 0;
      for (const p of this._gazeBuffer) {
        if (Math.hypot(p.x - d.img.x, p.y - d.img.y) < HIT_RADIUS) count++;
      }
      if (count > bestCount) { bestCount = count; bestHit = d; }
    }

    if (!bestHit || bestCount < 3) return; // not enough readings near any icon yet

    const frac = Math.min(bestCount / (BUFFER * DWELL_FRAC), 1);

    // Progress arc around the leading indicator.
    const r = bestHit.size / 2 + 6;
    this._gazeProgressGfx.lineStyle(3, 0x00ff88, 0.9);
    this._gazeProgressGfx.beginPath();
    this._gazeProgressGfx.arc(
      bestHit.img.x, bestHit.img.y, r,
      -Math.PI / 2,
      -Math.PI / 2 + frac * Math.PI * 2,
      false
    );
    this._gazeProgressGfx.strokePath();

    if (frac >= 1) {
      this._gazeBuffer      = [];
      this._gazeCooldown    = 90;
      this.level.reflectionOrientation  = bestHit.orientation;
      this.level.reflectionLinePosition = bestHit.linePos;
      this.initReflectionState();
      this.triggerReflect();
    }
  }

  _showGazeToggleNotice(enabled) {
    const { width: sw, height: sh } = this.scale;
    const banner = this.add.text(sw / 2, sh * 0.18,
      enabled ? 'Eye tracking ON\n(look at umbrella for 1s to reflect)' : 'Eye tracking OFF', {
        color: enabled ? '#00ff88' : '#ff8888',
        fontFamily: 'monospace', fontSize: '16px',
        align: 'center', stroke: '#000000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(200);
    this.tweens.add({ targets: banner, alpha: 0, delay: 2000, duration: 600,
      onComplete: () => banner.destroy() });
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  resolveTexture(obj) {
    if (obj instanceof Spike) return obj.textureNameForDirection() || obj.textureName;
    return obj.textureName;
  }
}
