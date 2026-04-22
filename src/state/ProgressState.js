const KEY = 'reflexio_v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); }
  catch { /* storage unavailable */ }
}

const _data = load();
const completed = new Set(_data.completed || []);
let currentLevel = _data.currentLevel ?? 0;

function persist() {
  save({ completed: [...completed], currentLevel });
}

export const progress = {
  markCompleted(idx) {
    if (idx < 0) return;
    completed.add(idx);
    if (idx + 1 > currentLevel) currentLevel = idx + 1;
    persist();
  },
  isCompleted(idx) { return completed.has(idx); },
  isWorldUnlocked(worldNum) {
    if (worldNum <= 1) return true;
    const start = (worldNum - 2) * 8;
    let n = 0;
    for (let i = start; i < start + 8; i++) if (completed.has(i)) n++;
    return n >= 6;
  },
  hasProgress() { return completed.size > 0; },
  getStartingLevel() { return Math.min(currentLevel, 50); },
  reset() { completed.clear(); currentLevel = 0; persist(); }
};
