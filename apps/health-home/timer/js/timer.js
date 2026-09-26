/**
 * Timer page — interval timer with circular progress.
 * Uses requestAnimationFrame for precision.
 */
import { el, render, formatTime, svgEl } from '../../shared/js/utils/dom.js';
import { createStore } from '../../shared/js/utils/state.js';
import { playPreBeep, playMainBeep } from '../../shared/js/components/audio.js';
import { requestWakeLock, releaseWakeLock } from '../../shared/js/utils/wakeLock.js';

// ── Pure functions ──────────────────────────────────────────

const addTimePoint = (timePoints, newTime) => {
  if (isNaN(newTime) || newTime <= 0) return timePoints;
  const next = [...timePoints, newTime];
  return [...new Set(next)].sort((a, b) => a - b);
};

const removeTimePoint = (timePoints, index) =>
  timePoints.filter((_, i) => i !== index);

const getLastTime = (timePoints) =>
  timePoints.length > 0 ? timePoints[timePoints.length - 1] : 0;

const findNextTimePoint = (timePoints, elapsedSec) =>
  timePoints.find(t => t > elapsedSec) ?? null;

const calcSegmentProgress = (timePoints, elapsedSec) => {
  const total = getLastTime(timePoints);
  if (total <= 0) return 0;
  return Math.min(elapsedSec / total, 1);
};

// ── State ───────────────────────────────────────────────────

const initialState = () => ({
  timePoints: [],
  isRunning: false,
  isPaused: false,
  startTimestamp: null,
  pausedElapsedMs: 0,
  lastProcessedSec: -1,
  triggeredMain: [],
  triggeredPre: [],
});

// ── Page ────────────────────────────────────────────────────

export const timerPage = (() => {
  let store = null;
  let animFrameId = null;
  let refs = {};

  // ── Timer loop ──

  const getElapsedMs = (state) => {
    if (!state.isRunning) return state.pausedElapsedMs;
    if (state.isPaused) return state.pausedElapsedMs;
    return Date.now() - state.startTimestamp;
  };

  const processBeeps = (currentSec, state) => {
    const newTriggeredMain = [...state.triggeredMain];
    const newTriggeredPre = [...state.triggeredPre];
    let changed = false;

    state.timePoints.forEach(tp => {
      // Pre-beeps: tp-3, tp-2, tp-1
      for (let i = 3; i >= 1; i--) {
        const preSec = tp - i;
        const preKey = `${tp}:${i}`;
        if (currentSec >= preSec && preSec >= 0 && !state.triggeredPre.includes(preKey)) {
          playPreBeep();
          newTriggeredPre.push(preKey);
          changed = true;
        }
      }
      // Main beep
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
    if (!state.isRunning || state.isPaused) return;

    const elapsedMs = getElapsedMs(state);
    const elapsedSec = elapsedMs / 1000;
    const currentSec = Math.floor(elapsedSec);

    // Process beeps
    if (currentSec > state.lastProcessedSec) {
      processBeeps(currentSec, state);
    }

    // Update display
    updateDisplay(elapsedSec);

    // Check completion
    const lastTime = getLastTime(state.timePoints);
    if (lastTime > 0 && currentSec >= lastTime + 2) {
      playMainBeep();
      setTimeout(() => playMainBeep(), 800);
      doStop();
      return;
    }

    animFrameId = requestAnimationFrame(tick);
  };

  // ── Actions ──

  const doStart = () => {
    const state = store.getState();
    if (state.timePoints.length === 0) return;

    if (state.isPaused) {
      // Resume
      const now = Date.now();
      store.update(() => ({
        isRunning: true,
        isPaused: false,
        startTimestamp: now - state.pausedElapsedMs,
      }));
    } else {
      // Fresh start
      store.update(() => ({
        isRunning: true,
        isPaused: false,
        startTimestamp: Date.now(),
        pausedElapsedMs: 0,
        lastProcessedSec: -1,
        triggeredMain: [],
        triggeredPre: [],
      }));
    }
    animFrameId = requestAnimationFrame(tick);
    requestWakeLock();
  };

  const doPause = () => {
    const state = store.getState();
    if (!state.isRunning || state.isPaused) return;

    const elapsed = Date.now() - state.startTimestamp;
    cancelAnimationFrame(animFrameId);
    store.update(() => ({
      isPaused: true,
      pausedElapsedMs: elapsed,
    }));
    updateDisplay(elapsed / 1000);
    releaseWakeLock();
  };

  const doStop = () => {
    cancelAnimationFrame(animFrameId);
    store.update(() => ({
      isRunning: false,
      isPaused: false,
      pausedElapsedMs: 0,
      lastProcessedSec: -1,
      triggeredMain: [],
      triggeredPre: [],
    }));
    updateDisplay(0);
    releaseWakeLock();
  };

  const doAddTime = (seconds) => {
    const state = store.getState();
    const updated = addTimePoint(state.timePoints, seconds);
    if (updated.length !== state.timePoints.length) {
      store.update(() => ({ timePoints: updated }));
      renderTimeList();
    }
  };

  const doRemoveTime = (index) => {
    const state = store.getState();
    store.update(() => ({ timePoints: removeTimePoint(state.timePoints, index) }));
    renderTimeList();
  };

  const doPreset = (offsetA, offsetB) => {
    const last = getLastTime(store.getState().timePoints);
    doAddTime(last + offsetA);
    doAddTime(last + offsetB);
  };

  // ── Display updates ──

  const updateDisplay = (elapsedSec) => {
    if (!refs.timeDisplay || !refs.progressCircle) return;

    const state = store.getState();
    const total = getLastTime(state.timePoints);
    const progress = calcSegmentProgress(state.timePoints, elapsedSec);
    const nextTp = findNextTimePoint(state.timePoints, elapsedSec);
    const countdown = nextTp != null ? Math.max(0, nextTp - elapsedSec) : 0;

    // Update time display
    refs.timeDisplay.textContent = formatTime(Math.floor(elapsedSec));
    refs.countdownDisplay.textContent = nextTp != null
      ? `다음: ${formatTime(Math.ceil(countdown))}`
      : (state.isRunning ? '완료!' : '');
    refs.totalDisplay.textContent = total > 0
      ? `${formatTime(Math.floor(elapsedSec))} / ${formatTime(total)}`
      : '';

    // Update progress ring
    const circumference = 2 * Math.PI * 90;
    const offset = circumference * (1 - progress);
    refs.progressCircle.setAttribute('stroke-dashoffset', String(offset));

    // Update button states
    refs.startBtn.disabled = state.isRunning && !state.isPaused;
    refs.pauseBtn.disabled = !state.isRunning || state.isPaused;
    refs.stopBtn.disabled = !state.isRunning;

    // Update time list highlights
    updateTimeListHighlights(elapsedSec);
  };

  const updateTimeListHighlights = (elapsedSec) => {
    if (!refs.timeListEl) return;
    const items = refs.timeListEl.querySelectorAll('.timer-item');
    const state = store.getState();
    items.forEach((item, i) => {
      const tp = state.timePoints[i];
      item.classList.toggle('timer-item--done', elapsedSec >= tp);
      item.classList.toggle('timer-item--next',
        elapsedSec < tp && (i === 0 || elapsedSec >= state.timePoints[i - 1]));
    });
  };

  const renderTimeList = () => {
    if (!refs.timeListEl) return;
    const state = store.getState();
    refs.timeListEl.innerHTML = '';

    if (state.timePoints.length === 0) {
      refs.timeListEl.appendChild(
        el('div', { className: 'timer-empty' }, '시간을 추가하세요')
      );
      renderTickMarks();
      return;
    }

    state.timePoints.forEach((tp, index) => {
      const item = el('div', { className: 'timer-item' },
        el('span', { className: 'timer-item__marker' }),
        el('span', { className: 'timer-item__time' }, formatTime(tp)),
        el('span', { className: 'timer-item__seconds' }, `${tp}s`),
        el('button', {
          className: 'timer-item__delete',
          onClick: () => doRemoveTime(index),
        }, '✕'),
      );
      refs.timeListEl.appendChild(item);
    });
    renderTickMarks();
  };

  // ── Tick marks on ring ──

  const renderTickMarks = () => {
    if (!refs.svgEl) return;
    refs.svgEl.querySelectorAll('.tick-mark').forEach(e => e.remove());

    const state = store.getState();
    const total = getLastTime(state.timePoints);
    if (total <= 0) return;

    const cx = 100, cy = 100, r1 = 85, r2 = 95;

    state.timePoints.forEach(tp => {
      const fraction = tp / total;
      const angle = (-Math.PI / 2) + (fraction * 2 * Math.PI);
      const line = svgEl('line', {
        x1: String(cx + r1 * Math.cos(angle)),
        y1: String(cy + r1 * Math.sin(angle)),
        x2: String(cx + r2 * Math.cos(angle)),
        y2: String(cy + r2 * Math.sin(angle)),
        stroke: 'var(--warning)',
        'stroke-width': '1.5',
        'stroke-linecap': 'round',
        class: 'tick-mark',
        opacity: '0.5',
      });
      refs.svgEl.appendChild(line);
    });
  };

  // ── Fullscreen ──

  const toggleFullscreen = () => {
    if (refs.pageEl) refs.pageEl.classList.toggle('is-fullscreen');
  };

  // ── Lifecycle ──

  const buildProgressRing = () => {
    const svg = svgEl('svg', { viewBox: '0 0 200 200', class: 'progress-ring' });
    const circumference = 2 * Math.PI * 90;

    const bgCircle = svgEl('circle', {
      cx: '100', cy: '100', r: '90',
      fill: 'none',
      stroke: 'var(--surface-border)',
      'stroke-width': '6',
    });

    const progressCircle = svgEl('circle', {
      cx: '100', cy: '100', r: '90',
      fill: 'none',
      stroke: 'url(#progressGradient)',
      'stroke-width': '6',
      'stroke-dasharray': String(circumference),
      'stroke-dashoffset': String(circumference),
      'stroke-linecap': 'round',
      transform: 'rotate(-90 100 100)',
      class: 'progress-ring__circle',
    });

    const defs = svgEl('defs');
    const gradient = svgEl('linearGradient', { id: 'progressGradient', x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
    const stop1 = svgEl('stop', { offset: '0%', 'stop-color': 'var(--primary)' });
    const stop2 = svgEl('stop', { offset: '100%', 'stop-color': 'var(--accent)' });
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);

    svg.appendChild(defs);
    svg.appendChild(bgCircle);
    svg.appendChild(progressCircle);

    return { svg, progressCircle };
  };

  return {
    render(container) {
      store = createStore(initialState());
      refs = {};

      const { svg: ringEl, progressCircle } = buildProgressRing();
      refs.progressCircle = progressCircle;
      refs.svgEl = ringEl;

      // Time display inside ring
      const timeDisplay = el('div', { className: 'timer-display__time' }, '00:00');
      const countdownDisplay = el('div', { className: 'timer-display__countdown' });
      const totalDisplay = el('div', { className: 'timer-display__total' });
      refs.timeDisplay = timeDisplay;
      refs.countdownDisplay = countdownDisplay;
      refs.totalDisplay = totalDisplay;

      // Controls
      const startBtn = el('button', { className: 'btn btn--primary', onClick: doStart }, '▶ 시작');
      const pauseBtn = el('button', { className: 'btn btn--accent', onClick: doPause, disabled: true }, '⏸ 일시정지');
      const stopBtn = el('button', { className: 'btn btn--danger', onClick: doStop, disabled: true }, '⏹ 정지');
      refs.startBtn = startBtn;
      refs.pauseBtn = pauseBtn;
      refs.stopBtn = stopBtn;

      // Input
      const timeInput = el('input', {
        type: 'number',
        className: 'timer-input__field',
        placeholder: '초 입력',
        min: '1',
      });

      timeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          doAddTime(parseFloat(timeInput.value));
          timeInput.value = '';
        }
      });

      const addBtn = el('button', {
        className: 'btn btn--outline',
        onClick: () => {
          doAddTime(parseFloat(timeInput.value));
          timeInput.value = '';
        },
      }, '추가');

      const addRelativeBtn = el('button', {
        className: 'btn btn--outline',
        onClick: () => {
          const val = parseFloat(timeInput.value);
          if (!isNaN(val) && val > 0) {
            const state = store.getState();
            const last = state.timePoints.length > 0 ? state.timePoints[state.timePoints.length - 1] : 0;
            doAddTime(last + val);
            timeInput.value = '';
          }
        },
      }, '더하기');

      // Time list
      const timeListEl = el('div', { className: 'timer-list' });
      refs.timeListEl = timeListEl;

      const page = el('div', { className: 'timer-page' },
        el('button', { className: 'fs-exit-btn', onClick: toggleFullscreen }, '✕'),
        el('header', { className: 'page-header' },
          el('a', { className: 'page-header__back', href: '../' }, '←'),
          el('h1', { className: 'page-header__title' }, 'Timer'),
        ),
        el('div', { className: 'timer-ring-wrapper' },
          el('div', { className: 'timer-ring-container' },
            ringEl,
            el('div', { className: 'timer-display' },
              timeDisplay,
              countdownDisplay,
            ),
          ),
          totalDisplay,
          el('button', { className: 'fs-enter-btn', onClick: toggleFullscreen }, '⤢'),
        ),
        el('div', { className: 'timer-controls' },
          startBtn, pauseBtn, stopBtn,
        ),
        el('div', { className: 'timer-input card' },
          el('div', { className: 'timer-input__row' },
            timeInput, addBtn, addRelativeBtn
          ),
          el('div', { className: 'timer-input__presets' },
            el('button', { className: 'btn btn--ghost', onClick: () => doPreset(10, 30) }, '+10 / 30'),
            el('button', { className: 'btn btn--ghost', onClick: () => doPreset(20, 40) }, '+20 / 40'),
            el('button', { className: 'btn btn--ghost', onClick: () => doPreset(30, 60) }, '+30 / 60'),
            el('button', { className: 'btn btn--ghost', onClick: () => doPreset(180, 30) }, '+180 / 30'),
          ),
        ),
        el('div', { className: 'card' },
          el('h3', { className: 'card__title' }, '예정 시간'),
          timeListEl,
        ),
      );
      refs.pageEl = page;

      render(container, page);
      renderTimeList();

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
  timerPage.render(document.getElementById('app'));
});
