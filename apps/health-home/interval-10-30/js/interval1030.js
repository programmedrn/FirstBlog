/**
 * Interval 10/30 page — fixed 준비 10s / 운동 30s, 10 rounds. One button only.
 * Structure mirrors timer.js (ring + tick marks + boundary-triggered beeps).
 */
import { el, render, svgEl } from '../../shared/js/utils/dom.js';
import { createStore } from '../../shared/js/utils/state.js';
import { playPreBeep, playMainBeep } from '../../shared/js/components/audio.js';
import { requestWakeLock, releaseWakeLock } from '../../shared/js/utils/wakeLock.js';

// ── Fixed program ───────────────────────────────────────────

const ROUNDS = 10;
const PREP_SEC = 10;
const WORK_SEC = 30;
const SET_SEC = PREP_SEC + WORK_SEC;
const TOTAL_SEC = ROUNDS * SET_SEC;

const PHASE_META = {
  prep: { label: '준비', color: 'var(--warning)' },
  work: { label: '운동', color: 'var(--primary)' },
};

// boundary[i] = cumulative seconds where phase i ends. Even index = prep, odd = work.
const BOUNDARIES = (() => {
  const points = [];
  let t = 0;
  for (let i = 0; i < ROUNDS; i++) {
    t += PREP_SEC; points.push(t);
    t += WORK_SEC; points.push(t);
  }
  return points;
})();

const findBoundaryIndex = (elapsedSec) => BOUNDARIES.findIndex(t => t > elapsedSec);

const padSec = (n) => String(Math.max(0, Math.ceil(n))).padStart(2, '0');

// ── State ───────────────────────────────────────────────────

const initialState = () => ({
  isRunning: false,
  isCompleted: false,
  startTimestamp: null,
  frozenElapsedMs: 0,
  lastProcessedSec: -1,
  triggeredMain: [],
  triggeredPre: [],
});

// ── Page ────────────────────────────────────────────────────

export const interval1030Page = (() => {
  let store = null;
  let animFrameId = null;
  let refs = {};

  const getElapsedMs = (state) =>
    state.isRunning ? Date.now() - state.startTimestamp : state.frozenElapsedMs;

  const processBeeps = (currentSec, state) => {
    const newTriggeredMain = [...state.triggeredMain];
    const newTriggeredPre = [...state.triggeredPre];
    let changed = false;

    BOUNDARIES.forEach(tp => {
      for (let i = 3; i >= 1; i--) {
        const preSec = tp - i;
        const preKey = `${tp}:${i}`;
        if (currentSec >= preSec && preSec >= 0 && !state.triggeredPre.includes(preKey)) {
          playPreBeep();
          newTriggeredPre.push(preKey);
          changed = true;
        }
      }
      if (currentSec >= tp && !state.triggeredMain.includes(tp)) {
        playMainBeep();
        newTriggeredMain.push(tp);
        changed = true;
      }
    });

    if (changed) {
      store.update(() => ({
        triggeredMain: newTriggeredMain,
        triggeredPre: newTriggeredPre,
        lastProcessedSec: currentSec,
      }));
    }
  };

  const tick = () => {
    const state = store.getState();
    if (!state.isRunning) return;

    const elapsedMs = getElapsedMs(state);
    const elapsedSec = elapsedMs / 1000;
    const currentSec = Math.floor(elapsedSec);

    if (currentSec > state.lastProcessedSec) {
      processBeeps(currentSec, state);
    }

    updateDisplay(Math.min(elapsedSec, TOTAL_SEC));

    if (elapsedSec >= TOTAL_SEC) {
      setTimeout(() => playMainBeep(), 800);
      doFinish();
      return;
    }

    animFrameId = requestAnimationFrame(tick);
  };

  // ── Actions ──

  const doStart = () => {
    const state = store.getState();
    if (state.isRunning) return;

    store.update(() => ({
      isRunning: true,
      isCompleted: false,
      startTimestamp: Date.now(),
      frozenElapsedMs: 0,
      lastProcessedSec: -1,
      triggeredMain: [],
      triggeredPre: [],
    }));
    animFrameId = requestAnimationFrame(tick);
    requestWakeLock();
  };

  const doFinish = () => {
    cancelAnimationFrame(animFrameId);
    store.update(() => ({
      isRunning: false,
      isCompleted: true,
      frozenElapsedMs: TOTAL_SEC * 1000,
    }));
    updateDisplay(TOTAL_SEC);
    releaseWakeLock();
  };

  // ── Display ──

  const updateDisplay = (elapsedSec) => {
    if (!refs.numberEl) return;
    const state = store.getState();

    const boundaryIndex = findBoundaryIndex(elapsedSec);
    const isIdle = !state.isRunning && !state.isCompleted;
    const isDone = state.isCompleted || boundaryIndex === -1;

    let phaseKey, remaining, setNumber;
    if (isDone) {
      phaseKey = 'work';
      remaining = 0;
      setNumber = ROUNDS;
    } else {
      phaseKey = boundaryIndex % 2 === 0 ? 'prep' : 'work';
      remaining = BOUNDARIES[boundaryIndex] - elapsedSec;
      setNumber = Math.floor(boundaryIndex / 2) + 1;
    }

    const meta = PHASE_META[phaseKey];

    refs.numberEl.textContent = isIdle ? String(PREP_SEC).padStart(2, '0') : padSec(remaining);
    refs.numberEl.style.color = isDone ? 'var(--primary)' : meta.color;

    refs.phaseEl.textContent = isIdle ? '대기' : (isDone ? '완료!' : meta.label);
    refs.phaseEl.style.color = isIdle ? 'var(--text-muted)' : (isDone ? 'var(--primary)' : meta.color);

    refs.setEl.textContent = isIdle ? `SET 1 / ${ROUNDS}` : `SET ${setNumber} / ${ROUNDS}`;

    const mm = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    refs.totalEl.textContent = `${mm(elapsedSec)} / ${mm(TOTAL_SEC)}`;

    const circumference = 2 * Math.PI * 90;
    const progress = Math.min(elapsedSec / TOTAL_SEC, 1);
    refs.progressCircle.setAttribute('stroke-dashoffset', String(circumference * (1 - progress)));
    refs.progressCircle.setAttribute('stroke', isDone ? 'var(--primary)' : meta.color);

    refs.startBtn.disabled = state.isRunning;
    refs.startBtn.textContent = state.isRunning ? '진행 중…' : (state.isCompleted ? '다시 시작' : '시작');
  };

  // ── Fullscreen ──

  const toggleFullscreen = () => {
    if (refs.pageEl) refs.pageEl.classList.toggle('is-fullscreen');
  };

  // ── Ring + tick marks (major = set boundary, minor = phase boundary) ──

  const buildProgressRing = () => {
    const svg = svgEl('svg', { viewBox: '0 0 200 200', class: 'progress-ring' });
    const circumference = 2 * Math.PI * 90;

    const bgCircle = svgEl('circle', {
      cx: '100', cy: '100', r: '90',
      fill: 'none', stroke: 'var(--surface-border)', 'stroke-width': '6',
    });

    const progressCircle = svgEl('circle', {
      cx: '100', cy: '100', r: '90',
      fill: 'none',
      stroke: 'var(--warning)',
      'stroke-width': '6',
      'stroke-dasharray': String(circumference),
      'stroke-dashoffset': String(circumference),
      'stroke-linecap': 'round',
      transform: 'rotate(-90 100 100)',
      class: 'progress-ring__circle',
    });

    svg.appendChild(bgCircle);

    const cx = 100, cy = 100;
    BOUNDARIES.forEach((tp, i) => {
      if (tp === TOTAL_SEC) return;
      const isMajor = i % 2 === 1; // end of a WORK phase = end of a set
      const fraction = tp / TOTAL_SEC;
      const angle = (-Math.PI / 2) + (fraction * 2 * Math.PI);
      const r1 = isMajor ? 82 : 87;
      const r2 = 96;
      const line = svgEl('line', {
        x1: String(cx + r1 * Math.cos(angle)),
        y1: String(cy + r1 * Math.sin(angle)),
        x2: String(cx + r2 * Math.cos(angle)),
        y2: String(cy + r2 * Math.sin(angle)),
        stroke: isMajor ? 'var(--warning)' : 'var(--text-muted)',
        'stroke-width': isMajor ? '2' : '1',
        'stroke-linecap': 'round',
        opacity: isMajor ? '0.7' : '0.35',
      });
      svg.appendChild(line);
    });

    svg.appendChild(progressCircle);
    return { svg, progressCircle };
  };

  return {
    render(container) {
      store = createStore(initialState());
      refs = {};

      const { svg: ringEl, progressCircle } = buildProgressRing();
      refs.progressCircle = progressCircle;

      const numberEl = el('div', { className: 'interval-display__number' }, '10');
      const phaseEl = el('div', { className: 'interval-display__phase' }, '대기');
      const setEl = el('div', { className: 'interval-display__set' }, `SET 1 / ${ROUNDS}`);
      const totalEl = el('div', { className: 'interval-display__total' }, `00:00 / ${String(Math.floor(TOTAL_SEC / 60)).padStart(2, '0')}:${String(TOTAL_SEC % 60).padStart(2, '0')}`);
      refs.numberEl = numberEl;
      refs.phaseEl = phaseEl;
      refs.setEl = setEl;
      refs.totalEl = totalEl;

      const startBtn = el('button', { className: 'btn btn--primary interval-start-btn', onClick: doStart }, '시작');
      refs.startBtn = startBtn;

      const page = el('div', { className: 'interval-page' },
        el('button', { className: 'fs-exit-btn', onClick: toggleFullscreen }, '✕'),
        el('header', { className: 'page-header' },
          el('a', { className: 'page-header__back', href: '../' }, '←'),
          el('h1', { className: 'page-header__title' }, '10 x (10s/30s)'),
        ),
        el('div', { className: 'interval-ring-wrapper' },
          el('div', { className: 'timer-ring-container' },
            ringEl,
            el('div', { className: 'interval-display' },
              phaseEl, numberEl, setEl,
            ),
          ),
          totalEl,
          el('button', { className: 'fs-enter-btn', onClick: toggleFullscreen }, '⤢'),
        ),
        el('div', { className: 'interval-controls' },
          startBtn,
        ),
      );
      refs.pageEl = page;

      render(container, page);
      updateDisplay(0);

      // ESC to exit fullscreen
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && refs.pageEl && refs.pageEl.classList.contains('is-fullscreen')) {
          toggleFullscreen();
        }
      });
    },
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  interval1030Page.render(document.getElementById('app'));
});
