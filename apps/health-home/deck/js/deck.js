/**
 * Deck of Pain page — card-based random workout generator.
 * Mobile: swipe to draw/undo, scroll for stats.
 * PC: click zones / keyboard to draw/undo.
 */
import { el, render } from '../../shared/js/utils/dom.js';
import { createStore } from '../../shared/js/utils/state.js';

// ── Pure data functions ─────────────────────────────────────

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const SUIT_INFO_DEFAULT = {
  '♠': { exercise: 'Squat', color: 'white' },
  '♥': { exercise: 'Lunge', color: 'red' },
  '♦': { exercise: 'Push-up', color: 'red' },
  '♣': { exercise: 'Row', color: 'white' },
};

const RANK_VALUES = {
  'A': 11, '2': 2, '3': 3, '4': 4, '5': 5,
  '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10,
};

const createCard = (suit, rank, exerciseName) => ({
  suit, rank,
  exercise: exerciseName,
  reps: RANK_VALUES[rank],
  isRed: SUIT_INFO_DEFAULT[suit].color === 'red',
});

const createDeck = (exercises) =>
  SUITS.flatMap(suit => RANKS.map(rank => createCard(suit, rank, exercises[suit])));

const generateRandomSeed = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let r = '';
  for (let i = 0; i < 10; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
  return r;
};

const createRandomGenerator = (seedStr) => {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  let a = (h ^= h >>> 16) >>> 0;
  return () => {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

const shuffleArray = (arr, randomFn = Math.random) => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const calcStats = (drawnCards, exercises) => {
  const stats = {};
  SUITS.forEach(suit => {
    stats[suit] = { exercise: exercises[suit], totalReps: 0, count: 0 };
  });
  drawnCards.forEach(card => {
    stats[card.suit].totalReps += card.reps;
    stats[card.suit].count += 1;
  });
  return stats;
};

// ── State ───────────────────────────────────────────────────

const initialState = () => {
  const exercises = {};
  SUITS.forEach(suit => { exercises[suit] = SUIT_INFO_DEFAULT[suit].exercise; });
  return { deck: [], drawn: [], isFlipping: false, seed: '', exercises, started: false };
};

// ── Page ────────────────────────────────────────────────────

export const deckPage = (() => {
  let store = null;
  let refs = {};
  let touchStartX = 0;
  let touchStartY = 0;

  // ── Lock / Unlock settings ──

  const lockSettings = () => {
    const seedInput = document.getElementById('seed-input');
    if (seedInput) { seedInput.readOnly = true; seedInput.classList.add('is-locked'); }
    if (refs.exercisesWrapper) refs.exercisesWrapper.classList.add('is-collapsed');
    const pasteBtn = document.getElementById('seed-paste-btn');
    if (pasteBtn) pasteBtn.style.display = 'none';
  };

  const unlockSettings = () => {
    const seedInput = document.getElementById('seed-input');
    if (seedInput) { seedInput.readOnly = false; seedInput.classList.remove('is-locked'); }
    if (refs.exercisesWrapper) refs.exercisesWrapper.classList.remove('is-collapsed');
    const pasteBtn = document.getElementById('seed-paste-btn');
    if (pasteBtn) pasteBtn.style.display = '';
    SUITS.forEach(suit => {
      const input = document.getElementById(`ex-input-${suit}`);
      if (input) input.disabled = false;
    });
  };

  // ── Feedback ──

  const showFeedback = (text) => {
    if (!refs.feedbackEl) return;
    refs.feedbackEl.textContent = text;
    refs.feedbackEl.classList.remove('is-visible');
    void refs.feedbackEl.offsetWidth; // force reflow
    refs.feedbackEl.classList.add('is-visible');
  };

  // ── Actions ──

  const drawCard = () => {
    const state = store.getState();
    if (state.isFlipping) return;

    let currentDeck = state.deck;
    let currentSeed = state.seed;
    let currentExercises = state.exercises;

    if (state.drawn.length === 0) {
      const seedInput = document.getElementById('seed-input');
      if (seedInput) {
        currentSeed = seedInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
        if (!currentSeed) currentSeed = generateRandomSeed();
        seedInput.value = currentSeed;
      } else {
        currentSeed = generateRandomSeed();
      }

      const newExercises = {};
      SUITS.forEach(suit => {
        const input = document.getElementById(`ex-input-${suit}`);
        newExercises[suit] = input && input.value.trim() ? input.value.trim() : SUIT_INFO_DEFAULT[suit].exercise;
        if (input) input.disabled = true;
      });
      currentExercises = newExercises;

      const randomFn = createRandomGenerator(currentSeed);
      currentDeck = shuffleArray(createDeck(currentExercises), randomFn);
      lockSettings();
    } else {
      if (currentDeck.length === 0) return;
    }

    store.update(() => ({ isFlipping: true }));

    const newDeck = [...currentDeck];
    const card = newDeck.pop();
    const newDrawn = [...state.drawn, card];

    setTimeout(() => {
      store.update(() => ({
        deck: newDeck, drawn: newDrawn, seed: currentSeed,
        exercises: currentExercises, isFlipping: false, started: true,
      }));
      renderCard();
      renderInfo();
      renderStats();
      showFeedback('다음 카드 →');
    }, 50);
  };

  const undoCard = () => {
    const state = store.getState();
    if (state.drawn.length === 0 || state.isFlipping) return;

    const newDrawn = [...state.drawn];
    const card = newDrawn.pop();
    const newDeck = [...state.deck, card];

    store.update(() => ({ deck: newDeck, drawn: newDrawn }));

    if (newDrawn.length === 0) {
      unlockSettings();
      store.update(() => ({ started: false }));
    }

    renderCard();
    renderInfo();
    renderStats();
    showFeedback('← 이전 카드');
  };

  const copySeed = () => {
    const seedInput = document.getElementById('seed-input');
    if (seedInput && seedInput.value) {
      navigator.clipboard.writeText(seedInput.value).then(() => {
        const btn = document.getElementById('seed-copy-btn');
        if (btn) { const t = btn.textContent; btn.textContent = '✓'; setTimeout(() => { btn.textContent = t; }, 1500); }
      });
    }
  };

  const pasteSeed = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const seedInput = document.getElementById('seed-input');
      if (seedInput && text) seedInput.value = text.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
    } catch (err) { console.error('Paste failed', err); }
  };

  const resetDeck = () => {
    unlockSettings();
    const seedInput = document.getElementById('seed-input');
    if (seedInput) seedInput.value = '';
    SUITS.forEach(suit => {
      const input = document.getElementById(`ex-input-${suit}`);
      if (input) input.value = SUIT_INFO_DEFAULT[suit].exercise;
    });
    store.update(() => initialState());
    renderCard();
    renderInfo();
    renderStats();
  };

  const toggleFullscreen = () => {
    if (refs.pageEl) refs.pageEl.classList.toggle('is-fullscreen');
  };

  // ── Rendering ──

  const renderCard = () => {
    if (!refs.cardContent) return;
    const state = store.getState();
    const lastDrawn = state.drawn[state.drawn.length - 1];

    refs.cardContent.innerHTML = '';

    if (!lastDrawn) {
      refs.cardContent.appendChild(
        el('div', { className: 'deck-card deck-card--empty' },
          el('div', { className: 'deck-card__prompt' },
            el('span', { className: 'deck-card__prompt-icon' }, '👆'),
            el('span', {}, '탭하거나 스와이프하여 카드를 뽑으세요'),
          ),
        )
      );
      return;
    }

    const suitClass = lastDrawn.isRed ? 'deck-card--red' : 'deck-card--white';
    refs.cardContent.appendChild(
      el('div', { className: `deck-card deck-card--drawn ${suitClass} deck-card--flip-in` },
        el('div', { className: 'deck-card__corner deck-card__corner--top' },
          el('span', { className: 'deck-card__rank' }, lastDrawn.rank),
          el('span', { className: 'deck-card__suit' }, lastDrawn.suit),
        ),
        el('div', { className: 'deck-card__center' },
          el('div', { className: 'deck-card__exercise' }, lastDrawn.exercise),
          el('div', { className: 'deck-card__reps' }, `${lastDrawn.reps}`),
          el('div', { className: 'deck-card__reps-label' }, 'reps'),
        ),
        el('div', { className: 'deck-card__corner deck-card__corner--bottom' },
          el('span', { className: 'deck-card__rank' }, lastDrawn.rank),
          el('span', { className: 'deck-card__suit' }, lastDrawn.suit),
        ),
      )
    );
  };

  const renderInfo = () => {
    if (!refs.remainingEl) return;
    const state = store.getState();
    const remaining = !state.started ? 52 : state.deck.length;
    const total = !state.started ? 52 : state.deck.length + state.drawn.length;
    refs.remainingEl.textContent = `${remaining} / ${total}`;
    refs.progressBar.style.width = `${((total - remaining) / total) * 100}%`;
  };

  const renderStats = () => {
    if (!refs.statsEl) return;
    const state = store.getState();
    const stats = calcStats(state.drawn, state.exercises);
    refs.statsEl.innerHTML = '';
    let totalReps = 0;

    SUITS.forEach(suit => {
      const s = stats[suit];
      totalReps += s.totalReps;
      const isRed = SUIT_INFO_DEFAULT[suit].color === 'red';
      refs.statsEl.appendChild(
        el('div', { className: 'stat-row' },
          el('span', { className: `stat-row__suit ${isRed ? 'stat-row__suit--red' : ''}` }, suit),
          el('span', { className: 'stat-row__exercise' }, s.exercise),
          el('span', { className: 'stat-row__reps' }, `${s.totalReps} reps`),
          el('span', { className: 'stat-row__count' }, `(${s.count}장)`),
        )
      );
    });

    refs.statsEl.appendChild(
      el('div', { className: 'stat-row stat-row--total' },
        el('span', { className: 'stat-row__suit' }, '∑'),
        el('span', { className: 'stat-row__exercise' }, 'Total'),
        el('span', { className: 'stat-row__reps' }, `${totalReps} reps`),
        el('span', { className: 'stat-row__count' }, `(${state.drawn.length}장)`),
      )
    );
  };

  // ── Touch / swipe handling ──

  const handleTouchStart = (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) drawCard();
      else undoCard();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (refs.pageEl && refs.pageEl.classList.contains('is-fullscreen')) {
        toggleFullscreen();
        return;
      }
    }
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drawCard(); }
    else if (e.key === 'Backspace') { e.preventDefault(); undoCard(); }
    else if (e.key === 'r' || e.key === 'R') resetDeck();
  };

  // ── Lifecycle ──

  return {
    render(container) {
      store = createStore(initialState());
      refs = {};

      const remainingEl = el('span', { className: 'deck-remaining__count' }, '52 / 52');
      const progressBar = el('div', { className: 'deck-progress__fill' });
      const statsEl = el('div', { className: 'deck-stats' });

      // Card area with left/right zones
      const cardContent = el('div', { className: 'deck-card-content' });
      const cardArea = el('div', { className: 'deck-card-area', id: 'deck-card-area' },
        el('div', { className: 'deck-zone deck-zone--left', onClick: undoCard }, '‹'),
        cardContent,
        el('div', { className: 'deck-zone deck-zone--right', onClick: drawCard }, '›'),
        el('button', {
          className: 'fs-enter-btn',
          onClick: (e) => { e.stopPropagation(); toggleFullscreen(); },
        }, '⤢'),
      );

      // Exercises wrapper
      const exercisesWrapper = el('div', { className: 'deck-exercises-wrapper' },
        el('div', { className: 'deck-exercises-container' },
          ...SUITS.map(suit => {
            const isRed = SUIT_INFO_DEFAULT[suit].color === 'red';
            return el('div', { className: 'deck-exercise-row' },
              el('span', { className: `deck-exercise-suit ${isRed ? 'deck-exercise-suit--red' : ''}` }, suit),
              el('input', {
                className: 'deck-exercise-input',
                id: `ex-input-${suit}`,
                value: SUIT_INFO_DEFAULT[suit].exercise,
                placeholder: '운동 이름',
              })
            );
          })
        )
      );

      refs = { remainingEl, progressBar, cardArea, cardContent, statsEl, exercisesWrapper };
      refs.feedbackEl = null; // will be set after render

      const page = el('div', { className: 'deck-page' },
        el('button', { className: 'fs-exit-btn', onClick: toggleFullscreen }, '✕'),
        el('header', { className: 'page-header' },
          el('a', { className: 'page-header__back', href: '../' }, '←'),
          el('h1', { className: 'page-header__title' }, 'Deck of Pain'),
          el('button', { className: 'btn btn--ghost page-header__action', onClick: resetDeck }, '🔄'),
        ),
        el('div', { className: 'card deck-settings' },
          el('h3', { className: 'card__title' }, '덱 설정'),
          el('div', { className: 'deck-seed-row' },
            el('input', {
              className: 'deck-seed-input',
              placeholder: 'SEED (비워두면 랜덤)',
              maxLength: '10',
              id: 'seed-input',
            }),
            el('button', { className: 'btn btn--outline deck-seed-btn', id: 'seed-paste-btn', onClick: pasteSeed }, '붙여넣기'),
            el('button', { className: 'btn btn--outline deck-seed-btn', id: 'seed-copy-btn', onClick: copySeed }, '복사'),
          ),
          exercisesWrapper,
        ),
        el('div', { className: 'deck-info' },
          el('div', { className: 'deck-remaining' },
            el('span', { className: 'deck-remaining__label' }, 'Cards Remaining'),
            remainingEl,
          ),
          el('div', { className: 'deck-progress' }, progressBar),
        ),
        cardArea,
        el('div', { className: 'deck-feedback', id: 'deck-feedback' }),
        el('div', { className: 'deck-actions' },
          el('button', { className: 'btn btn--outline', onClick: undoCard }, '↩ 되돌리기'),
          el('button', { className: 'btn btn--primary', onClick: drawCard }, '다음 카드 →'),
        ),
        el('div', { className: 'card' },
          el('h3', { className: 'card__title' }, '운동 요약'),
          statsEl,
        ),
      );
      refs.pageEl = page;

      render(container, page);

      refs.feedbackEl = document.getElementById('deck-feedback');

      // Event listeners (swipe on the whole card area, click handled by zones)
      cardArea.addEventListener('touchstart', handleTouchStart, { passive: true });
      cardArea.addEventListener('touchend', handleTouchEnd, { passive: true });
      document.addEventListener('keydown', handleKeyDown);

      renderCard();
      renderInfo();
      renderStats();
    },
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  deckPage.render(document.getElementById('app'));
});
