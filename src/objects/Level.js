import { LevelDims } from '../util/coords.js';
import { registerClass } from '../loader/levelLoader.js';

/**
 * Level is the top-level container populated by the XML loader.
 *
 * For Session 1 this is a pure data-holder: level geometry + the list of
 * game objects that need to be rendered. Physics world, contact manager,
 * game-state machine, reflection line tracking, and Simulate()/Draw() live
 * in later sessions.
 *
 * Setter API matches Level.cs one-for-one (in camelCase):
 *   setBkgSound, setBkgImage, setBkgText
 *   setWidth, setHeight, setGravity, setScale, setDimensions
 *   setReflectionPauseTime
 *   setCanReflectHorizontal, setCanReflectVertical, setCanReflectDiagonal
 *   setReflectionLinePosition, setReflectionOrientation
 *   addHRLine, addVRLine, addDLine
 *   initialize (called once from <Initialize/> to finalize setup)
 *   addWall, addPlayer, addKey, addDoor, addSpike, addBlock, addSwitch
 */
export class Level {
  constructor() {
    // Defaults mirror Level.cs static/instance defaults
    this.widthMeters  = 13;
    this.heightMeters = 13;
    this.numRows = 20;
    this.numCols = 20;
    this.scale = 50;
    this.gravity = { x: 0, y: 9.8 };
    this.reflectionPauseTime = 25;

    this.canReflectHorizontal = true;
    this.canReflectVertical   = false;
    this.canReflectDiagonal   = false;

    this.reflectionLinePosition = -2;
    // 'HORIZONTAL' | 'VERTICAL' | 'DIAGONAL' | 'NONE'
    this.reflectionOrientation = 'HORIZONTAL';
    this.currentPosInList = 0;

    this.horizontalLines = [];  // HRLine
    this.verticalLines   = [];  // VRLine
    this.diagonalLines   = [];  // DLine

    this.bkgSound = null;
    this.bkgImage = null;
    this.bkgText  = null;

    // Populated post-initialize:
    this.dims = null;  // LevelDims

    // Object container - order matters for draw order (matches Level.cs LinkedList)
    this.objects = [];
    this.player = null;
    this.door = null;
    this.keys = [];
  }

  // --- Scalar setters -----------------------------------------------------
  setBkgSound(s) { this.bkgSound = s; }
  setBkgImage(s) { this.bkgImage = s; }
  setBkgText(s)  { this.bkgText  = s; }

  setWidth(w)  { this.widthMeters  = w; }
  setHeight(h) { this.heightMeters = h; }
  setGravity(x, y) { this.gravity = { x, y }; }
  setScale(s) { this.scale = s; }
  setDimensions(rows, cols) { this.numRows = rows; this.numCols = cols; }
  setReflectionPauseTime(t) { this.reflectionPauseTime = t; }

  setCanReflectHorizontal(b) { this.canReflectHorizontal = b; }
  setCanReflectVertical(b)   { this.canReflectVertical   = b; }
  setCanReflectDiagonal(b)   { this.canReflectDiagonal   = b; }

  setReflectionLinePosition(p) { this.reflectionLinePosition = p; }

  setReflectionOrientation(orientation) {
    const o = orientation.toUpperCase();
    if (o === 'H') this.reflectionOrientation = 'HORIZONTAL';
    else if (o === 'V') this.reflectionOrientation = 'VERTICAL';
    else if (o === 'D') this.reflectionOrientation = 'DIAGONAL';
  }

  addHRLine(line) { this.horizontalLines.push(line); }
  addVRLine(line) { this.verticalLines.push(line); }
  addDLine(line)  { this.diagonalLines.push(line); }

  removeHRLine(line) { const i = this.horizontalLines.indexOf(line); if (i >= 0) this.horizontalLines.splice(i, 1); }
  removeVRLine(line) { const i = this.verticalLines.indexOf(line);   if (i >= 0) this.verticalLines.splice(i, 1); }
  removeDLine(line)  { const i = this.diagonalLines.indexOf(line);   if (i >= 0) this.diagonalLines.splice(i, 1); }

  /**
   * <Initialize /> on the Level sets up dims. Must be called before adding objects
   * (in the XML it appears before any objects, matching Level.cs Initialize()).
   */
  initialize() {
    this.dims = new LevelDims({
      widthMeters:  this.widthMeters,
      heightMeters: this.heightMeters,
      numRows:      this.numRows,
      numCols:      this.numCols,
      scale:        this.scale
    });
  }

  // --- Object adders ------------------------------------------------------
  addWall(w)    { this.objects.push(w); }
  addBlock(b)   { this.objects.push(b); }
  addSpike(s)   { this.objects.push(s); }
  addSwitch(s)  { this.objects.push(s); }
  addDoor(d)    { this.objects.push(d); this.door = d; }
  addKey(k)     { this.objects.push(k); this.keys.push(k); }
  addPlayer(p)  { this.objects.push(p); this.player = p; }
}

registerClass('Level', Level);
