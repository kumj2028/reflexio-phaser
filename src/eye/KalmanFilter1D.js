/**
 * Discrete Kalman filter for a 1-D signal with a constant-velocity motion model.
 *
 * State: [position, velocity]
 * Transition: x_{k+1} = x_k + v_k,  v_{k+1} = v_k  (one frame = one step)
 * Observation: z_k = x_k + noise
 *
 * Tuning knobs:
 *   R      – measurement noise variance (px²). Higher → smoother but more lag.
 *   Q_pos  – process noise for position (px²/frame). Higher → trusts measurements more.
 *   Q_vel  – process noise for velocity (px²/frame²). Controls how quickly the
 *             filter lets estimated velocity change.
 */
export class KalmanFilter1D {
  constructor({ R = 1500, Q_pos = 1, Q_vel = 10 } = {}) {
    this.R     = R;
    this.Q_pos = Q_pos;
    this.Q_vel = Q_vel;

    this._x = 0;                       // position estimate
    this._v = 0;                       // velocity estimate
    this._P = [[1000, 0], [0, 100]];   // error covariance
    this._init = false;
  }

  update(z) {
    if (!this._init) {
      this._x    = z;
      this._init = true;
      return z;
    }

    // --- Predict ---
    const x_p = this._x + this._v;
    const v_p = this._v;

    // F*P*F^T + Q  where F = [[1,1],[0,1]]
    const [[p00, p01], [p10, p11]] = this._P;
    const pp00 = p00 + p01 + p10 + p11 + this.Q_pos;
    const pp01 = p01 + p11;
    const pp10 = p10 + p11;
    const pp11 = p11 + this.Q_vel;

    // --- Update ---
    const S  = pp00 + this.R;   // innovation variance
    const K0 = pp00 / S;        // Kalman gain for position
    const K1 = pp10 / S;        // Kalman gain for velocity
    const inn = z - x_p;        // innovation

    this._x = x_p + K0 * inn;
    this._v = v_p + K1 * inn;

    // (I - K*H) * P_pred
    this._P = [
      [(1 - K0) * pp00, (1 - K0) * pp01],
      [pp10 - K1 * pp00, pp11 - K1 * pp01],
    ];

    return this._x;
  }

  get value() { return this._x; }

  reset() { this._init = false; this._x = 0; this._v = 0; this._P = [[1000,0],[0,100]]; }
}
