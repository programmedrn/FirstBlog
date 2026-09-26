/**
 * Audio playback utilities — isolated side effects.
 */

const getAudioElement = (id) => document.getElementById(id);

export const playPreBeep = () => {
  const audio = getAudioElement('beep-pre');
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
};

export const playMainBeep = () => {
  const audio = getAudioElement('beep-main');
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
};
