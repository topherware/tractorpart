// Keep real focus for dialogs and keyboard navigation without rings after taps.
(() => {
  const root = document.documentElement;
  const pointer = () => { root.dataset.inputMode = 'pointer'; };
  pointer();
  document.addEventListener('pointerdown', pointer, true);
  document.addEventListener('mousedown', pointer, true);
  document.addEventListener('touchstart', pointer, {capture:true,passive:true});
  document.addEventListener('keydown', event => {
    if (!['Shift','Control','Alt','Meta'].includes(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
      root.dataset.inputMode = 'keyboard';
    }
  }, true);
})();
