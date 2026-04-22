# Reflexio: XNA/FNA → Phaser port

This is a port of **Reflexio** (originally a C# XNA/FNA game with Farseer Physics)
to **Phaser 3 + Matter.js**, built incrementally over multiple sessions.

The original source is in a separate folder (not in this project). A prior Claude
session did reconnaissance on the original codebase and wrote Session 1. This
document captures everything needed to continue from Session 2 onward without
re-doing that reconnaissance.

---

## Project goals

- **Full conversion** — all 53 published levels, menus, achievements, audio
- **Close fidelity** — same mechanics and feel; tuning differences are acceptable
- **Physics engine: Matter.js** (Phaser built-in, Box2D-ish, supports constraints
  for the block-grab joint)

---

## What Reflexio is

Tile-based puzzle platformer on a 20×20 grid. The player (a koala) must reach the
door; some levels require collecting keys first. The signature mechanic is
**reflection**: pressing a button mirrors the whole level (or an active row/column/
diagonal band) along a selectable line. Objects on the grid can be individually
flagged as reflectable or not.

Object types: `Wall`, `Block` (grabbable), `Spike`, `Switch`, `Key`, `Door`, `Player`.

---

## Source code style preferences (from the user)

- **Concise, decisive prose** in comments and commit messages; no em dashes
- **Firm recommendations** over hedged analysis
- **Minimal output**: when writing reports/docs, use prose not bullet lists
  unless explicitly asked

---

## Architecture overview (Session 1, already built)

### Coordinate systems

Three coordinate spaces:

1. **Discrete (tile)** — integer `(x, y)` in `[0, numRows) × [0, numCols)`.
   What level XMLs store.
2. **Continuous (meters)** — float `(x, y)` in physics-world meters, range
   `[0, widthMeters] × [0, heightMeters]`. Farseer/Matter operate here.
3. **Screen (pixels)** — meters × `scale`. Default `scale = 50` px/m, so a
   13×13 m level renders at 650×650 px.

All three live in `src/util/coords.js` as a `LevelDims` class.

Key conversions (ported verbatim from `Level.cs`):

```js
// Discrete tile -> top-left corner in meters
discreteToContinuous(x, y)            // = { x * rowScale, y * colScale }

// Discrete tile + object size -> center point in meters (matches body origin)
discreteToContinuousMidPoint(x, y, w, h)  // = { x*rowScale + w/2, y*colScale + h/2 }
```

`rowScale = widthMeters / numRows` and `colScale = heightMeters / numCols`.
For the default 13m / 20-tile level, each tile is **0.65 m**.

**Known quirk preserved**: `continuousToDiscrete` in the original divides x by
`colScale` and y by `rowScale` (swapped from what the names suggest). Invisible
because all shipped levels are square; preserved for faithfulness. Flagged in
`coords.js`.

### XML level loader

Port of `LevelCreator.cs`, which used C# reflection. The JS equivalent:

- **Class registry** (`registerClass(tagName, ctor)` in `levelLoader.js`) maps
  XML tag names to JS constructors. Each object module calls `registerClass`
  at import time; `src/objects/index.js` is a barrel that ensures all classes
  register.
- **Setter resolver** (`resolveSetter`) tries `set<Name>`, `add<Name>`,
  `<name>` (lowercased first char), `<Name>` in that order. This replicates the
  original's `SetX` / `AddX` / `X` C# method lookup and naturally handles
  oddities like `<SetReflectedHorizontal>` which maps to the method called
  `setReflectedHorizontal`.
- **Argument parsing**: comma-separated, coerced to `true`/`false`/int/float
  or left as string. Hashed object references (from `hash="name"` attributes)
  resolve to previously-declared objects.
- **UTF-8 BOM**: level XMLs are authored on Windows and start with `\uFEFF`.
  The loader strips it before parsing.

Parse entry points:
```js
parseLevelFromString(xml)  // sync
loadLevel(filename)        // fetches /levels/<file> and parses
```

All 64 level XMLs parse cleanly under the current loader (verified in Session 1).

### Object classes (Session 1 - data-only)

Every class is a **thin data container** for Session 1. Physics bodies, rendering,
collision, and animation come in Sessions 2+.

- `Level` — top-level container. Holds `widthMeters/heightMeters/numRows/numCols/scale/gravity`,
  reflection config, object list, player/door/keys refs, and `dims` (a `LevelDims`
  instance populated in `initialize()`).
- `ReflectableObject` — base for grid-bound objects. Fields: `textureName`,
  `isReflectable`, `discX/discY` (tile coords), `reflectedHorizontal/Vertical`,
  `friction/density/restitution`, `widthMeters/heightMeters/centerMeters`
  (populated in `initialize()`), `body` (null until Session 2), `level`.
- `ReflectableAndOrientable extends ReflectableObject` — adds `direction`
  (`'Up'|'Down'|'Left'|'Right'`) for spikes and switches. See `Direction` enum
  export.
- `Wall extends ReflectableObject` — static, one tile. No extras.
- `Block extends ReflectableObject` — dynamic, grabbable. Tracks
  `isOriginallyReflectable` so grab can temporarily freeze reflectability.
- `Spike extends ReflectableAndOrientable` — has `textureNameForDirection()`
  helper that returns the right `spikesUp/Right/Down/LeftTexture` name.
- `Switch extends ReflectableAndOrientable` — has its own `horizontalLines`,
  `verticalLines`, `diagonalLines` lists (populated from `<HLine>`/`<VLine>`/
  `<DLine>` XML tags). When pressed, these get added to the level's global
  `horizontalLines`/`verticalLines`/`diagonalLines` arrays.
- `Key extends ReflectableObject` — collectible with `isDead` flag.
- `Door extends ReflectableObject` — adds `openDoorTextureName` and
  `closeDoorTextureName` setters. `initialize()` sets `textureName` to the close
  texture, matching the original's behavior.
- `Player` — **does NOT extend ReflectableObject** (mirrors the source). Has
  `bufferedTileX/Y` set from `<BufferedPosition>x,y</BufferedPosition>`.
  `initialize()` sizes the player to **90% of a tile** (`rowScale * 0.9`) per
  `Player.cs` line 148-149.

### Asset registries

- `src/loader/textureRegistry.js` — 130+ entries, direct port of `texture_files[]`
  in `GameEngine.cs`. Logical name → file path. Used by `PreloadScene` and by
  game code that refers to textures by their registry name.
- `src/loader/spritesheetRegistry.js` — the 9 filmstrip textures identified
  from reading `Player.cs` / `Door.cs` / `Level.cs` / menu code:
    - `playerTexture` (6×1, walk), `idleStrip` (7×1), `reflectionStrip` (10×1)
    - `openDoorStrip` (5×1), `doorEat` (5×1), `deathStrip` (2×1)
    - `zip` (5×3), `unzip` (5×3) — 800×800 per frame
    - `mainbkg` (4×3) — menu background, 800×800 per frame
  `PreloadScene` loads these as spritesheets instead of images so frame
  indexing works.
- `src/loader/audioRegistry.js` — 19 entries, direct port of `music_files[]`.
  Audio is mp3 (usable directly in browsers - no re-export needed).
- `src/loader/levelList.js` — the ordered 53-level list ported from
  `level_files[]` in `GameEngine.cs`. Each entry is `{file, title, diff}` with
  `diff` ∈ `{'t', 'e', 'm', 'h'}` for tutorial/easy/medium/hard.

### Scenes

- `PreloadScene` — loads every texture from the registry (as image or
  spritesheet), then transitions to `TestScene`.
- `TestScene` — Session 1 deliverable. Loads a level XML and renders every
  object as a static sprite at the correct tile position, with a grid overlay
  and HUD. Number keys `1`-`6` switch between pre-chosen levels. No physics,
  no input beyond level switching.

---

## Session roadmap

Each session should leave the project in a testable state.

| # | Status | Scope |
|---|--------|-------|
| 1 | **Done** | Scaffold + loader + static rendering |
| 2 |  | Matter.js + player movement + ground sensor |
| 3 |  | Reflection mechanic (H/V/D, pause animation, per-object reflectability) |
| 4 |  | Block grab, switches, doors, keys, win/lose states |
| 5 |  | Menus + level select + audio |
| 6 |  | Achievements + save state + polish |
| 7+ |  | Bug hunt and fidelity pass across all 53 levels |

---

## Session 2 plan: physics + player movement

### Physics constants (from `Player.cs` and `PlayerController.cs`)

```js
const DUDE_FORCE       = 20.0;   // applied horizontally while walking
const DUDE_DAMPING     = 20.0;   // applied when no input, to decelerate
const DUDE_MAXSPEED    = 2.0;    // clamp on horizontal velocity
const JUMP_FORCE       = -300.0; // applied once on jump
const JUMP_COOLDOWN    = 30;     // frames before next jump allowed
const PLAYER_SCALE     = 0.9;    // fraction of tile size for body
```

### Player body

- Collision shape: 20-vertex **ellipse** (`PolygonTools.CreateEllipse(w/2, h/2, 20)`
  in Farseer). Matter.js has no ellipse primitive — use
  `Matter.Bodies.polygon` with 20 vertices at ellipse coordinates, or
  `Bodies.fromVertices` with manually computed ellipse points. Don't use a
  circle; the game tunes its movement expecting a slightly-flattened oval feel.
- Body density: `1.5` (from XML `<Density>1.5</Density>`).
- Friction: `0` on the player body itself (movement is velocity-controlled).
- Body type: dynamic.
- Gravity: use the level's `<Gravity>` value (default `(0, 9.8)` meters/s²).

### Ground sensor

Separate fixture attached to the player body:

```
sensorWidth = width * 0.85
sensorCenter = (0, height / 2)  // centered on bottom edge
```

It's a thin rectangle below the feet, registered as a sensor (no collision
response, only contact callbacks). In Matter.js: attach a second body via
`Matter.Body.setParts` with `isSensor: true` on the sensor child, or create
two bodies connected by a stiff constraint. The former is cleaner.

The ground sensor tracks `isGrounded`. `jump` is only allowed when
`isGrounded && jumpCooldown === 0`.

### Input

Port of the `GameState.PLAYING → Level.GameState.Playing` section of
`PlayerController.cs` (lines 798-1020):

- **Movement**: `Left`/`Right` arrow keys or left-thumbstick-left/right.
  When pressed: apply `DUDE_FORCE` horizontally. When released: apply
  `-DUDE_DAMPING * velocity.x` to decelerate. Clamp `|vel.x| <= DUDE_MAXSPEED`.
- **Jump**: `Up` arrow or `A` button. One-shot (press-rise-release pattern).
  Apply `(0, JUMP_FORCE)` once, set `jumpCooldown = JUMP_COOLDOWN`.
- **Reflection line navigation** (for Session 3, but wire up now):
  `W/A/S/D` or right thumbstick move the reflection line. `Space` or triggers
  reflect. `X` or `Y` button toggles diagonal reflection.
- **Block grab** (Session 4): `E` or `X` button.
- **Restart**: `R`.
- **Pause**: `Escape`.

Phaser's `scene.input.keyboard` handles keys; `scene.input.gamepad` handles
Xbox-style controllers. The original's "has released" latching (to prevent
auto-repeat) maps to Phaser's `JustDown`/`JustUp` helpers.

### Wall/Block bodies

- Walls: `Matter.Bodies.rectangle`, static (`isStatic: true`). Size matches
  tile. Friction from XML (typically `1`).
- Blocks: same shape, **dynamic**. Friction/density/restitution from XML
  (typically `5 / 1 / 0.25`).

### Physics world setup

In the Phaser scene config, enable Matter:

```js
const config = {
  // ...
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 1 },  // Phaser uses normalized gravity; real value set per-level
      debug: true   // enable during dev
    }
  }
};
```

Then per-level, after parsing, **set gravity** from the level's XML:
```js
this.matter.world.setGravity(level.gravity.x, level.gravity.y);
```

Matter uses the same meters-ish units as Farseer (roughly — Matter treats
bodies in pixels by default, but can be configured to scale). **Important**:
decide early whether Matter bodies will live in meters (and the renderer
scales up by 50) or in pixels (and the physics tuning constants get scaled).

Recommendation: **scale everything up to pixels** for Matter. Multiply body
sizes, forces, and velocity clamps by `scale` (50). This matches Phaser's
default and avoids Matter's "internal timestep assumes ~60fps pixel physics"
quirks. Gravity of `9.8` m/s² becomes `9.8 * 50 = 490` px/s² → Matter's
`scale * worldGravityY / frameRate^2` accounting, so use `gravity.y = 1`
as the normalized value and rely on Matter defaults, OR set
`this.matter.world.engine.gravity.y = level.gravity.y` and scale forces
accordingly. Test early on `block_intro` with a single wall and a dropped
block to confirm "it falls at the right speed."

### Rendering → body sync

Each `Phaser.GameObjects.Sprite` should track a Matter body. Use
`this.matter.add.sprite(x, y, textureKey)` which creates both atomically.
Or use `this.matter.add.gameObject(sprite, bodyOptions)` to attach a body
to an already-created sprite. The latter lets us keep the data-model
(created in Session 1) and the Matter body (created in Session 2) as
separate concerns: the `Level`'s objects still know their `centerMeters`
position, and the scene builds a sprite+body for each at load time.

### Session 2 deliverable

Load `block_intro.xml`, walk the player left/right with arrows, jump with
Up, and have the walls and door be solid obstacles. Block (the buddy block)
should fall and rest on the floor. Reflection doesn't work yet. Restart key
works. Visual: walk-strip animation plays during movement, idle-strip while
still.

---

## Notes / gotchas from the reconnaissance

- **Block vs. Wall collision**: walls have `Density=0` (static), blocks have
  `Density=1` (dynamic). This is how the original distinguishes them.
- **Spike damage**: only the pointy side kills; the base of the spike acts as
  a wall. Handled in `ContactManager.CheckSpiked` by checking relative
  positions of player vs. spike along its orientation axis. Port this in
  Session 4 (not Session 2).
- **Reflection timing**: physics is paused during reflection
  (`reflectionPauseRemainingTime > 0` skips `world.Step`). During the pause,
  objects are animated from their old screen position to their new one via
  `reflectionVelocity * elapsed`. Ported in Session 3.
- **Dead objects**: `PhysicsObject.isDead` is a flag checked in the main loop
  to remove objects (e.g. keys after collection). The `Level.objects`
  `LinkedList` iteration prunes dead nodes.
- **Slider joint for block grab**: `JointFactory.CreateSliderJoint(world, body1,
  body2, Vec2.Zero, Vec2.Zero, minDist, maxDist)` in Farseer. Matter.js
  equivalent is `Matter.Constraint.create({bodyA, bodyB, pointA, pointB,
  length, stiffness})`. Exact behavior: the two bodies are constrained to
  stay within a distance range along a line. Session 4.
- **Level.objects iteration order matters**: the original uses a
  `LinkedList<PhysicsObject>` preserving insert order, which also becomes
  draw order. Current JS implementation uses a plain `Array` — same semantics.
- **Audio formats**: mp3 directly. No XNB compilation step needed.
- **Level XMLs use `\uFEFF` BOM**: loader strips it. Don't re-introduce.
- **`<HLine>`/`<VLine>`/`<DLine>` (inside `<Switch>`)** vs. **`<HRLine>`/
  `<VRLine>`/`<DLine>` (inside `<Level>`)**: these are different. Switch-local
  lines activate only when the switch is pressed; Level-level lines are
  always active. The setter methods (`Switch.addHLine` vs `Level.addHRLine`)
  keep this distinction correct through the reflection-based dispatch.

---

## Running

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Number keys `1-6` in the TestScene switch levels
for quick testing.

---

## File map

```
public/
  levels/       64 level XMLs (all parse cleanly)
  images/       sprites in original Content/Images structure
  audio/        13 mp3 music and SFX files
src/
  main.js                         Phaser game config + boot
  loader/
    textureRegistry.js            logical name -> file path
    spritesheetRegistry.js        filmstrip metadata (9 strips)
    audioRegistry.js              logical name -> audio path
    levelList.js                  ordered 53-level list
    levelLoader.js                XML -> game objects (reflection-based)
  objects/
    Level.js                      top-level container
    ReflectableObject.js          base class for grid objects
    ReflectableAndOrientable.js   base for oriented objects
    Wall.js, Block.js, Spike.js, Switch.js, Key.js, Door.js, Player.js
    index.js                      barrel (triggers registerClass)
  scenes/
    PreloadScene.js               loads every asset
    TestScene.js                  Session 1 deliverable (static render)
  util/
    coords.js                     LevelDims - tile/meters/pixel conversions
```

---

## References into the original source (for Session 2+)

When implementing, pull logic from these exact locations in the FNA source tree:

- Player body/sensor setup: `Objects/Player.cs` lines 146-220
- In-play input handling: `PlayerController.cs` lines 798-1020
- Physics world + gravity + `Step` loop: `Level.cs` lines 388-396, 501-556
- Reflection math (object side): `Objects/ReflectableObject.cs` lines 226-302
- Reflection dispatch (level side): `Level.cs` lines 887-1014
- Ground sensor contact: `ContactManager.cs` lines 171-230
- Spike damage geometry: `ContactManager.cs` lines 225-293, 323-389
- Block grab (slider joint): `Objects/Player.cs` lines 314-354
- Door open/close: `Objects/Door.cs` lines 35-108
- Switch press/release: `Objects/Switch.cs` lines 81-127
- Level Initialize: `Level.cs` lines 372-422
- XML loader (for any edge cases): `LevelCreator.cs` lines 90-214

The original source is not included in this repo; user has it separately.
