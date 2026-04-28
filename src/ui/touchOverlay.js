/**
 * Shared DOM touch overlay for Reflexio scenes.
 * Uses Pointer Events (works for both touch and mouse).
 *
 * createTouchOverlay(canvas, mode, callbacks) → { el, state, eyeBtn, destroy }
 *
 * Always-present buttons (same layout in all modes):
 *   - Eye toggle + Calibrate  top-right, side by side, right-offset by callbacks.topRightOffset
 *   - Menu                    below left D-pad
 *
 * mode 'game':
 *   - Left D-pad (4-way): held booleans state.left/right/up/down
 *   - Right D-pad (8-way): calls callbacks.onReflectLine(dir) on direction change
 *   - A button: one-shot state.reflect flag
 *   - B button: one-shot state.grab flag
 *
 * mode 'menu':
 *   - Left D-pad (4-way): calls callbacks.onUp/onDown once per direction change
 *   - Right D-pad (up/down sectors): also calls callbacks.onUp/onDown
 *   - A button: calls callbacks.onConfirm()
 *   - B button: calls callbacks.onBack()
 *
 * syncEyeBtn(el, isOn): update the eye toggle button appearance after an external toggle.
 */

const DPAD    = 140;
const BTN     = 72;
const GAP     = 10;
const BTN_GAP = 25; // gap between each D-pad bottom and its associated buttons

export function createTouchOverlay(canvas, mode, callbacks = {}) {
  const rect = canvas.getBoundingClientRect();
  const vpW  = window.innerWidth;
  const vpH  = window.innerHeight;

  const leftCX        = rect.left / 2;
  const rightCX       = rect.right + (vpW - rect.right) / 2;
  const midY          = vpH / 2;
  const topRightOffset = callbacks.topRightOffset ?? 8;

  const state = {
    left: false, right: false, up: false, down: false,
    reflect: false, grab: false,
  };

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5000;';
  document.body.appendChild(wrap);

  // ---- Eye toggle + Calibrate — top-right, side by side ----
  const eyeOn = callbacks.initialEyeOn ?? false;
  const eyeBtn = _makeSmallBtn(
    eyeOn ? 'EYE: ON' : 'EYE: OFF',
    eyeOn ? 'rgba(30,160,80,0.85)' : 'rgba(50,50,50,0.85)',
    (el) => { if (callbacks.onToggleEye) callbacks.onToggleEye(el); }
  );
  eyeBtn.style.pointerEvents = 'auto';

  const calBtn = _makeSmallBtn('CALIBRATE', 'rgba(40,40,100,0.85)',
    (el) => { if (callbacks.onCalibrate) callbacks.onCalibrate(el); }
  );
  calBtn.style.pointerEvents = 'auto';

  // Flex row container holds both buttons; right edge anchored next to saccade display
  const topRow = document.createElement('div');
  topRow.style.cssText = [
    'position:fixed', `top:8px`, `right:${topRightOffset}px`,
    'display:flex', 'flex-direction:row', 'gap:6px', 'align-items:center',
    'pointer-events:none',
  ].join(';');
  topRow.appendChild(eyeBtn);
  topRow.appendChild(calBtn);
  wrap.appendChild(topRow);

  // ---- Left D-pad (4-way) — vertically centered in left space ----
  const dpadTop = midY - DPAD / 2;
  const leftCb  = (dir, on) => {
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
  _placeFixed(leftDpad, leftCX - DPAD / 2, dpadTop, null, null);
  wrap.appendChild(leftDpad);

  // ---- Menu button — below left D-pad ----
  const menuBtn = _makeMedBtn('MENU', 'rgba(70,30,90,0.85)',
    () => { if (callbacks.onMenu) callbacks.onMenu(); }
  );
  _placeFixed(menuBtn, leftCX - 44, dpadTop + DPAD + BTN_GAP, null, null);
  wrap.appendChild(menuBtn);

  // ---- Right D-pad + A/B — same physical layout in all modes ----
  const totalH = DPAD + BTN_GAP + BTN;
  const rTop   = midY - totalH / 2;

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
  _placeFixed(rightDpad, rightCX - DPAD / 2, rTop, null, null);
  wrap.appendChild(rightDpad);

  const btnsTop = rTop + DPAD + BTN_GAP;
  const aBtn = _makeBtn('A', '#336acc', () => {
    if (mode === 'game') { state.reflect = true; }
    else if (callbacks.onConfirm) callbacks.onConfirm();
  });
  _placeFixed(aBtn, rightCX - BTN - GAP / 2, btnsTop, null, null);
  wrap.appendChild(aBtn);

  const bBtn = _makeBtn('B', '#cc3333', () => {
    if (mode === 'game') { state.grab = true; }
    else if (callbacks.onBack) callbacks.onBack();
  });
  _placeFixed(bBtn, rightCX + GAP / 2, btnsTop, null, null);
  wrap.appendChild(bBtn);

  return { el: wrap, state, eyeBtn, destroy: () => wrap.remove() };
}

/** Update the eye toggle button label and color to match the given state. */
export function syncEyeBtn(el, isOn) {
  if (!el) return;
  el.textContent      = isOn ? 'EYE: ON' : 'EYE: OFF';
  el.style.background = isOn ? 'rgba(30,160,80,0.85)' : 'rgba(50,50,50,0.85)';
}

// ---- helpers ----------------------------------------------------------------

function _placeFixed(el, left, top, right, bottom) {
  el.style.position      = 'fixed';
  el.style.pointerEvents = 'auto';
  if (left   !== null) el.style.left   = `${Math.round(left)}px`;
  if (top    !== null) el.style.top    = `${Math.round(top)}px`;
  if (right  !== null) el.style.right  = `${Math.round(right)}px`;
  if (bottom !== null) el.style.bottom = `${Math.round(bottom)}px`;
}

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

// Medium-sized pill button (for MENU label)
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
