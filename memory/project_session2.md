---
name: Session 2 physics implementation
description: Key decisions made in Session 2 (Matter.js physics + player movement)
type: project
---

Session 2 added Matter.js physics to GameScene.js. PreloadScene now starts GameScene (not TestScene). TestScene remains for reference.

**Physics calibration:** Bodies in pixel-space (scale=50 px/m). Gravity uses `setGravity(x, y, 0.003)` so that `gravity.y=9.8` gives correct 9.8 m/s² (formula: gravity.y * gravity.scale * 16.667^2 = 8.17 px/frame).

**Movement:** Velocity-based (not force-based) to avoid Matter.js force unit complexity. MAXSPEED = 2.0*50/60 ≈ 1.667 px/frame. JUMP_SPEED = 9.74*50/60 ≈ 8.12 px/frame. DAMP = 0.80 per frame when idle.

**Density scaling:** Farseer density is kg/m². Matter density is kg/px². Scale: density_px = density_m / scale^2 = density_m / 2500.

**Player body:** Compound body (mainBody rectangle + sensor rectangle below feet). Sensor is separate Matter.js body part. Ground contact tracked via collisionstart/collisionend events on the sensor part. Sprite synced to mainBody.position each update.

**Wall/Block:** Static/dynamic Matter images via `matter.add.image`. Blocks have `setFixedRotation()` to prevent spinning.

**World bounds:** Invisible static rectangles around the play area prevent objects from falling out.

**Why:** Session 2 goal - walk/jump on block_intro.xml with walls/blocks as solid obstacles.
**How to apply:** Session 3 will add reflection mechanic. The level data objects (Wall, Block, etc.) have `.body` set to their Matter body after buildObject - this will be used for reflection transforms.
