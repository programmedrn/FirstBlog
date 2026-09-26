/**
 * Declarative DOM creation and manipulation utilities.
 * All functions are pure or side-effect-isolated.
 */

/**
 * Create a DOM element declaratively.
 * @param {string} tag
 * @param {Object} attrs - className, style (object), on* events, data-*, etc.
 * @param {...(Node|string|number|Array)} children
 * @returns {HTMLElement}
 */
export const el = (tag, attrs = {}, ...children) => {
  const element = document.createElement(tag);

  Object.entries(attrs).forEach(([key, value]) => {
    if (value == null || value === false) return;
    if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key === 'htmlContent') {
      element.innerHTML = value;
    } else {
      element.setAttribute(key, String(value));
    }
  });

  appendChildren(element, children);
  return element;
};

/**
 * Append children (strings, nodes, or arrays) to a parent.
 */
const appendChildren = (parent, children) => {
  children.flat(Infinity).forEach(child => {
    if (child == null || child === false) return;
    if (typeof child === 'string' || typeof child === 'number') {
      parent.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      parent.appendChild(child);
    }
  });
};

/**
 * Clear and render content into a container.
 */
export const render = (container, ...children) => {
  container.innerHTML = '';
  appendChildren(container, children);
};

/**
 * Format seconds to MM:SS string.
 */
export const formatTime = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

/**
 * Create SVG element with namespace.
 */
export const svgEl = (tag, attrs = {}) => {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value != null) element.setAttribute(key, String(value));
  });
  return element;
};
