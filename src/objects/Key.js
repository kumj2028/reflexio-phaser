import { ReflectableObject } from './ReflectableObject.js';
import { registerClass } from '../loader/levelLoader.js';

/**
 * Key: collectible that opens the door. Port of Key.cs (and its parent Collectible).
 *
 * Setters: inherited from ReflectableObject. No extras.
 * When all keys in a level are collected, the level's door opens. That logic
 * lives in ContactManager / Door (Session 4).
 *
 * In Farseer, keys are static sensor fixtures (no solid collision).
 */
export class Key extends ReflectableObject {
  constructor(level) {
    super(level);
    this.typeName = 'Key';
    this.isDead = false;
  }
}

registerClass('Key', Key);
