# Reflexio (Phaser port)

A port of Reflexio (originally XNA/FNA + Farseer Physics) to Phaser 3 + Matter.js,
built in incremental sessions. Added additional eye tracking input for picking reflection lines that is optional (to try hit T in a level).

## Running

```bash
npm install
npm run dev
```

Open http://localhost:3000 or whatever url the terminal provides

## Project structure

```
public/
  levels/      64 level XMLs (verbatim from original)
  images/      Sprites organized as in original Content folder
  audio/       MP3 music and SFX (usable directly in browser)
src/
  main.js                  Phaser game config + boot
  loader/                  Loading levels, images, music, etc.
  objects/                 Various game objects
  scenes/                  Rendering scenes in the game                
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
