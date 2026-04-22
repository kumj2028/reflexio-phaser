import { registerClass } from '../loader/levelLoader.js';

/**
 * Player: the koala. Port of Player.cs.
 *
 * Does NOT extend ReflectableObject in the original - the player is a separate
 * PhysicsObject with its own initialize/reflect behavior (reflect is a no-op;
 * the player is never reflected, only pushed by reflected geometry).
 *
 * Setters:
 *   setTexture(name)              - walk-strip texture (XML sets 'playerTexture')
 *   setReflectionTexture(name)    - reflection strip (not visual player sprite)
 *   setBufferedPosition(x, y)     - discrete tile coords. Stored as a pending
 *                                   position until Initialize snaps it to the
 *                                   correct centered meter coordinate.
 *   setFriction, setDensity, setRestitution - fixture params
 *   setLevel(level)
 *   initialize()
 *
 * In the original the player collider is a 20-vertex ellipse slightly smaller
 * than a tile (width/height = ROW_SCALE * 0.9 / COL_SCALE * 0.9). We preserve
 * the scale factor here so later sessions can build the Matter body with it.
 */
export class Player {
  constructor(level) {
    this.level = level;
    this.typeName = 'Player';
    this.textureName = null;
    this.reflectionTextureName = null;

    // Discrete tile coords as parsed from XML. Resolved to meters in initialize().
    this.bufferedTileX = 0;
    this.bufferedTileY = 0;

    this.friction = 0;
    this.density = 1.5;
    this.restitution = 0;

    // Populated by initialize()
    this.widthMeters  = 0;
    this.heightMeters = 0;
    this.centerMeters = { x: 0, y: 0 };

    // Runtime state (used by later sessions)
    this.body = null;
    this.isGrounded = false;
    this.jumpCooldown = 0;
    this.isWalking = false;
    this.facingRight = true;
    this.hasMoved = false;
  }

  setTexture(name)             { this.textureName = name; }
  setReflectionTexture(name)   { this.reflectionTextureName = name; }
  setFriction(f)               { this.friction = f; }
  setDensity(f)                { this.density = f; }
  setRestitution(f)            { this.restitution = f; }
  setLevel(level)              { this.level = level; }

  /**
   * BufferedPosition is a comma-separated tile (x, y) pair in XML.
   * The loader will split and pass two ints.
   */
  setBufferedPosition(x, y) {
    this.bufferedTileX = x;
    this.bufferedTileY = y;
  }

  initialize() {
    const d = this.level.dims;
    // Player sprite/body sized to 90% of a tile (see Player.cs Initialize)
    this.widthMeters  = d.rowScale * 0.9;
    this.heightMeters = d.colScale * 0.9;
    // Player.cs SetBufferedPosition also adds (ROW_SCALE/2, COL_SCALE/2) to
    // the world-position to center the player on its spawn tile. We reproduce
    // that here so the spawn tile == the grid cell named in XML.
    this.centerMeters = {
      x: this.bufferedTileX * d.rowScale + d.rowScale / 2,
      y: this.bufferedTileY * d.colScale + d.colScale / 2
    };
  }
}

registerClass('Player', Player);
