/**
 * Full-screen DOM calibration overlay for WebGazer.
 * Shows 9 dots; user clicks each dot CLICKS_NEEDED times while looking at it.
 * Multiple clicks per dot give the ridge regression more training samples per
 * screen region, significantly improving fit quality.
 * Returns a Promise resolving when all dots are fully clicked.
 */
const CLICKS_NEEDED = 5;

export function runCalibration() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed','top:0','left:0','width:100%','height:100%',
      'background:rgba(0,0,0,0.88)','z-index:10000','cursor:crosshair',
      'font-family:monospace',
    ].join(';');

    const msg = document.createElement('div');
    msg.style.cssText = [
      'position:absolute','top:50%','left:50%',
      'transform:translate(-50%,-50%)',
      'color:#eee','font-size:15px','text-align:center',
      'pointer-events:none','line-height:1.8',
    ].join(';');
    msg.innerHTML =
      'Eye tracking calibration<br>' +
      `Look at each dot and <b>click it ${CLICKS_NEEDED} times</b>.<br>` +
      'The ring fills as you click. Green = done.';
    overlay.appendChild(msg);

    const COLS = [0.15, 0.50, 0.85];
    const ROWS = [0.15, 0.50, 0.85];
    let remaining = COLS.length * ROWS.length;

    for (const rowFrac of ROWS) {
      for (const colFrac of COLS) {
        let clicks = 0;

        // Outer ring shows progress, inner dot is the click target.
        const wrap = document.createElement('div');
        wrap.style.cssText = [
          'position:absolute',
          `left:${colFrac * 100}%`,
          `top:${rowFrac * 100}%`,
          'transform:translate(-50%,-50%)',
          'width:40px','height:40px',
          'cursor:pointer',
        ].join(';');

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '40');
        svg.setAttribute('height', '40');
        svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';

        const CIRC = 2 * Math.PI * 16; // circumference of r=16 circle
        const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        track.setAttribute('cx', '20'); track.setAttribute('cy', '20'); track.setAttribute('r', '16');
        track.setAttribute('fill', 'none');
        track.setAttribute('stroke', '#444');
        track.setAttribute('stroke-width', '3');

        const arc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        arc.setAttribute('cx', '20'); arc.setAttribute('cy', '20'); arc.setAttribute('r', '16');
        arc.setAttribute('fill', 'none');
        arc.setAttribute('stroke', '#ff4444');
        arc.setAttribute('stroke-width', '3');
        arc.setAttribute('stroke-dasharray', `0 ${CIRC}`);
        arc.setAttribute('stroke-linecap', 'round');
        arc.setAttribute('transform', 'rotate(-90 20 20)');

        svg.appendChild(track);
        svg.appendChild(arc);

        const dot = document.createElement('div');
        dot.style.cssText = [
          'position:absolute','top:50%','left:50%',
          'transform:translate(-50%,-50%)',
          'width:12px','height:12px','border-radius:50%',
          'background:#ff4444',
          'transition:background 0.15s, transform 0.1s',
        ].join(';');

        wrap.appendChild(svg);
        wrap.appendChild(dot);

        wrap.addEventListener('click', () => {
          clicks++;
          const pct = clicks / CLICKS_NEEDED;
          arc.setAttribute('stroke-dasharray', `${pct * CIRC} ${CIRC}`);
          const hue = Math.round(pct * 120);
          arc.setAttribute('stroke', `hsl(${hue},100%,50%)`);
          dot.style.background = `hsl(${hue},100%,50%)`;

          if (clicks >= CLICKS_NEEDED) {
            wrap.style.pointerEvents = 'none';
            remaining--;
            if (remaining === 0) {
              msg.innerHTML = '<span style="color:#44ff88">Calibration complete!</span>';
              setTimeout(() => { overlay.remove(); resolve(); }, 700);
            }
          }
        });

        overlay.appendChild(wrap);
      }
    }

    document.body.appendChild(overlay);
  });
}
