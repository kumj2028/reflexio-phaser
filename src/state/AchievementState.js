import { progress } from './ProgressState.js';

export const ACHIEVEMENTS = [
  { id: 'n00b',         title: 'n00b',                   icon: 'ach_noob'         },
  { id: 'joey',         title: 'Still Just a Joey',       icon: 'ach_joey'         },
  { id: 'mirror',       title: 'Mirror Master',           icon: 'ach_mirror'       },
  { id: 'umbrella',     title: 'Umbrella Wizard',         icon: 'ach_umbrella'     },
  { id: 'master',       title: 'Master Reflect-er',       icon: 'ach_master'       },
  { id: 'bear',         title: 'What a Bear',             icon: 'ach_bear'         },
  { id: 'tunnel',       title: 'Carpal Tunnel',           icon: 'ach_tunnel'       },
  { id: 'endurance',    title: 'Endurance',               icon: 'ach_endurance'    },
  { id: 'stubbornness', title: 'Stubbornness',            icon: 'ach_stubbornness' },
  { id: 'eureka',       title: 'Eureka!',                 icon: 'ach_eureka'       },
  { id: 'failure',      title: 'Failure is an Option',    icon: 'ach_failure'      },
  { id: 'aplus',        title: 'A+',                      icon: 'ach_aplus'        },
  { id: 'speed',        title: 'Speed Run',               icon: 'ach_speed'        },
];

const LADDER_IDX     = 21;
const WAVE_IDX       = 23;
const THE_TEST_IDX   = 47;
const BEAR_IDX       = 50;
const LADDER_TIME_MS = 20000;
const ENDURANCE_MS   = 5 * 60 * 60 * 1000;
const TUNNEL_GOAL    = 1000;
const TOTAL_LEVELS   = 51;

const KEY = 'reflexio_ach_v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

const _d = load();
const _unlocked  = new Set(_d.unlocked  || []);
let _reflections = _d.reflections || 0;
let _playTimeMs  = _d.playTimeMs  || 0;
let _failFall    = _d.failFall    || false;
let _failSpike   = _d.failSpike   || false;
let _failSpikeC  = _d.failSpikeCollision || false;
let _failBlock   = _d.failBlock   || false;
let _failWall    = _d.failWall    || false;
let _consecFails = _d.consecFails || 0;

const _listeners = [];

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      unlocked: [..._unlocked],
      reflections: _reflections,
      playTimeMs:  _playTimeMs,
      failFall: _failFall, failSpike: _failSpike,
      failSpikeCollision: _failSpikeC,
      failBlock: _failBlock, failWall: _failWall,
      consecFails: _consecFails,
    }));
  } catch { /* storage unavailable */ }
}

function tryUnlock(id) {
  if (_unlocked.has(id)) return null;
  _unlocked.add(id);
  persist();
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  for (const cb of _listeners) cb(ach);
  return ach;
}

function checkFailure() {
  if (_failFall && _failSpike && _failSpikeC && _failBlock && _failWall)
    tryUnlock('failure');
}

export const achievements = {
  ACHIEVEMENTS,

  isUnlocked(id) { return _unlocked.has(id); },

  onUnlock(cb)       { _listeners.push(cb); },
  offUnlock(cb)      { const i = _listeners.indexOf(cb); if (i >= 0) _listeners.splice(i, 1); },

  incPlayTime(ms) {
    if (_unlocked.has('endurance')) return;
    _playTimeMs += ms;
    if (_playTimeMs >= ENDURANCE_MS) tryUnlock('endurance');
  },

  incReflectionCount() {
    _reflections++;
    if (!_unlocked.has('tunnel') && _reflections >= TUNNEL_GOAL) tryUnlock('tunnel');
  },

  deathByFall()           { _failFall  = true; persist(); checkFailure(); },
  deathBySpike()          { _failSpike = true; persist(); checkFailure(); },
  deathBySpikeCollision() { _failSpikeC = true; persist(); checkFailure(); },
  deathByBlock()          { _failBlock = true; persist(); checkFailure(); },
  deathByWall()           { _failWall  = true; persist(); checkFailure(); },

  incConsecutiveFails() {
    _consecFails++;
    persist();
    if (_consecFails >= 10) tryUnlock('stubbornness');
  },

  resetConsecutiveFails() {
    if (_consecFails === 0) return;
    _consecFails = 0;
    persist();
  },

  // levelReflections: reflections used in this specific level run (for Eureka)
  // blocksDestroyed:  blocks lost during this level run (for A+)
  completeLevel(levelIdx, levelReflections, blocksDestroyed) {
    if (levelIdx < 0) return;

    let count = 0;
    for (let i = 0; i < TOTAL_LEVELS; i++) if (progress.isCompleted(i)) count++;

    if (!_unlocked.has('n00b')) {
      let ok = true;
      for (let i = 0; i < 8; i++) if (!progress.isCompleted(i)) { ok = false; break; }
      if (ok) tryUnlock('n00b');
    }
    if (count >= 20) tryUnlock('joey');
    if (count >= 30) tryUnlock('mirror');
    if (count >= 40) tryUnlock('umbrella');
    if (!_unlocked.has('master')) {
      let all = true;
      for (let i = 0; i < TOTAL_LEVELS; i++) if (!progress.isCompleted(i)) { all = false; break; }
      if (all) tryUnlock('master');
    }
    if (levelIdx === BEAR_IDX) tryUnlock('bear');
    if (levelIdx === THE_TEST_IDX && blocksDestroyed === 0) tryUnlock('aplus');
    if (levelIdx === WAVE_IDX && levelReflections <= 1) tryUnlock('eureka');
  },

  registerLevelCompleteTime(levelIdx, ms) {
    if (levelIdx === LADDER_IDX && ms < LADDER_TIME_MS) tryUnlock('speed');
  },

  reset() {
    _unlocked.clear();
    _reflections = 0; _playTimeMs = 0;
    _failFall = _failSpike = _failSpikeC = _failBlock = _failWall = false;
    _consecFails = 0;
    persist();
  },
};
