import { ReflectableAndOrientable } from './ReflectableAndOrientable.js';
import { registerClass } from '../loader/levelLoader.js';

/**
 * Switch: toggled by contact with player or block. Port of Switch.cs.
 *
 * When pressed, a switch adds its own HLine/VLine/DLine values to the level's
 * active reflection lines, enabling reflection axes that are normally locked.
 * When released, those lines are removed.
 *
 * Setter additions on top of ReflectableAndOrientable:
 *   addHLine(int), addVLine(int), addDLine(int) - lines activated when pressed
 *
 * Runtime behavior (press/release, switchOn texture swap) comes in Session 4.
 */
export class Switch extends ReflectableAndOrientable {
  constructor(level) {
    super(level);
    this.horizontalLines = [];
    this.verticalLines   = [];
    this.diagonalLines   = [];
    this.isPressed = false;
  }

  addHLine(line) { this.horizontalLines.push(line); }
  addVLine(line) { this.verticalLines.push(line); }
  addDLine(line) { this.diagonalLines.push(line); }
}

registerClass('Switch', Switch);
