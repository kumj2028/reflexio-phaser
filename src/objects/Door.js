import { ReflectableObject } from './ReflectableObject.js';
import { registerClass } from '../loader/levelLoader.js';

/**
 * Door: level exit. Port of Door.cs.
 *
 * Setter additions on top of ReflectableObject:
 *   setOpenDoorTexture(name)  - texture shown when open
 *   setCloseDoorTexture(name) - texture shown when closed
 *
 * XML convention: <Texture> is typically redundant with <CloseDoorTexture>, and
 * Door.Initialize assigns the render texture to closeDoorTexture regardless.
 * We mirror that.
 *
 * Behavior: starts closed; opens when all keys in the level are collected.
 * Player touching an open door wins the level. Open/close animation and
 * win detection come in Session 4.
 */
export class Door extends ReflectableObject {
  constructor(level) {
    super(level);
    this.typeName = 'Door';
    this.openDoorTextureName = null;
    this.closeDoorTextureName = null;
    this.isOpen = false;
  }

  setOpenDoorTexture(name)  { this.openDoorTextureName = name; }
  setCloseDoorTexture(name) { this.closeDoorTextureName = name; }

  initialize() {
    super.initialize();
    // Render name falls back to the close texture per Door.Initialize in source.
    if (this.closeDoorTextureName) this.textureName = this.closeDoorTextureName;
  }
}

registerClass('Door', Door);
