# Reflexio (Phaser port)

A port of Reflexio (originally XNA/FNA + Farseer Physics) to Phaser 3 + Matter.js,
built in incremental sessions.

## Status

**Session 1 complete: scaffold + level loader + static rendering.**

- Full project scaffold (Vite + Phaser 3.80)
- Asset registries ported from `GameEngine.cs`
- Ordered 53-level list with difficulty codes
- Coordinate system helpers (tile / meters / pixels)
- XML level loader (port of `LevelCreator.cs` reflection-based parser)
- Data-model classes: `Level`, `Wall`, `Block`, `Spike`, `Switch`, `Key`, `Door`, `Player`
- `PreloadScene` + `TestScene` that loads a level and renders sprites
  at their correct tile positions

Verified by parsing all 64 level XMLs through the loader without errors,
plus a spot-check of `block_intro.xml` against hand-extracted values.

## Running

```bash
npm install
npm run dev
```

Open http://localhost:3000. Default level is `block_intro.xml`.

Keyboard shortcuts in `TestScene`:
- `1` — tutorial_movement
- `2` — tutorial_vertical
- `3` — tutorial_horizontal
- `4` — block_intro
- `5` — switch_intro
- `6` — hard_spider

Magenta rectangles with text labels mark missing textures.

## What comes next

- **Session 2** — Matter.js integration, player movement, ground sensing
- **Session 3** — Reflection mechanic (horizontal/vertical/diagonal)
- **Session 4** — Block grab, switches, doors/keys, win/lose
- **Session 5** — Menus, level select, audio
- **Session 6** — Achievements, save state, polish
- **Session 7+** — Bug hunt, fidelity pass across all 53 levels

## Project structure

```
public/
  levels/      64 level XMLs (verbatim from original)
  images/      Sprites organized as in original Content folder
  audio/       MP3 music and SFX (usable directly in browser)
src/
  main.js                  Phaser game config + boot
  loader/
    textureRegistry.js     logical name -> file path (port of texture_files[])
    audioRegistry.js       logical name -> file path (port of music_files[])
    levelList.js           ordered level list (port of level_files[])
    levelLoader.js         XML -> game objects (port of LevelCreator.cs)
  objects/
    Level.js               top-level container (port of Level.cs API)
    ReflectableObject.js   base class for grid-bound objects
    ReflectableAndOrientable.js  base for direction-facing objects
    Wall.js, Block.js, Spike.js, Switch.js, Key.js, Door.js, Player.js
    index.js               barrel that triggers registerClass side effects
  scenes/
    PreloadScene.js        loads every texture in the registry
    TestScene.js           Session 1 deliverable - static level render
  util/
    coords.js              tile/meters/pixel conversion (LevelDims)
```

## Notes from the porting work

- Level XMLs are UTF-8 with a BOM. The loader strips it; browser DOMParser
  tolerates BOMs but strict XML libraries do not.
- `<HLine>/<VLine>/<DLine>` inside `<Switch>` are switch-local lines activated
  on press; `<HRLine>/<VRLine>/<DLine>` inside `<Level>` are globally active.
  They dispatch to different methods (`Switch.addHLine` vs `Level.addHRLine`).
- `Level.continuousToDiscrete` in the original has a row/col swap that's
  invisible because all shipped levels are square. Preserved as-is and
  documented in `coords.js`.
- Original used C# reflection for XML parsing; we emulate with a class
  registry + `set<X>` / `add<X>` / `<x>` method fallback. Tag names like
  `<SetReflectedHorizontal>` work naturally in that scheme.
