import { ReflectableAndOrientable, Direction } from './ReflectableAndOrientable.js';
import { registerClass } from '../loader/levelLoader.js';

/**
 * Spike: kills the player on contact with its pointy side. Port of Spike.cs.
 *
 * Inherits Orientation setter. The XML typically sets <Texture>spikesUpTexture</Texture>
 * explicitly, but the original auto-derives the 4-direction texture array from
 * "spikesUp/Right/Down/Left Texture" in Spike.Initialize. We use the XML-specified
 * Texture directly for now and rotate/swap based on `direction`.
 *
 * A spike only deals damage when the player hits the pointy side - the "base"
 * sides are treated as walls. That logic lives in ContactManager (Session 2+).
 */
export class Spike extends ReflectableAndOrientable {
  constructor(level) {
    super(level);
  }

  /**
   * Which texture name to use for rendering based on current direction.
   * Falls back to the XML-specified textureName if direction hasn't been set.
   */
  textureNameForDirection() {
    switch (this.direction) {
      case Direction.Up:    return 'spikesUpTexture';
      case Direction.Right: return 'spikesRightTexture';
      case Direction.Down:  return 'spikesDownTexture';
      case Direction.Left:  return 'spikesLeftTexture';
      default:              return this.textureName;
    }
  }
}

registerClass('Spike', Spike);
