import { runCalibration } from './CalibrationOverlay.js';
import { KalmanFilter1D } from './KalmanFilter1D.js';

const WEBGAZER_CDN = 'https://cdn.jsdelivr.net/npm/webgazer@2.1.0/dist/webgazer.js';

const MAX_JUMP_PX    = 300;
const BLINK_MIN_CBS  = 2;   // min consecutive null callbacks to count as blink onset
const BLINK_MAX_CBS  = 18;  // max null callbacks before treated as tracking loss (not blink)

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
    this._gaze         = null;
    this._kx           = new KalmanFilter1D();
    this._ky           = new KalmanFilter1D();
    this._active       = false;
    this._nullCount    = 0;   // consecutive null callbacks from WebGazer
    this._blinkPending = false; // set true when a valid blink completes
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
          if (!data) {
            this._nullCount++;
            return;
          }

          // Gaze returned after a null run — check if it was a blink.
          if (this._nullCount >= BLINK_MIN_CBS && this._nullCount <= BLINK_MAX_CBS) {
            this._blinkPending = true;
          }
          this._nullCount = 0;

          // Outlier rejection.
          if (this._gaze) {
            const dist = Math.hypot(data.x - this._gaze.x, data.y - this._gaze.y);
            if (dist > MAX_JUMP_PX) return;
          }

          this._gaze = { x: this._kx.update(data.x), y: this._ky.update(data.y) };
        })
        .begin();
    } catch (e) {
      console.warn('EyeTracker: webgazer.begin() failed', e);
      return;
    }

    window.webgazer.showPredictionPoints(true);
    window.webgazer.showVideoPreview(true);
    const container = document.getElementById('webgazerVideoContainer');
    if (container) {
      container.style.cssText += ';position:fixed;top:4px;right:4px;width:160px;height:120px;opacity:0.85;z-index:9999;pointer-events:none;';
    }

    this._active = true;
    window.webgazer.showPredictionPoints(true);
  }

  async calibrate(points) {
    if (!this._active) return;
    try { window.webgazer.clearData(); } catch { /* ignore */ }
    this._kx.reset();
    this._ky.reset();
    this._gaze = null;
    await runCalibration(points);
    window.webgazer.showPredictionPoints(true);
  }

  stop() {
    if (!this._active) return;
    try { window.webgazer.end(); } catch { /* ignore */ }
    for (const id of ['webgazerVideoContainer', 'webgazerFaceOverlay',
                      'webgazerFaceFeedbackBox', 'webgazerGazeDot']) {
      document.getElementById(id)?.remove();
    }
    this._active       = false;
    this._gaze         = null;
    this._nullCount    = 0;
    this._blinkPending = false;
    this._kx.reset();
    this._ky.reset();
  }

  trainAtCurrentGaze(screenX, screenY) {
    if (!this._active || !window.webgazer) return;
    try {
      window.webgazer.recordScreenPosition(screenX, screenY, 'click');
    } catch { /* ignore */ }
  }

  // Returns true once per blink event and resets the flag.
  consumeBlink() {
    if (this._blinkPending) { this._blinkPending = false; return true; }
    return false;
  }

  getGaze()    { return this._gaze; }
  get active() { return this._active; }
}
