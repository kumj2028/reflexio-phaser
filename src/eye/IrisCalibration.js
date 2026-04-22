/**
 * Least-squares affine mapping from iris (video) coords to screen coords.
 *
 * We solve:  screenX = ax*irisX + bx*irisY + cx
 *            screenY = ay*irisX + by*irisY + cy
 *
 * Given N calibration samples {irisX, irisY, screenX, screenY}, the normal
 * equations give the best-fit coefficients.
 */
export class IrisCalibration {
  constructor() {
    this._samples = []; // [{ix, iy, sx, sy}]
    this._coeffX  = null; // [ax, bx, cx]
    this._coeffY  = null; // [ay, by, cy]
  }

  addSample(irisX, irisY, screenX, screenY) {
    this._samples.push({ ix: irisX, iy: irisY, sx: screenX, sy: screenY });
    if (this._samples.length >= 3) this._fit();
  }

  _fit() {
    const n = this._samples.length;
    // Build X matrix (n×3): [ix, iy, 1] per row
    // Normal equations: (X'X) coeff = X'y
    let s00=0, s10=0, s20=0, s11=0, s21=0, s22=n;
    let rx=0, ry=0, sx_=0, sy_=0, s1x=0, s1y=0;
    for (const p of this._samples) {
      s00 += p.ix*p.ix; s10 += p.ix*p.iy; s20 += p.ix;
      s11 += p.iy*p.iy; s21 += p.iy;
      rx  += p.ix*p.sx; ry  += p.ix*p.sy;
      sx_ += p.iy*p.sx; sy_ += p.iy*p.sy;
      s1x += p.sx;      s1y += p.sy;
    }
    // 3×3 symmetric matrix A = [[s00,s10,s20],[s10,s11,s21],[s20,s21,s22]]
    // Solve Ac = b for x and y separately.
    const A = [[s00,s10,s20],[s10,s11,s21],[s20,s21,s22]];
    this._coeffX = solveLinear3(A, [rx, sx_, s1x]);
    this._coeffY = solveLinear3(A, [ry, sy_, s1y]);
  }

  isReady() { return this._coeffX !== null; }

  map(irisX, irisY) {
    if (!this.isReady()) return null;
    const [ax,bx,cx] = this._coeffX;
    const [ay,by,cy] = this._coeffY;
    return {
      x: ax*irisX + bx*irisY + cx,
      y: ay*irisX + by*irisY + cy,
    };
  }
}

// Gaussian elimination for a 3×3 system Ax = b.
function solveLinear3(A, b) {
  // Copy to avoid mutating caller's data.
  const M = A.map(r => [...r]);
  const v = [...b];
  for (let col = 0; col < 3; col++) {
    // Pivot
    let maxRow = col;
    for (let r = col+1; r < 3; r++) if (Math.abs(M[r][col]) > Math.abs(M[maxRow][col])) maxRow = r;
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    [v[col], v[maxRow]] = [v[maxRow], v[col]];
    if (Math.abs(M[col][col]) < 1e-12) continue;
    for (let r = col+1; r < 3; r++) {
      const f = M[r][col] / M[col][col];
      for (let c = col; c < 3; c++) M[r][c] -= f * M[col][c];
      v[r] -= f * v[col];
    }
  }
  const x = [0,0,0];
  for (let r = 2; r >= 0; r--) {
    x[r] = v[r];
    for (let c = r+1; c < 3; c++) x[r] -= M[r][c] * x[c];
    x[r] /= M[r][r];
  }
  return x;
}
