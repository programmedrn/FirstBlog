/**
 * Minimal immutable state store with pub/sub.
 * Inspired by functional reactive patterns.
 */

/**
 * Create a reactive store.
 * @param {Object} initialState
 * @returns {{ getState, update, subscribe }}
 */
export const createStore = (initialState) => {
  let state = { ...initialState };
  const listeners = new Set();

  const getState = () => state;

  /**
   * Update state via an updater function (pure).
   * @param {Function} updater - (prevState) => partialState
   */
  const update = (updater) => {
    const partial = typeof updater === 'function'
      ? updater(state)
      : updater;
    state = { ...state, ...partial };
    listeners.forEach(fn => fn(state));
  };

  /**
   * Subscribe to state changes.
   * @param {Function} fn - (newState) => void
   * @returns {Function} unsubscribe
   */
  const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  return { getState, update, subscribe };
};
