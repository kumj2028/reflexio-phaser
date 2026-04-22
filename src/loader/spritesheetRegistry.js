/**
 * Strips that are actually animation filmstrips, not single images.
 * Port of the AnimationTexture usages in Player.cs, Door.cs, Level.cs, etc.
 *
 * Each entry gives:
 *   cols      - frames across
 *   rows      - frames down (usually 1)
 *   delay     - game-ticks between frames (for later animation use)
 *
 * The pixel size per frame is derived from the source PNG dimensions divided
 * by (cols, rows). Phaser's loader.spritesheet computes this automatically
 * given frameWidth / frameHeight, so PreloadScene must know the per-frame
 * pixel size too - that's resolved at load time from the registry below.
 *
 * Sources:
 *   Player.cs        walk=6,1 idle=7,1 reflection=10,1 jump/death=single frames
 *   Door.cs          openDoorStrip=5,1 doorEat=5,1
 *   Level.cs         zip/unzip=5,3
 */
export const SPRITESHEET_REGISTRY = {
  playerTexture:   { cols: 6,  rows: 1, delay: 5,  frameW: 32,  frameH: 32 },
  idleStrip:       { cols: 7,  rows: 1, delay: 10, frameW: 32,  frameH: 32 },
  reflectionStrip: { cols: 10, rows: 1, delay: 0,  frameW: 32,  frameH: 32 },
  openDoorStrip:   { cols: 5,  rows: 1, delay: 3,  frameW: 32,  frameH: 32 },
  doorEat:         { cols: 5,  rows: 1, delay: 5,  frameW: 32,  frameH: 32 },
  deathStrip:      { cols: 2,  rows: 1, delay: 5,  frameW: 32,  frameH: 32 },
  zip:             { cols: 5,  rows: 3, delay: 3,  frameW: 800, frameH: 800 },
  unzip:           { cols: 5,  rows: 3, delay: 3,  frameW: 800, frameH: 800 },
  mainbkg:         { cols: 4,  rows: 3, delay: 15, frameW: 800, frameH: 800 }
};
