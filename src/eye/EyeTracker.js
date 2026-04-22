import { runCalibration } from './CalibrationOverlay.js';

const WEBGAZER_CDN = 'https://cdn.jsdelivr.net/npm/webgazer@2.1.0/dist/webgazer.js';

// Smoothing: lower = smoother but more lag. 0.2 is a good balance for
// glasses users where raw signal is noisier.
const SMOOTH_ALPHA = 0.2;

// Outlier rejection: discard any reading that jumps more than this many px
// from the current smoothed position in a single frame. Single-frame spikes
// from blinks or tracking loss are almost always >300px jumps.
const MAX_JUMP_PX = 300;

function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src    = url;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.appendChild(s);
  });
}

export class EyeTracker {
  constructor() {
    this._gaze   = null;
    this._smooth = null;
    this._active = false;
  }

  async start() {
    if (this._active) return;
    try {
      await loadScript(WEBGAZER_CDN);
    } catch (e) {
      console.warn('EyeTracker: could not load WebGazer', e);
      return;
    }

    try {
      await window.webgazer
        .setRegression('ridge')
        .setGazeListener((data) => {
          if (!data) return;

          // Outlier rejection: ignore implausible jumps.
          if (this._smooth) {
            const dist = Math.hypot(data.x - this._smooth.x, data.y - this._smooth.y);
            if (dist > MAX_JUMP_PX) return;
          }

          if (!this._smooth) {
            this._smooth = { x: data.x, y: data.y };
          } else {
            this._smooth.x = SMOOTH_ALPHA * data.x + (1 - SMOOTH_ALPHA) * this._smooth.x;
            this._smooth.y = SMOOTH_ALPHA * data.y + (1 - SMOOTH_ALPHA) * this._smooth.y;
          }
          this._gaze = { x: this._smooth.x, y: this._smooth.y };
        })
        .begin();
    } catch (e) {
      console.warn('EyeTracker: webgazer.begin() failed', e);
      return;
    }

    // Show video preview so user can confirm face detection.
    window.webgazer.showPredictionPoints(true);
    window.webgazer.showVideoPreview(true);
    const container = document.getElementById('webgazerVideoContainer');
    if (container) {
      container.style.cssText += ';position:fixed;top:4px;right:4px;width:160px;height:120px;opacity:0.85;z-index:9999;pointer-events:none;';
    }

    this._active = true;
    window.webgazer.showPredictionPoints(false);
  }

  // Show calibration overlay and collect training samples.
  // Called explicitly by GameScene when on the keyboard_controls level.
  async calibrate() {
    if (!this._active) return;
    window.webgazer.showPredictionPoints(true);
    await runCalibration();
    window.webgazer.showPredictionPoints(false);
  }

  stop() {
    if (!this._active) return;
    // end() saves the current model to localStorage so next session skips calibration.
    try { window.webgazer.end(); } catch { /* ignore */ }
    for (const id of ['webgazerVideoContainer', 'webgazerFaceOverlay',
                      'webgazerFaceFeedbackBox', 'webgazerGazeDot']) {
      document.getElementById(id)?.remove();
    }
    this._active = false;
    this._gaze   = null;
    this._smooth = null;
  }

  // Called by GameScene when the user explicitly triggers a reflection action
  // (Space key) — we can use their current gaze position as an implicit
  // training sample since we know they were probably looking at the active
  // reflection indicator.
  trainAtCurrentGaze(screenX, screenY) {
    if (!this._active || !window.webgazer) return;
    try {
      window.webgazer.recordScreenPosition(screenX, screenY, 'click');
    } catch { /* ignore */ }
  }

getGaze() { return this._gaze; }

  get active() { return this._active; }
}
