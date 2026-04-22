import { ReflectableObject } from './ReflectableObject.js';
import { registerClass } from '../loader/levelLoader.js';

/**
 * Wall: static obstacle, one tile. Port of Wall.cs.
 *
 * Setters: inherited from ReflectableObject. No extras.
 * In Farseer the wall is a static Body with a PolygonShape matching its tile size.
 */
export class Wall extends ReflectableObject {
  constructor(level) {
    super(level);
    this.typeName = 'Wall';
  }
}

registerClass('Wall', Wall);
