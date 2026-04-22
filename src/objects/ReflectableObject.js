/**
 * ReflectableObject: base class for objects that live on the grid and can be
 * mirrored by the reflection mechanic.
 *
 * For Session 1 this is data-only. Physics body creation, reflection animation,
 * and collision handling come in sessions 2+.
 *
 * Shared setter API across all reflectable types:
 *   setTexture(name)             - texture registry key
 *   setIsReflectable(bool)       - can this object be mirrored
 *   setX(int), setY(int)         - discrete tile position
 *   setReflectedHorizontal(bool) - current reflection state along each axis
 *   setReflectedVertical(bool)
 *   setFriction(f), setDensity(f), setRestitution(f) - Farseer fixture params
 *   setLevel(level)              - back-reference (set via `params=` attribute)
 *   initialize()                 - called after all setters to finalize
 */
export class ReflectableObject {
  constructor(level) {
    this.level = level;
    this.textureName = null;

    this.isReflectable = true;
    this.discX = 0;
    this.discY = 0;

    this.reflectedHorizontal = false;
    this.reflectedVertical   = false;

    this.friction = 0;
    this.density = 0;
    this.restitution = 0;

    // Populated by initialize() - width/height in meters of the sprite/body
    this.widthMeters  = 0;
    this.heightMeters = 0;

    // Populated by initialize() - world-space center in meters
    this.centerMeters = { x: 0, y: 0 };

    // Physics body reference - null in Session 1, Matter body in Session 2+
    this.body = null;
  }

  setTexture(name)               { this.textureName = name; }
  setIsReflectable(b)            { this.isReflectable = b; }
  setX(x)                        { this.discX = x; }
  setY(y)                        { this.discY = y; }
  setReflectedHorizontal(b)      { this.reflectedHorizontal = b; }
  setReflectedVertical(b)        { this.reflectedVertical   = b; }
  setFriction(f)                 { this.friction = f; }
  setDensity(f)                  { this.density = f; }
  setRestitution(f)              { this.restitution = f; }
  setLevel(level)                { this.level = level; }

  /**
   * Default finalizer: the object occupies exactly one tile and its center is
   * the tile's midpoint. Subclasses override to customize size/shape.
   */
  initialize() {
    const d = this.level.dims;
    this.widthMeters  = d.rowScale;
    this.heightMeters = d.colScale;
    this.centerMeters = d.discreteToContinuousMidPoint(
      this.discX, this.discY, this.widthMeters, this.heightMeters
    );
  }
}
