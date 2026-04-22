import { ReflectableObject } from './ReflectableObject.js';
import { registerClass } from '../loader/levelLoader.js';

/**
 * Block: dynamic, pushable/grabbable box. Port of Block.cs.
 *
 * Setters: inherited from ReflectableObject.
 * In Farseer the block is a Dynamic Body with friction/density/restitution from XML.
 * The player can grab the nearest block via E/X (see Player.toggleBlock in Session 4).
 */
export class Block extends ReflectableObject {
  constructor(level) {
    super(level);
    this.typeName = 'Block';
    this.isOriginallyReflectable = true;
  }

  // Capture isOriginallyReflectable after all XML setters have run (including
  // setIsReflectable). During a grab we directly write isReflectable = false and
  // restore from isOriginallyReflectable on release, without going through this setter.
  initialize() {
    super.initialize();
    this.isOriginallyReflectable = this.isReflectable;
  }
}

registerClass('Block', Block);
