const KEY = 'reflexio_eye_tracking';

class EyeTrackingState {
  isEnabled()        { return localStorage.getItem(KEY) === 'true'; }
  setEnabled(v)      { localStorage.setItem(KEY, String(Boolean(v))); }
  toggle()           { this.setEnabled(!this.isEnabled()); return this.isEnabled(); }
}

export const eyeTracking = new EyeTrackingState();
