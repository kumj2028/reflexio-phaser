/**
 * Shared DOM touch overlay for Reflexio scenes.
 * Uses Pointer Events (works for both touch and mouse).
 * All positions expressed in viewport units / CSS calc() — no getBoundingClientRect().
 *
 * Canvas is 800×700 with Phaser Scale.FIT + CENTER_BOTH.
 * In landscape (screen wider than 800:700 ratio):
 *   canvas is height-limited → canvas_width = 100vh * 800/700
 *   side margin = max(0, 50vw - 400vh/7)
 *   left-space-center  (--lcx) = max(0px, 25vw - 200vh/7)
 *   right-space-center (--rcx) = min(100vw, 75vw + 200vh/7)
 *
 * createTouchOverlay(canvas, mode, callbacks) → { el, state, eyeBtn, destroy }
 * syncEyeBtn(el, isOn): update eye toggle appearance.
 */

const DPAD    = 140;   // D-pad square size (px)
const BTN     = 72;    // A/B button diameter (px)
const GAP     = 10;    // gap between A and B
const BTN_GAP = 25;    // gap between D-pad bottom edge and its associated buttons

// Vertical layout constants (offsets from 50vh)
const DPAD_HALF = DPAD / 2;                               // 70
const R_TOP_OFF = -((DPAD + BTN_GAP + BTN) / 2);         // -118.5
const AB_TOP_OFF = R_TOP_OFF + DPAD + BTN_GAP;            // 46.5
const MENU_TOP_OFF = DPAD_HALF + BTN_GAP;                 // 95

export function createTouchOverlay(canvas, mode, callbacks = {}) {
  const topRightOffset = callbacks.topRightOffset ?? 8;

  const state = {
    left: false, right: false, up: false, down: false,
    reflect: false, grab: false,
  };

  // --lcx / --rcx are the horizontal centres of the left and right side spaces.
  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
    'pointer-events:none', 'z-index:5000',
    '--lcx:max(0px,calc(25vw - 200vh/7))',
    '--rcx:min(100vw,calc(75vw + 200vh/7))',
  ].join(';');
  document.body.appendChild(wrap);

  // ---- Eye toggle + Calibrate — top-right, desktop only ----
  const isMobileBrowser = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  let eyeBtn = null;

  if (!isMobileBrowser) {
    const eyeOn = callbacks.initialEyeOn ?? false;
    eyeBtn = _makeSmallBtn(
      eyeOn ? 'EYE: ON' : 'EYE: OFF',
      eyeOn ? 'rgba(30,160,80,0.85)' : 'rgba(50,50,50,0.85)',
      (el) => { if (callbacks.onToggleEye) callbacks.onToggleEye(el); }
    );
    eyeBtn.style.pointerEvents = 'auto';

    const calBtn = _makeSmallBtn('CALIBRATE', 'rgba(40,40,100,0.85)',
      (el) => { if (callbacks.onCalibrate) callbacks.onCalibrate(el); }
    );
    calBtn.style.pointerEvents = 'auto';

    const topRow = document.createElement('div');
    topRow.style.cssText = [
      'position:fixed', 'top:8px', `right:${topRightOffset}px`,
      'display:flex', 'flex-direction:row', 'gap:6px', 'align-items:center',
      'pointer-events:none',
    ].join(';');
    topRow.appendChild(eyeBtn);
    topRow.appendChild(calBtn);
    wrap.appendChild(topRow);
  }

  // ---- Left D-pad — centred in left side space, vertically centred ----
  const leftCb = (dir, on) => {
    if (mode === 'game') {
      if (dir === 'l') state.left  = on;
      if (dir === 'r') state.right = on;
      if (dir === 'u') state.up    = on;
      if (dir === 'd') state.down  = on;
    } else {
      if (!on) return;
      if (dir === 'u' && callbacks.onUp)   callbacks.onUp();
      if (dir === 'd' && callbacks.onDown) callbacks.onDown();
    }
  };
  const leftDpad = _makeDpad(DPAD, false, leftCb);
  leftDpad.style.cssText += `;position:fixed;left:calc(var(--lcx) - ${DPAD_HALF}px);top:calc(50vh - ${DPAD_HALF}px);pointer-events:auto;`;
  wrap.appendChild(leftDpad);

  // ---- Menu button — centred below left D-pad ----
  const menuBtn = _makeMedBtn('MENU', 'rgba(70,30,90,0.85)',
    () => { if (callbacks.onMenu) callbacks.onMenu(); }
  );
  menuBtn.style.cssText += `;position:fixed;left:var(--lcx);top:calc(50vh + ${MENU_TOP_OFF}px);transform:translateX(-50%);pointer-events:auto;`;
  wrap.appendChild(menuBtn);

  // ---- Right D-pad + A/B — same layout in all modes ----
  const RDIR = {
    u:'up', d:'down', l:'left', r:'right',
    ul:'diagonal', ur:'diagonal', dl:'diagonal', dr:'diagonal',
  };
  let lastRDir = null;
  const rightDpad = _makeDpad(DPAD, true, (dir, on) => {
    if (mode === 'game') {
      if (!on) { lastRDir = null; return; }
      if (dir === lastRDir) return;
      lastRDir = dir;
      const move = RDIR[dir];
      if (move && callbacks.onReflectLine) callbacks.onReflectLine(move);
    } else {
      if (!on) { lastRDir = null; return; }
      if (dir === lastRDir) return;
      lastRDir = dir;
      if ((dir === 'u' || dir === 'ul' || dir === 'ur') && callbacks.onUp)   callbacks.onUp();
      if ((dir === 'd' || dir === 'dl' || dir === 'dr') && callbacks.onDown) callbacks.onDown();
    }
  });
  rightDpad.style.cssText += `;position:fixed;left:calc(var(--rcx) - ${DPAD_HALF}px);top:calc(50vh + ${R_TOP_OFF}px);pointer-events:auto;`;
  wrap.appendChild(rightDpad);

  // A and B side by side below right D-pad
  const aBtn = _makeBtn('A', '#336acc', () => {
    if (mode === 'game') { state.reflect = true; }
    else if (callbacks.onConfirm) callbacks.onConfirm();
  });
  aBtn.style.cssText += `;position:fixed;left:calc(var(--rcx) - ${BTN + GAP / 2}px);top:calc(50vh + ${AB_TOP_OFF}px);pointer-events:auto;`;
  wrap.appendChild(aBtn);

  const bBtn = _makeBtn('B', '#cc3333', () => {
    if (mode === 'game') { state.grab = true; }
    else if (callbacks.onBack) callbacks.onBack();
  });
  bBtn.style.cssText += `;position:fixed;left:calc(var(--rcx) + ${GAP / 2}px);top:calc(50vh + ${AB_TOP_OFF}px);pointer-events:auto;`;
  wrap.appendChild(bBtn);

  return { el: wrap, state, eyeBtn, destroy: () => wrap.remove() };
}

export function syncEyeBtn(el, isOn) {
  if (!el) return;
  el.textContent      = isOn ? 'EYE: ON' : 'EYE: OFF';
  el.style.background = isOn ? 'rgba(30,160,80,0.85)' : 'rgba(50,50,50,0.85)';
}

// ---- helpers ----------------------------------------------------------------

function _makeDpad(size, eightWay, cb) {
  const el = document.createElement('div');
  el.style.cssText = `width:${size}px;height:${size}px;position:relative;touch-action:none;user-select:none;-webkit-user-select:none;`;

  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  cv.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
  el.appendChild(cv);
  _drawDpad(cv.getContext('2d'), size);

  const DEAD = size * 0.14;
  const getDir = (dx, dy) => {
    if (Math.hypot(dx, dy) < DEAD) return null;
    if (!eightWay) return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u');
    const a = Math.atan2(dy, dx) * 180 / Math.PI;
    if (a > -22.5  && a <=  22.5)  return 'r';
    if (a >  22.5  && a <=  67.5)  return 'dr';
    if (a >  67.5  && a <= 112.5)  return 'd';
    if (a > 112.5  && a <= 157.5)  return 'dl';
    if (a >  157.5 || a <= -157.5) return 'l';
    if (a > -157.5 && a <= -112.5) return 'ul';
    if (a > -112.5 && a <=  -67.5) return 'u';
    return 'ur';
  };

  let activeDir = null;
  let capturedId = null;

  const onDown = (e) => {
    e.preventDefault();
    if (capturedId !== null) return;
    capturedId = e.pointerId;
    el.setPointerCapture(e.pointerId);
    const r   = el.getBoundingClientRect();
    const dir = getDir(e.clientX - (r.left + size / 2), e.clientY - (r.top + size / 2));
    if (dir !== activeDir) {
      if (activeDir !== null) cb(activeDir, false);
      activeDir = dir;
      if (activeDir !== null) cb(activeDir, true);
    }
  };
  const onMove = (e) => {
    if (e.pointerId !== capturedId) return;
    e.preventDefault();
    const r   = el.getBoundingClientRect();
    const dir = getDir(e.clientX - (r.left + size / 2), e.clientY - (r.top + size / 2));
    if (dir !== activeDir) {
      if (activeDir !== null) cb(activeDir, false);
      activeDir = dir;
      if (activeDir !== null) cb(activeDir, true);
    }
  };
  const onUp = (e) => {
    if (e.pointerId !== capturedId) return;
    e.preventDefault();
    capturedId = null;
    if (activeDir !== null) { cb(activeDir, false); activeDir = null; }
  };

  el.addEventListener('pointerdown',   onDown, { passive: false });
  el.addEventListener('pointermove',   onMove, { passive: false });
  el.addEventListener('pointerup',     onUp,   { passive: false });
  el.addEventListener('pointercancel', onUp,   { passive: false });

  return el;
}

function _makeBtn(label, color, cb) {
  const el = document.createElement('div');
  el.style.cssText = [
    `width:${BTN}px`, `height:${BTN}px`, 'border-radius:50%',
    `background:${color}`, 'border:2px solid rgba(255,255,255,0.5)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'color:#fff', 'font-family:monospace', 'font-size:22px', 'font-weight:bold',
    'user-select:none', '-webkit-user-select:none', 'opacity:0.72',
    'touch-action:none', 'cursor:pointer',
  ].join(';');
  el.textContent = label;
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.style.opacity = '1'; cb(); }, { passive: false });
  el.addEventListener('pointerup',     (e) => { e.preventDefault(); el.style.opacity = '0.72'; }, { passive: false });
  el.addEventListener('pointercancel', (e) => { e.preventDefault(); el.style.opacity = '0.72'; }, { passive: false });
  return el;
}

function _makeMedBtn(label, bgColor, cb) {
  const el = document.createElement('div');
  el.style.cssText = [
    'display:inline-flex', 'align-items:center', 'justify-content:center',
    'padding:10px 20px', 'border-radius:8px',
    `background:${bgColor}`,
    'border:2px solid rgba(255,255,255,0.4)',
    'color:#fff', 'font-family:monospace', 'font-size:16px', 'font-weight:bold',
    'user-select:none', '-webkit-user-select:none',
    'opacity:0.82', 'touch-action:none', 'cursor:pointer', 'white-space:nowrap',
  ].join(';');
  el.textContent = label;
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.style.opacity = '1'; cb(); }, { passive: false });
  el.addEventListener('pointerup',     (e) => { e.preventDefault(); el.style.opacity = '0.82'; }, { passive: false });
  el.addEventListener('pointercancel', (e) => { e.preventDefault(); el.style.opacity = '0.82'; }, { passive: false });
  return el;
}

function _makeSmallBtn(label, bgColor, cb) {
  const el = document.createElement('div');
  el.style.cssText = [
    'display:inline-flex', 'align-items:center', 'justify-content:center',
    'padding:6px 10px', 'border-radius:6px',
    `background:${bgColor}`,
    'border:1.5px solid rgba(255,255,255,0.35)',
    'color:#fff', 'font-family:monospace', 'font-size:12px', 'font-weight:bold',
    'user-select:none', '-webkit-user-select:none',
    'opacity:0.82', 'touch-action:none', 'cursor:pointer', 'white-space:nowrap',
  ].join(';');
  el.textContent = label;
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.style.opacity = '1'; cb(el); }, { passive: false });
  el.addEventListener('pointerup',     (e) => { e.preventDefault(); el.style.opacity = '0.82'; }, { passive: false });
  el.addEventListener('pointercancel', (e) => { e.preventDefault(); el.style.opacity = '0.82'; }, { passive: false });
  return el;
}

function _drawDpad(ctx, size) {
  const cx = size / 2, cy = size / 2;
  const arm = size * 0.27, ext = size * 0.46;

  ctx.fillStyle   = 'rgba(200,200,200,0.15)';
  ctx.strokeStyle = 'rgba(255,255,255,0.30)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - arm, cy - ext); ctx.lineTo(cx + arm, cy - ext);
  ctx.lineTo(cx + arm, cy - arm); ctx.lineTo(cx + ext, cy - arm);
  ctx.lineTo(cx + ext, cy + arm); ctx.lineTo(cx + arm, cy + arm);
  ctx.lineTo(cx + arm, cy + ext); ctx.lineTo(cx - arm, cy + ext);
  ctx.lineTo(cx - arm, cy + arm); ctx.lineTo(cx - ext, cy + arm);
  ctx.lineTo(cx - ext, cy - arm); ctx.lineTo(cx - arm, cy - arm);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const A = 6, OFF = ext - 12;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  const tri = (ax, ay, bx, by, cx2, cy2) => {
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx2, cy2); ctx.closePath(); ctx.fill();
  };
  tri(cx,     cy-OFF, cx-A, cy-OFF+A*1.5, cx+A, cy-OFF+A*1.5);
  tri(cx,     cy+OFF, cx-A, cy+OFF-A*1.5, cx+A, cy+OFF-A*1.5);
  tri(cx-OFF, cy,     cx-OFF+A*1.5, cy-A, cx-OFF+A*1.5, cy+A);
  tri(cx+OFF, cy,     cx+OFF-A*1.5, cy-A, cx+OFF-A*1.5, cy+A);
}
