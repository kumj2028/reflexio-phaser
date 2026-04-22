import { ReflectableObject } from './ReflectableObject.js';

/**
 * ReflectableAndOrientable: base for Spike and Switch.
 * Port of ReflectableAndOrientable.cs.
 *
 * Adds a `direction` field (Up/Right/Down/Left) that determines which sprite
 * from a 4-direction array is rendered.
 *
 * Note: the original uses a `textures[4]` array indexed by direction enum
 * (Up=0, Right=1, Down=2, Left=3). Rather than replicate that here, subclasses
 * expose a `textureNameForDirection()` helper that the renderer consults.
 */
export const Direction = Object.freeze({
  Up: 'Up',
  Right: 'Right',
  Down: 'Down',
  Left: 'Left'
});

export class ReflectableAndOrientable extends ReflectableObject {
  constructor(level) {
    super(level);
    this.direction = Direction.Up;
  }

  setOrientation(or) {
    if (or === 'U') this.direction = Direction.Up;
    else if (or === 'R') this.direction = Direction.Right;
    else if (or === 'D') this.direction = Direction.Down;
    else if (or === 'L') this.direction = Direction.Left;
  }
}
