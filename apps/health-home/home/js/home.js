/**
 * Home page — navigation hub with card-style links.
 */
import { el, render } from '../../shared/js/utils/dom.js';

const NAV_CARDS = [
  {
    id: 'timer',
    href: '../timer/',
    icon: '⏱',
    title: 'Timer',
    desc: '인터벌 타이머로 세트 간 휴식을 관리하세요',
    accentClass: 'nav-card--primary',
  },
  {
    id: 'deck',
    href: '../deck/',
    icon: '🃏',
    title: 'Deck of Pain',
    desc: '카드를 뽑아 랜덤 운동을 수행하세요',
    accentClass: 'nav-card--accent',
  },
  {
    id: 'interval1030',
    href: '../interval-10-30/',
    icon: '⏲',
    title: '10 x (10s/30s)',
    desc: '준비 10초, 운동 30초를 10세트 반복하세요',
    accentClass: 'nav-card--warning',
  },
];

const createNavCard = ({ href, icon, title, desc, accentClass }) =>
  el('a', { className: `nav-card ${accentClass}`, href },
    el('div', { className: 'nav-card__icon' }, icon),
    el('div', { className: 'nav-card__content' },
      el('h2', { className: 'nav-card__title' }, title),
      el('p', { className: 'nav-card__desc' }, desc),
    ),
    el('div', { className: 'nav-card__arrow' }, '→'),
  );

export const homePage = {
  render(container) {
    const page = el('div', { className: 'home-page' },
      el('header', { className: 'home-header' },
        el('div', { className: 'home-logo' },
          el('span', { className: 'home-logo__icon' }, '💪'),
          el('h1', { className: 'home-logo__text' }, 'Health Home'),
        ),
        el('p', { className: 'home-subtitle' }, '오늘도 건강한 하루를 시작하세요'),
      ),
      el('nav', { className: 'home-nav' },
        ...NAV_CARDS.map(createNavCard),
      ),
    );
    render(container, page);
  },
};

document.addEventListener('DOMContentLoaded', () => {
  homePage.render(document.getElementById('app'));
});
