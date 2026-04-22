/**
 * Reflexio uses three coordinate systems:
 *
 *   1. DISCRETE (tile): integer (x, y) grid positions. Range [0, NUM_ROWS) x [0, NUM_COLS).
 *      This is what level XMLs store.
 *
 *   2. CONTINUOUS (meters): float (x, y) in physics-world meters. Farseer operates here.
 *      Range [0, WIDTH] x [0, HEIGHT]. For a 13x13 m level this is [0,13]x[0,13].
 *
 *   3. SCREEN (pixels): continuous meters * SCALE. For default SCALE=50 and a 13m level,
 *      render area is 650x650 px.
 *
 * Ported from Level.cs DiscreteToContinuous / DiscreteToContinuousMidPoint / ContinuousToDiscrete.
 *
 * A LevelDims struct captures the level's scaling parameters and exposes conversion helpers.
 */

export class LevelDims {
  /**
   * @param {object} opts
   * @param {number} opts.widthMeters  Level width in meters (Level.WIDTH, default 13)
   * @param {number} opts.heightMeters Level height in meters (Level.HEIGHT, default 13)
   * @param {number} opts.numRows      Grid rows (NUM_ROWS, default 20)
   * @param {number} opts.numCols      Grid cols (NUM_COLS, default 20)
   * @param {number} opts.scale        Meters -> pixels (SCALE, default 50)
   */
  constructor({ widthMeters, heightMeters, numRows, numCols, scale }) {
    this.widthMeters  = widthMeters;
    this.heightMeters = heightMeters;
    this.numRows      = numRows;
    this.numCols      = numCols;
    this.scale        = scale;

    // NOTE on row/col naming:
    // Level.cs exposes ROW_SCALE = WIDTH / NUM_ROWS  (x-axis scale)
    //                  COL_SCALE = HEIGHT / NUM_COLS (y-axis scale)
    // This is confusing - ROW_SCALE is the horizontal tile width, COL_SCALE is the
    // vertical tile height - but we keep the original names for traceability to
    // the source code.
    this.rowScale = widthMeters  / numRows;  // meters per tile along x
    this.colScale = heightMeters / numCols;  // meters per tile along y
  }

  /** Discrete tile (x, y) -> top-left corner in meters. */
  discreteToContinuous(x, y) {
    return { x: x * this.rowScale, y: y * this.colScale };
  }

  /**
   * Discrete tile (x, y) + object (width, height) in meters -> center point in meters.
   * This mirrors Level.DiscreteToContinuousMidPoint and is how Farseer bodies are placed:
   * the origin of a Body is its center of mass, so we offset by (w/2, h/2).
   */
  discreteToContinuousMidPoint(x, y, widthMeters, heightMeters) {
    return {
      x: x * this.rowScale + widthMeters  / 2,
      y: y * this.colScale + heightMeters / 2
    };
  }

  /**
   * Continuous meters (x, y) -> discrete tile indices.
   * NOTE: the source code has what looks like a swap bug - it divides x by COL_SCALE
   * and y by ROW_SCALE. Since ROW_SCALE == COL_SCALE in all shipped levels (square
   * tiles in a 13x13 level on a 20x20 grid), this never caused a visible problem.
   * We preserve the behavior to stay faithful, but flag it.
   */
  continuousToDiscrete(xMeters, yMeters) {
    return {
      x: Math.floor(xMeters / this.colScale),
      y: Math.floor(yMeters / this.rowScale)
    };
  }

  /** Meters -> pixels. */
  metersToPixels(meters) {
    return meters * this.scale;
  }

  /** Convenience: meters vec {x, y} -> pixels vec {x, y}. */
  meterVecToPixels({ x, y }) {
    return { x: x * this.scale, y: y * this.scale };
  }

  /** Full screen render size in pixels. */
  screenSizePx() {
    return {
      w: this.widthMeters  * this.scale,
      h: this.heightMeters * this.scale
    };
  }

  /** Tile size in pixels. Most sprites are rendered at this size. */
  tileSizePx() {
    return {
      w: this.rowScale * this.scale,
      h: this.colScale * this.scale
    };
  }
}
